import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Calendar,
  Users,
  Building,
  DollarSign,
  PiggyBank,
  TrendingUp,
  BarChart3,
  PieChart,
  FileSpreadsheet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Client, Property, Application, Transaction, PoolFund } from "@shared/schema";

export default function Reports() {
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

  const { data: poolFundEntries = [] } = useQuery<PoolFund[]>({
    queryKey: ["/api/pool-fund"],
  });

  const { data: poolFundBalance } = useQuery({
    queryKey: ["/api/pool-fund/balance"],
  });

  // Calculate statistics
  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    totalProperties: properties.length,
    availableProperties: properties.filter(p => p.status === 'available').length,
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

  const reportSections = [
    {
      title: "Client Management Report",
      description: "Comprehensive overview of all registered clients and their status",
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      data: [
        { label: "Total Clients", value: stats.totalClients },
        { label: "Active Clients", value: stats.activeClients },
        { label: "Inactive Clients", value: stats.totalClients - stats.activeClients },
      ]
    },
    {
      title: "Property Portfolio Report",
      description: "Status and details of all properties in the system",
      icon: Building,
      color: "bg-green-100 text-green-600",
      data: [
        { label: "Total Properties", value: stats.totalProperties },
        { label: "Available Properties", value: stats.availableProperties },
        { label: "Occupied Properties", value: properties.filter(p => p.status === 'occupied').length },
        { label: "Maintenance Properties", value: properties.filter(p => p.status === 'maintenance').length },
      ]
    },
    {
      title: "Application Status Report",
      description: "County application submissions and approval rates",
      icon: FileText,
      color: "bg-orange-100 text-orange-600",
      data: [
        { label: "Total Applications", value: stats.totalApplications },
        { label: "Pending Applications", value: stats.pendingApplications },
        { label: "Approved Applications", value: stats.approvedApplications },
        { label: "Rejected Applications", value: stats.rejectedApplications },
        { label: "Approval Rate", value: stats.totalApplications > 0 ? `${((stats.approvedApplications / stats.totalApplications) * 100).toFixed(1)}%` : "0%" },
      ]
    },
    {
      title: "Financial Summary Report",
      description: "Revenue, expenses, and cash flow analysis",
      icon: DollarSign,
      color: "bg-purple-100 text-purple-600",
      data: [
        { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}` },
        { label: "Total Expenses", value: `$${stats.totalExpenses.toFixed(2)}` },
        { label: "Net Cash Flow", value: `$${(stats.totalRevenue - stats.totalExpenses).toFixed(2)}` },
        { label: "Average Application Amount", value: stats.totalApplications > 0 ? `$${(stats.totalRevenue / stats.totalApplications).toFixed(2)}` : "$0.00" },
      ]
    },
    {
      title: "Pool Fund Activity Report",
      description: "Surplus fund management and utilization tracking",
      icon: PiggyBank,
      color: "bg-emerald-100 text-emerald-600",
      data: [
        { label: "Current Balance", value: `$${stats.poolFundBalance.toFixed(2)}` },
        { label: "Total Deposits", value: poolFundEntries.filter(e => e.type === 'deposit').length },
        { label: "Total Withdrawals", value: poolFundEntries.filter(e => e.type === 'withdrawal').length },
        { label: "Total Deposit Amount", value: `$${poolFundEntries.filter(e => e.type === 'deposit').reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0).toFixed(2)}` },
        { label: "Total Withdrawal Amount", value: `$${poolFundEntries.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0).toFixed(2)}` },
      ]
    }
  ];

  const exportReports = [
    {
      title: "Client Database Export",
      description: "Export all client information and KYC data",
      icon: FileSpreadsheet,
      format: "CSV",
      action: "export-clients"
    },
    {
      title: "Property Listings Export",
      description: "Export property details and landlord information",
      icon: FileSpreadsheet,
      format: "CSV",
      action: "export-properties"
    },
    {
      title: "Financial Transactions Export",
      description: "Export all transaction history and financial data",
      icon: FileSpreadsheet,
      format: "CSV",
      action: "export-transactions"
    },
    {
      title: "Monthly Summary Report",
      description: "Comprehensive monthly performance report",
      icon: FileText,
      format: "PDF",
      action: "export-monthly"
    }
  ];

  const handleExport = (action: string) => {
    // In a real application, this would trigger the actual export
    console.log(`Exporting: ${action}`);
    // For demo purposes, we'll just show a toast or alert
    alert(`Export functionality for ${action} would be implemented here.`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.totalClients}</p>
            <p className="text-sm text-slate-600">Total Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.totalProperties}</p>
            <p className="text-sm text-slate-600">Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.pendingApplications}</p>
            <p className="text-sm text-slate-600">Pending Apps</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <PiggyBank className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">${stats.poolFundBalance.toFixed(0)}</p>
            <p className="text-sm text-slate-600">Pool Fund</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${section.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.data.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Export Reports</span>
          </CardTitle>
          <p className="text-slate-600">Generate and download comprehensive reports in various formats</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportReports.map((report, index) => {
              const Icon = report.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-8 h-8 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-900">{report.title}</p>
                      <p className="text-sm text-slate-600">{report.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{report.format}</Badge>
                    <Button
                      size="sm"
                      onClick={() => handleExport(report.action)}
                      className="bg-primary text-white hover:bg-primary/90"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Key Performance Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-blue-900">
                {stats.totalApplications > 0 ? ((stats.approvedApplications / stats.totalApplications) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-blue-700">Application Approval Rate</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-green-900">
                ${stats.totalApplications > 0 ? (stats.totalRevenue / stats.totalApplications).toFixed(0) : 0}
              </p>
              <p className="text-sm text-green-700">Average Reimbursement</p>
            </div>
            
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <PiggyBank className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <p className="text-2xl font-bold text-emerald-900">
                {stats.totalRevenue > 0 ? ((stats.poolFundBalance / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-emerald-700">Pool Fund Ratio</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
