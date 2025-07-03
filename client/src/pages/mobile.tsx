import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BarChart3
} from "lucide-react";
import ClientForm from "@/components/client-form";
import PropertyForm from "@/components/property-form";
import ApplicationForm from "@/components/application-form";
import PoolFundForm from "@/components/pool-fund-form";
import AIAssistant from "@/components/ai-assistant";
import type { Client, Property, Application, Transaction } from "@shared/schema";

type TabType = 'dashboard' | 'clients' | 'properties' | 'applications' | 'pool-fund' | 'reports';

export default function Mobile() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showPoolFundForm, setShowPoolFundForm] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: poolFundBalance } = useQuery({
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
          {properties.slice(0, 10).map((property) => (
            <Card key={property.id}>
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
                </div>
              </CardContent>
            </Card>
          ))}
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
      default:
        return <DashboardTab />;
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'properties', label: 'Properties', icon: Building },
    { id: 'applications', label: 'Apps', icon: FileText },
    { id: 'pool-fund', label: 'Fund', icon: PiggyBank },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Housing Pro</h1>
            <p className="text-xs text-slate-500">Mobile Management</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="text-slate-400 w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full"></span>
            </div>
          </div>
        </div>
      </div>

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

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <AIAssistant 
          onClose={() => setShowAIAssistant(false)}
        />
      )}
    </div>
  );
}