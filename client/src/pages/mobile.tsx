import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Home, 
  Users, 
  Building, 
  FileText, 
  PiggyBank,
  Plus,
  Search,
  Bell,
  Menu,
  ArrowRight,
  DollarSign,
  MapPin,
  Calendar,
  Phone,
  Bot,
  BarChart3,
  X,
  Wifi,
  WifiOff,
  Download,
  Share,
  Smartphone,
  Camera
} from "lucide-react";
import ClientForm from "@/components/client-form";
import PropertyForm from "@/components/property-form";
import ApplicationForm from "@/components/application-form";
import PoolFundForm from "@/components/pool-fund-form";
import AIAssistant from "@/components/ai-assistant";
import { DocumentCapture } from "@/components/DocumentCapture";
import { PaymentProcessingModal } from "@/components/PaymentProcessingModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Property, Application, Transaction } from "@shared/schema";

type TabType = 'dashboard' | 'clients' | 'properties' | 'applications' | 'pool-fund' | 'reports' | 'capture';

export default function Mobile() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showPoolFundForm, setShowPoolFundForm] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDocumentCapture, setShowDocumentCapture] = useState(false);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [documentAnalysisResult, setDocumentAnalysisResult] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { toast } = useToast();
  
  // PWA State Management
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // PWA Effects
  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsPWA(isStandalone);

    // Online/Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // PWA installed listener
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsPWA(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // PWA Install function
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // Share API function
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Housing Manager',
          text: 'Comprehensive housing program management system',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Document capture handlers
  const handleDocumentCaptured = async (imageData: string) => {
    setIsProcessingDocument(true);
    try {
      const response = await apiRequest('POST', '/api/payment-documents/analyze', {
        imageData
      });
      
      console.log('Document Analysis Response:', JSON.stringify(response, null, 2));
      
      setDocumentAnalysisResult(response);
      setShowDocumentCapture(false);
      setShowPaymentModal(true);
      setActiveTab('dashboard'); // Navigate back to dashboard
      
      toast({
        title: "Document Analyzed",
        description: `Found ${response?.matchResults?.length || 0} client matches for processing.`,
      });
    } catch (error) {
      console.error('Document analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the payment document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const handleProcessPayments = async (selectedClients: any[]) => {
    try {
      const response = await apiRequest('POST', '/api/payment-documents/process-payments', {
        documentId: documentAnalysisResult.documentId,
        selectedClients
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      setShowPaymentModal(false);
      setDocumentAnalysisResult(null);
      
      toast({
        title: "Payments Processed",
        description: `Successfully processed ${response?.processedCount || selectedClients.length} payment transactions.`,
      });
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Processing Failed",
        description: "Could not process payments. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { data: stats } = useQuery<{
    totalClients: number;
    activeProperties: number;
    pendingApplications: number;
    poolFundBalance: number;
    totalVendors: number;
    activeOtherSubsidies: number;
    totalOtherSubsidyAmount: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: poolFundBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/pool-fund/balance"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const recentClients = clients.slice(0, 3);
  const pendingApplications = applications.filter(app => app.status === "pending").slice(0, 3);
  const recentTransactions = transactions.slice(0, 3);

  // Function to get clients for a specific property
  const getClientsForProperty = (propertyId: number) => {
    const propertyApplications = applications.filter(app => 
      app.propertyId === propertyId && app.status === 'approved'
    );
    return propertyApplications.map(app => {
      const client = clients.find(c => c.id === app.clientId);
      return client ? { ...client, application: app } : null;
    }).filter(Boolean);
  };

  // PWA Status Header Component
  const PWAHeader = () => (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-slate-700" />
            <span className="font-semibold text-slate-900">Housing Manager</span>
          </div>
          {isPWA && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              PWA
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Network Status */}
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
          </div>
          
          {/* PWA Install Button */}
          {isInstallable && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleInstallPWA}
              className="h-8 px-2 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Install
            </Button>
          )}
          
          {/* Share Button */}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleShare}
            className="h-8 px-2"
          >
            <Share className="w-4 h-4" />
          </Button>
          
          {/* AI Assistant Button */}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setShowAIAssistant(true)}
            className="h-8 px-2"
          >
            <Bot className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Offline Status Alert */}
      {!isOnline && (
        <Alert className="mt-2 bg-orange-50 border-orange-200">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700 text-sm">
            You're currently offline. Some features may be limited.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const DashboardTab = () => (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{stats?.totalClients || 0}</p>
                <p className="text-xs text-slate-600">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{stats?.activeProperties || 0}</p>
                <p className="text-xs text-slate-600">Properties</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{stats?.pendingApplications || 0}</p>
                <p className="text-xs text-slate-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">${(poolFundBalance?.balance || 0).toFixed(0)}</p>
                <p className="text-xs text-slate-600">Pool Fund</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto p-3"
            onClick={() => setShowClientForm(true)}
          >
            <Users className="w-4 h-4 mr-3" />
            <div className="text-left">
              <p className="font-medium text-sm">Add Client</p>
              <p className="text-xs text-slate-600">Register new client</p>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start h-auto p-3"
            onClick={() => setShowApplicationForm(true)}
          >
            <FileText className="w-4 h-4 mr-3" />
            <div className="text-left">
              <p className="font-medium text-sm">Submit Application</p>
              <p className="text-xs text-slate-600">County application</p>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-semibold">${parseFloat(transaction.amount.toString()).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const ClientsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Clients</h2>
        <Button size="sm" onClick={() => setShowClientForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No clients yet</p>
            <Button className="mt-3" onClick={() => setShowClientForm(true)}>
              Add First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.slice(0, 10).map((client) => (
            <Card key={client.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{client.firstName} {client.lastName}</p>
                      <p className="text-xs text-slate-600">{client.email}</p>
                      <p className="text-xs text-slate-500">{client.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {client.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const PropertiesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Properties</h2>
        <Button size="sm" onClick={() => setShowPropertyForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No properties yet</p>
            <Button className="mt-3" onClick={() => setShowPropertyForm(true)}>
              Add First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.slice(0, 10).map((property) => {
            const propertyClients = getClientsForProperty(property.id);
            return (
              <Card 
                key={property.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedProperty(property)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <p className="font-medium text-sm">{property.address}</p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${
                        property.status === 'available' ? 'bg-green-100 text-green-800' :
                        property.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {property.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-600">{property.bedrooms}BR • {property.bathrooms}BA • {property.squareFootage}sqft</p>
                      <p className="font-semibold text-sm">${parseFloat(property.rentAmount.toString()).toFixed(0)}/mo</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-700 font-medium">{property.landlordName}</p>
                          <p className="text-xs text-slate-500">{property.landlordPhone}</p>
                        </div>
                        <p className="text-xs text-slate-600">Deposit: ${parseFloat(property.depositAmount.toString()).toFixed(0)}</p>
                      </div>
                    </div>
                    {propertyClients.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-600">
                            {propertyClients.length} tenant{propertyClients.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">Tap to view details</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const ApplicationsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Applications</h2>
        <Button size="sm" onClick={() => setShowApplicationForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No applications yet</p>
            <Button className="mt-3" onClick={() => setShowApplicationForm(true)}>
              Submit First Application
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.slice(0, 10).map((application) => {
            const client = clients.find(c => c.id === application.clientId);
            return (
              <Card key={application.id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Application #{application.id}</p>
                      <Badge className={`text-xs ${
                        application.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        application.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {application.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      {client ? `${client.firstName} ${client.lastName}` : 'Unknown Client'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Submitted:</p>
                        <p className="font-medium">{new Date(application.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Rent Paid:</p>
                        <p className="font-medium">${parseFloat(application.rentPaid.toString()).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">County Reimbursement:</p>
                        <p className="font-medium">${parseFloat((application.countyReimbursement || 0).toString()).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Deposit:</p>
                        <p className="font-medium">${parseFloat(application.depositPaid.toString()).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const PoolFundTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Pool Fund</h2>
        <Button size="sm" onClick={() => setShowPoolFundForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Transaction
        </Button>
      </div>

      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="p-4 text-center">
          <PiggyBank className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-emerald-800">
            ${(poolFundBalance?.balance || 0).toFixed(2)}
          </p>
          <p className="text-sm text-emerald-700">Available Balance</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Recent Transactions</h3>
            <div className="space-y-2">
              {transactions.filter(t => t.type === 'pool_fund').slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div>
                    <p className="text-xs font-medium">{transaction.description}</p>
                    <p className="text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className={`text-xs font-medium ${
                    parseFloat(transaction.amount.toString()) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(transaction.amount.toString()) > 0 ? '+' : ''}${parseFloat(transaction.amount.toString()).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Guidelines</h3>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Surplus funds from county reimbursements</li>
              <li>• Used for client supplies and necessities</li>
              <li>• All withdrawals must be documented</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ReportsTab = () => {
    // Enhanced statistics calculations
    const reportStats = {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      totalProperties: properties.length,
      availableProperties: properties.filter(p => p.status === 'available').length,
      occupiedProperties: properties.filter(p => p.status === 'occupied').length,
      totalApplications: applications.length,
      pendingApplications: applications.filter(a => a.status === 'pending').length,
      approvedApplications: applications.filter(a => a.status === 'approved').length,
      rejectedApplications: applications.filter(a => a.status === 'rejected').length,
      totalRevenue: transactions
        .filter(t => t.type === 'county_reimbursement')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      totalExpenses: transactions
        .filter(t => ['rent_payment', 'deposit_payment', 'application_fee', 'pool_fund_withdrawal'].includes(t.type))
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      poolFundBalance: poolFundBalance?.balance || 0,
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Reports</h2>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{reportStats.totalClients}</p>
              <p className="text-xs text-slate-600">Total Clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Building className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{reportStats.totalProperties}</p>
              <p className="text-xs text-slate-600">Properties</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <FileText className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">{reportStats.pendingApplications}</p>
              <p className="text-xs text-slate-600">Pending Apps</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <PiggyBank className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900">${reportStats.poolFundBalance.toFixed(0)}</p>
              <p className="text-xs text-slate-600">Pool Fund</p>
            </CardContent>
          </Card>
        </div>

        {/* Client Management Report */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-medium text-sm">Client Management</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Active Clients</span>
                <span className="text-xs font-medium">{reportStats.activeClients}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Inactive Clients</span>
                <span className="text-xs font-medium">{reportStats.totalClients - reportStats.activeClients}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Active Rate</span>
                <span className="text-xs font-medium">
                  {reportStats.totalClients > 0 ? ((reportStats.activeClients / reportStats.totalClients) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Portfolio Report */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <Building className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="font-medium text-sm">Property Portfolio</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Available Properties</span>
                <span className="text-xs font-medium">{reportStats.availableProperties}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Occupied Properties</span>
                <span className="text-xs font-medium">{reportStats.occupiedProperties}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Occupancy Rate</span>
                <span className="text-xs font-medium">
                  {reportStats.totalProperties > 0 ? ((reportStats.occupiedProperties / reportStats.totalProperties) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Average Rent</span>
                <span className="text-xs font-medium">
                  ${properties.length > 0 ? (properties.reduce((sum, p) => sum + parseFloat(p.rentAmount.toString()), 0) / properties.length).toFixed(0) : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Status Report */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <FileText className="w-5 h-5 text-orange-600 mr-2" />
              <h3 className="font-medium text-sm">Application Status</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Approved Applications</span>
                <span className="text-xs font-medium">{reportStats.approvedApplications}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Rejected Applications</span>
                <span className="text-xs font-medium">{reportStats.rejectedApplications}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Approval Rate</span>
                <span className="text-xs font-medium">
                  {reportStats.totalApplications > 0 ? ((reportStats.approvedApplications / reportStats.totalApplications) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Report */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <DollarSign className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="font-medium text-sm">Financial Summary</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Total Revenue</span>
                <span className="text-xs font-medium">${reportStats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Total Expenses</span>
                <span className="text-xs font-medium">${reportStats.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Net Cash Flow</span>
                <span className="text-xs font-medium">${(reportStats.totalRevenue - reportStats.totalExpenses).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Avg Application Amount</span>
                <span className="text-xs font-medium">
                  ${reportStats.totalApplications > 0 ? (reportStats.totalRevenue / reportStats.totalApplications).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Fund Activity Report */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <PiggyBank className="w-5 h-5 text-emerald-600 mr-2" />
              <h3 className="font-medium text-sm">Pool Fund Activity</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Current Balance</span>
                <span className="text-xs font-medium">${reportStats.poolFundBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Pool Fund Transactions</span>
                <span className="text-xs font-medium">{transactions.filter(t => t.type === 'pool_fund').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Recent Activity</span>
                <span className="text-xs font-medium">
                  {transactions.filter(t => t.type === 'pool_fund').slice(0, 1).length > 0 ? 'Active' : 'None'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const CaptureTab = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Payment Document Capture</h2>
        <p className="text-sm text-slate-600 mb-6">Capture county payment documents to automatically process payments for multiple clients.</p>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <Camera className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Ready to Capture</h3>
          <p className="text-sm text-slate-600 mb-4">
            Use your device camera to capture payment documents like Minnesota DHS checks or county payment advices.
          </p>
          <Button 
            onClick={() => setShowDocumentCapture(true)}
            className="w-full"
            disabled={isProcessingDocument}
          >
            {isProcessingDocument ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Start Capture
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-600 space-y-2">
          <div className="flex items-start space-x-2">
            <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">1</span>
            <p>Take a photo of the county payment document</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">2</span>
            <p>AI analyzes the document and identifies clients</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">3</span>
            <p>Review and confirm payment details</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">4</span>
            <p>Payments are automatically processed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'clients':
        return <ClientsTab />;
      case 'properties':
        return <PropertiesTab />;
      case 'applications':
        return <ApplicationsTab />;
      case 'pool-fund':
        return <PoolFundTab />;
      case 'reports':
        return <ReportsTab />;
      case 'capture':
        return <CaptureTab />;
      default:
        return <DashboardTab />;
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'properties', label: 'Properties', icon: Building },
    { id: 'capture', label: 'CAP', icon: Camera },
    { id: 'pool-fund', label: 'Fund', icon: PiggyBank },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* PWA Header */}
      <PWAHeader />

      {/* Content */}
      <div className="p-4">
        {renderActiveTab()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2">
        <div className="flex justify-around">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showClientForm && (
        <ClientForm onClose={() => setShowClientForm(false)} />
      )}
      {showPropertyForm && (
        <PropertyForm onClose={() => setShowPropertyForm(false)} />
      )}
      {showApplicationForm && (
        <ApplicationForm onClose={() => setShowApplicationForm(false)} />
      )}
      {showPoolFundForm && (
        <PoolFundForm onClose={() => setShowPoolFundForm(false)} />
      )}

      {/* Document Capture Modal */}
      {showDocumentCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Payment Document Capture</h2>
            <DocumentCapture 
              onDocumentCaptured={handleDocumentCaptured}
              isProcessing={isProcessingDocument}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowDocumentCapture(false)}
                disabled={isProcessingDocument}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {showPaymentModal && documentAnalysisResult && (
        <PaymentProcessingModal 
          analysisResult={documentAnalysisResult}
          onClose={() => {
            setShowPaymentModal(false);
            setDocumentAnalysisResult(null);
          }}
          onProcessPayments={handleProcessPayments}
        />
      )}

      {/* Floating AI Assistant Button */}
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setShowAIAssistant(true)}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
          size="sm"
        >
          <Bot className="w-5 h-5 text-white" />
        </Button>
      </div>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{selectedProperty.address}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProperty(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Badge className={`w-fit text-xs ${
                selectedProperty.status === 'available' ? 'bg-green-100 text-green-800' :
                selectedProperty.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {selectedProperty.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Property Details */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Bedrooms</p>
                    <p className="font-medium">{selectedProperty.bedrooms}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Bathrooms</p>
                    <p className="font-medium">{selectedProperty.bathrooms}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Square Feet</p>
                    <p className="font-medium">{selectedProperty.squareFootage}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Monthly Rent</p>
                    <p className="font-medium">${parseFloat(selectedProperty.rentAmount.toString()).toFixed(0)}</p>
                  </div>
                </div>
              </div>

              {/* Landlord Info */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Landlord Information</h3>
                <div className="text-sm">
                  <p className="font-medium">{selectedProperty.landlordName}</p>
                  <p className="text-slate-600">{selectedProperty.landlordPhone}</p>
                  <p className="text-slate-600">{selectedProperty.landlordEmail}</p>
                </div>
              </div>

              {/* Current Tenants */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Current Tenants</h3>
                {(() => {
                  const propertyClients = getClientsForProperty(selectedProperty.id);
                  return propertyClients.length > 0 ? (
                    <div className="space-y-2">
                      {propertyClients.map((clientData: any) => (
                        <div key={clientData.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-medium text-xs">
                                {clientData.firstName.charAt(0)}{clientData.lastName.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{clientData.firstName} {clientData.lastName}</p>
                              <p className="text-xs text-slate-600">{clientData.email}</p>
                              <p className="text-xs text-slate-500">{clientData.phone}</p>
                            </div>
                          </div>
                          <div className="mt-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Application Status:</span>
                              <Badge variant="default" className="text-xs">
                                {clientData.application.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-slate-500">Move-in Date:</span>
                              <span className="font-medium">
                                {new Date(clientData.application.submittedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No current tenants</p>
                  );
                })()}
              </div>

              {/* Financial Details */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Financial Details</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Security Deposit</p>
                    <p className="font-medium">${parseFloat(selectedProperty.depositAmount.toString()).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className="font-medium capitalize">{selectedProperty.status}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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