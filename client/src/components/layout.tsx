import { Link, useLocation } from "wouter";
import { 
  Home, 
  Users, 
  Building, 
  FileText, 
  DollarSign, 
  PiggyBank, 
  BarChart3,
  Calculator,
  Bell,
  Plus,
  User,
  Bot,
  MessageCircle,
  Building2,
  Shield,
  LogOut,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@shared/schema";
import ClientForm from "./client-form";
import AIAssistant from "./ai-assistant";

interface LayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/clients", label: "Clients", icon: Users },
  { path: "/counties", label: "Counties", icon: MapPin },
  { path: "/companies", label: "Companies", icon: Building2 },
  { path: "/properties", label: "Properties", icon: Building },
  { path: "/applications", label: "Applications", icon: FileText },
  { path: "/housing-support", label: "Housing Support", icon: Calculator },
  { path: "/vendors", label: "Vendors", icon: Building2 },
  { path: "/other-subsidies", label: "Other Subsidies", icon: FileText },
  { path: "/financials", label: "Financials", icon: DollarSign },
  { path: "/pool-fund", label: "Pool Fund", icon: PiggyBank },
  { path: "/user-management", label: "User Management", icon: Shield },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [showClientForm, setShowClientForm] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { user, logout } = useAuth();
  const { getAccessiblePages, hasPermission } = usePermissions();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter navigation items based on user permissions
  const accessiblePages = getAccessiblePages();
  const filteredNavigationItems = navigationItems.filter(item =>
    accessiblePages.some(page => page.path === item.path)
  );

  const getPageTitle = () => {
    // Handle root path and dashboard path
    if (location === "/" || location === "/dashboard") {
      return "Dashboard";
    }
    
    // Handle dynamic routes
    if (location.startsWith("/clients/") && location !== "/clients") {
      return "Client Details";
    }
    if (location.startsWith("/county/")) {
      return "County Details";
    }
    
    const item = navigationItems.find(item => item.path === location);
    return item ? item.label : "Page Not Found";
  };

  const getPageDescription = () => {
    const descriptions: Record<string, string> = {
      "/": "Housing Program Management Overview",
      "/dashboard": "Housing Program Management Overview",
      "/clients": "Manage client information and KYC data",
      "/counties": "View clients organized by county",
      "/companies": "Manage housing companies and multi-tenant organizations",
      "/properties": "Track available properties and landlord details",
      "/applications": "Monitor county application status",
      "/financials": "View financial transactions and payments",
      "/housing-support": "Automated Housing Support pooled fund tracking",
      "/vendors": "Manage housing support service providers",
      "/other-subsidies": "Track non-HS/GRH subsidies and vendor payments",
      "/pool-fund": "Manage surplus funds for client supplies",
      "/user-management": "Manage users, roles, and system permissions",
      "/reports": "Generate reports and analytics",
    };
    
    // Handle dynamic routes
    if (location.startsWith("/clients/") && location !== "/clients") {
      return "View and manage detailed client information";
    }
    if (location.startsWith("/county/")) {
      return "View clients and statistics for this county";
    }
    
    return descriptions[location] || "Page not found";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm border-r border-slate-200 fixed h-full overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Home className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Housing Pro</h1>
              <p className="text-xs text-slate-500">Management System</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {filteredNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}>
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
              <User className="text-slate-600 w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.isSuperAdmin ? 'Super Admin' : 'Staff'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 bg-slate-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{getPageTitle()}</h1>
              <p className="text-slate-600 mt-1">{getPageDescription()}</p>
            </div>
            <div className="flex items-center space-x-4">
              {hasPermission(PERMISSIONS.CREATE_CLIENTS) && (
                <Button 
                  onClick={() => setShowClientForm(true)}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Client
                </Button>
              )}
              <div className="relative">
                <Bell className="text-slate-400 w-5 h-5 cursor-pointer hover:text-slate-600 transition-colors" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"></span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-slate-500">{user?.isSuperAdmin ? 'Super Admin' : 'User'}</p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-slate-600 hover:text-red-600 hover:border-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Floating AI Assistant Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setShowAIAssistant(true)}
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
          size="sm"
        >
          <Bot className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientForm 
          onClose={() => setShowClientForm(false)}
          onSuccess={() => {
            setShowClientForm(false);
            // Refresh data if needed
          }}
        />
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <AIAssistant 
          onClose={() => setShowAIAssistant(false)}
        />
      )}
    </div>
  );
}
