import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Layout from "@/components/layout";
import ProtectedRoute from "@/components/protected-route";
import MobileRedirect from "@/components/mobile-redirect";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetails from "@/pages/client-details";
import TestClientDetails from "@/pages/test-client-details";
import Properties from "@/pages/properties";
import Applications from "@/pages/applications";
import Financials from "@/pages/financials";
import PoolFund from "@/pages/pool-fund";
import Reports from "@/pages/reports";
import HousingSupport from "@/pages/housing-support";
import Vendors from "@/pages/vendors";
import OtherSubsidies from "@/pages/other-subsidies";
import UserManagement from "@/pages/user-management";
import Mobile from "@/pages/mobile";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { PERMISSIONS } from "@shared/schema";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/mobile" component={Mobile} />
      <Route path="/" nest>
        <Layout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/" component={Dashboard} />
            <Route path="/clients/:clientId" component={TestClientDetails} />
            <Route path="/clients" component={Clients} />
            <Route path="/properties" component={Properties} />
            <Route path="/applications" component={Applications} />
            <Route path="/financials" component={Financials} />
            <Route path="/pool-fund" component={PoolFund} />
            <Route path="/housing-support" component={HousingSupport} />
            <Route path="/vendors" component={Vendors} />
            <Route path="/other-subsidies" component={OtherSubsidies} />
            <Route path="/user-management">
              <ProtectedRoute permission={PERMISSIONS.MANAGE_USERS}>
                <UserManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/reports" component={Reports} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, loading } = useAuth();

  // Simple mobile detection
  const isMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const touchDevice = 'ontouchstart' in window;
    const smallScreen = window.innerWidth <= 768;
    
    return mobileRegex.test(userAgent) || (touchDevice && smallScreen);
  };

  // Redirect mobile users to mobile interface
  useEffect(() => {
    if (isAuthenticated && isMobile() && !window.location.pathname.includes('/mobile')) {
      window.location.href = '/mobile';
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
