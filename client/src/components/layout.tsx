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
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ClientForm from "./client-form";

interface LayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/clients", label: "Clients", icon: Users },
  { path: "/properties", label: "Properties", icon: Building },
  { path: "/applications", label: "Applications", icon: FileText },
  { path: "/housing-support", label: "Housing Support", icon: Calculator },
  { path: "/financials", label: "Financials", icon: DollarSign },
  { path: "/pool-fund", label: "Pool Fund", icon: PiggyBank },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [showClientForm, setShowClientForm] = useState(false);

  const getPageTitle = () => {
    const item = navigationItems.find(item => item.path === location);
    return item ? item.label : "Page Not Found";
  };

  const getPageDescription = () => {
    const descriptions: Record<string, string> = {
      "/": "Housing Program Management Overview",
      "/clients": "Manage client information and KYC data",
      "/properties": "Track available properties and landlord details",
      "/applications": "Monitor county application status",
      "/financials": "View financial transactions and payments",
      "/housing-support": "Automated Housing Support pooled fund tracking",
      "/pool-fund": "Manage surplus funds for client supplies",
      "/reports": "Generate reports and analytics",
    };
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
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
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
              <p className="text-sm font-medium text-slate-900 truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">System Administrator</p>
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
              <Button 
                onClick={() => setShowClientForm(true)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </Button>
              <div className="relative">
                <Bell className="text-slate-400 w-5 h-5 cursor-pointer hover:text-slate-600 transition-colors" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"></span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>

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
    </div>
  );
}
