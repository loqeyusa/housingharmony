import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureDatabaseInitialized } from "./db-init";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      companyId: number | null;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      isEnabled: boolean;
      isSuperAdmin: boolean;
    };
  }
}

const app = express();

// CORS configuration for deployed site access
app.use((req, res, next) => {
  // Allow requests from deployed Replit sites and development
  const allowedOrigins = [
    'https://*.replit.app',
    'https://*.replit.dev',
    'https://*.replitapp.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ];
  
  const origin = req.headers.origin;
  
  // Allow requests with no origin (e.g., mobile apps, Postman)
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Fix mobile redirect issue by ensuring proper headers for mobile browsers
app.use((req, res, next) => {
  // Add headers to prevent mobile redirects to Replit IDE
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Force serving the app for mobile user agents
  const userAgent = req.get('User-Agent') || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  if (isMobile) {
    // Add specific headers for mobile to ensure proper rendering
    res.setHeader('Viewport', 'width=device-width, initial-scale=1.0');
    res.setHeader('X-UA-Compatible', 'IE=edge');
  }
  
  next();
});

// Increase body parser limits for image uploads (base64 images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database with default admin user if needed
  // Run initialization in production OR if we detect this is a deployed environment
  const isDeployed = process.env.REPLIT_DEPLOYMENT === "1" || 
                    process.env.NODE_ENV === "production" || 
                    process.env.REPLIT_ENVIRONMENT === "production" ||
                    process.env.DATABASE_URL?.includes("neon.tech");
  
  console.log("🔍 Environment check:");
  console.log("  NODE_ENV:", process.env.NODE_ENV);
  console.log("  REPLIT_DEPLOYMENT:", process.env.REPLIT_DEPLOYMENT);
  console.log("  DATABASE_URL contains neon.tech:", process.env.DATABASE_URL?.includes("neon.tech"));
  console.log("  Is deployed:", isDeployed);
  
  if (isDeployed) {
    console.log("🚀 Detected deployed environment, initializing database...");
    await ensureDatabaseInitialized();
  } else {
    console.log("🏠 Running in development mode, skipping database initialization");
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
