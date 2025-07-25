import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building, 
  FileText, 
  PiggyBank, 
  ArrowUp,
  ArrowDown,
  Clock,
  Plus,
  TrendingUp,
  File,
  Building2,
  DollarSign,
  ShieldCheck
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import ClientForm from "@/components/client-form";
import PropertyForm from "@/components/property-form";
import ApplicationForm from "@/components/application-form";
import PoolFundForm from "@/components/pool-fund-form";
import type { Client, Application, Transaction, Company } from "@shared/schema";
import { PageLoadingSpinner } from "@/components/loading-spinner";

interface DashboardStats {
  totalClients: number;
  activeProperties: number;
  pendingApplications: number;
  poolFundBalance: number;
  poolFundByCounty?: { 
    county: string; 
    balance: number; 
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
  }[];
  totalVendors: number;
  activeOtherSubsidies: number;
  totalOtherSubsidyAmount: number;
}

export default function Dashboard() {
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showPoolFundForm, setShowPoolFundForm] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const handleCountyClick = (countyName: string) => {
    navigate(`/pool-fund/${encodeURIComponent(countyName)}`);
  };

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
    refetchInterval: 10000, // Refresh stats every 10 seconds
  });

  const { data: company } = useQuery<Company>({
    queryKey: [`/api/companies/${user?.companyId}`],
    enabled: !!user?.companyId,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
    refetchInterval: 15000, // Refresh clients every 15 seconds
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
    enabled: !!user,
    refetchInterval: 20000, // Refresh applications every 20 seconds
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
    refetchInterval: 25000, // Refresh transactions every 25 seconds
  });

  const { data: poolFundSummaryByCounty = [] } = useQuery<Array<{
    county: string;
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    entryCount: number;
  }>>({
    queryKey: ["/api/pool-fund/summary/counties", user?.id],
    enabled: !!user,
  });

  const recentClients = clients.slice(0, 3);
  const pendingApplications = applications.filter(app => app.status === "pending").slice(0, 2);
  const recentTransactions = transactions.slice(0, 3);

  if (statsLoading) {
    return <PageLoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Company Header */}
      {company && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="text-primary w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{company.displayName || company.name}</h1>
                <p className="text-slate-600 text-sm">Housing Program Management</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <ShieldCheck className="w-3 h-3 mr-1" />
                {company.status === 'active' ? 'Active' : company.status}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Clients</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.totalClients || 0}
                </p>
                <p className="text-green-600 text-xs mt-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Active registrations
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Active Properties</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.activeProperties || 0}
                </p>
                <p className="text-green-600 text-xs mt-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Available units
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Pending Applications</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.pendingApplications || 0}
                </p>
                <p className="text-orange-600 text-xs mt-2 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Awaiting review
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="text-orange-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Pool Fund Balance</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${stats?.poolFundBalance?.toFixed(2) || '0.00'}
                </p>
                <p className="text-green-600 text-xs mt-2 flex items-center">
                  <Plus className="w-3 h-3 mr-1" />
                  Surplus funds
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <PiggyBank className="text-emerald-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Vendors</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.totalVendors || 0}
                </p>
                <p className="text-blue-600 text-xs mt-2 flex items-center">
                  <Building2 className="w-3 h-3 mr-1" />
                  Service providers
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="text-blue-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Active Other Subsidies</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.activeOtherSubsidies || 0}
                </p>
                <p className="text-purple-600 text-xs mt-2 flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Non-HS/GRH programs
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-purple-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Monthly Subsidy Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${stats?.totalOtherSubsidyAmount?.toFixed(2) || '0.00'}
                </p>
                <p className="text-indigo-600 text-xs mt-2 flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" />
                  We pay monthly
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-indigo-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced County Overview Section */}
      {stats?.poolFundByCounty && stats.poolFundByCounty.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">County Overview</h2>
            <Badge variant="secondary" className="text-sm">
              {stats.poolFundByCounty.length} Counties
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.poolFundByCounty.map((county) => (
              <Card 
                key={county.county} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => handleCountyClick(county.county)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
                    {county.county} County
                    <PiggyBank className="h-5 w-5 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Pool Fund Balance */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-800">Pool Fund Balance</span>
                    <span className="text-xl font-bold text-green-900">
                      ${county.balance.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Client Statistics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-lg font-bold text-blue-900">{county.totalClients}</div>
                      <div className="text-xs font-medium text-blue-700">Total Clients</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="text-lg font-bold text-emerald-900">{county.activeClients}</div>
                      <div className="text-xs font-medium text-emerald-700">Active</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-lg font-bold text-slate-900">{county.inactiveClients}</div>
                      <div className="text-xs font-medium text-slate-700">Inactive</div>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2">
                    <div className="text-xs text-slate-500">Click to view detailed pool fund records</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Clients */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Clients</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentClients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No clients registered yet
                </div>
              ) : (
                <div className="space-y-4">
                  {recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-medium text-sm">
                            {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-sm text-slate-600">{client.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(client.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-4"
              onClick={() => setShowClientForm(true)}
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                <Users className="text-primary w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">Add New Client</p>
                <p className="text-sm text-slate-600">Register and collect KYC</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-4"
              onClick={() => setShowPropertyForm(true)}
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <Building className="text-green-600 w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">Add Property</p>
                <p className="text-sm text-slate-600">Record new housing unit</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-4"
              onClick={() => setShowApplicationForm(true)}
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <FileText className="text-orange-600 w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">Submit Application</p>
                <p className="text-sm text-slate-600">County application process</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto p-4"
              onClick={() => setShowPoolFundForm(true)}
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                <PiggyBank className="text-emerald-600 w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">Pool Fund Transaction</p>
                <p className="text-sm text-slate-600">Manage surplus funds</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Applications and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Applications */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle>Pending Applications</CardTitle>
              <Badge variant="secondary">
                {pendingApplications.length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {pendingApplications.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No pending applications
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApplications.map((application) => {
                  const client = clients.find(c => c.id === application.clientId);
                  return (
                    <div key={application.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">
                          {client ? `${client.firstName} ${client.lastName}` : 'Unknown Client'}
                        </p>
                        <p className="text-sm text-slate-600">Property ID: {application.propertyId}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Submitted {new Date(application.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          ${parseFloat(application.rentPaid.toString()).toFixed(2)}
                        </p>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {application.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="ghost" className="w-full mt-4 text-primary">
              View All Applications
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'county_reimbursement' ? 'bg-green-100' : 
                        transaction.type.includes('payment') ? 'bg-red-100' : 'bg-orange-100'
                      }`}>
                        {transaction.type === 'county_reimbursement' ? (
                          <ArrowDown className={`w-4 h-4 ${
                            transaction.type === 'county_reimbursement' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        ) : transaction.type.includes('payment') ? (
                          <ArrowUp className="text-red-600 w-4 h-4" />
                        ) : (
                          <File className="text-orange-600 w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{transaction.description}</p>
                        <p className="text-sm text-slate-600">
                          {transaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'county_reimbursement' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'county_reimbursement' ? '+' : '-'}${parseFloat(transaction.amount.toString()).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
}
