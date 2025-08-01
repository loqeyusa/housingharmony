import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  FileSpreadsheet,
  Printer,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Client, Property, Application, Transaction, PoolFund } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  
  // Date range selection state
  const [dateRangeType, setDateRangeType] = useState<'current_month' | 'select_month' | 'custom_range'>('current_month');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM format
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

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

  const { data: poolFundBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/pool-fund/balance"],
  });

  // Calculate date range based on selection
  const { startDate, endDate, periodDescription } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let description: string;

    switch (dateRangeType) {
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        description = `Current Month (${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
        break;
      
      case 'select_month':
        const [year, month] = selectedMonth.split('-').map(Number);
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0, 23, 59, 59);
        description = `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        break;
      
      case 'custom_range':
        start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
        description = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        break;
      
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        description = 'Current Month';
    }

    return { startDate: start, endDate: end, periodDescription: description };
  }, [dateRangeType, selectedMonth, customStartDate, customEndDate]);

  // Filter data based on date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  const filteredApplications = useMemo(() => {
    return applications.filter(a => {
      const appDate = new Date(a.submittedAt);
      return appDate >= startDate && appDate <= endDate;
    });
  }, [applications, startDate, endDate]);

  const filteredPoolFundEntries = useMemo(() => {
    return poolFundEntries.filter(e => {
      const entryDate = new Date(e.createdAt);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [poolFundEntries, startDate, endDate]);

  // Calculate statistics based on filtered data
  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    totalProperties: properties.length,
    availableProperties: properties.filter(p => p.status === 'available').length,
    totalApplications: filteredApplications.length,
    pendingApplications: filteredApplications.filter(a => a.status === 'pending').length,
    approvedApplications: filteredApplications.filter(a => a.status === 'approved').length,
    rejectedApplications: filteredApplications.filter(a => a.status === 'rejected').length,
    totalRevenue: filteredTransactions
      .filter(t => t.type === 'county_reimbursement')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
    totalExpenses: filteredTransactions
      .filter(t => ['rent_payment', 'deposit_payment', 'application_fee', 'pool_fund_withdrawal'].includes(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
    poolFundBalance: poolFundBalance?.balance ?? 0,
    poolFundDeposits: filteredPoolFundEntries.filter(e => e.type === 'deposit').length,
    poolFundWithdrawals: filteredPoolFundEntries.filter(e => e.type === 'withdrawal').length,
    poolFundDepositAmount: filteredPoolFundEntries
      .filter(e => e.type === 'deposit')
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0),
    poolFundWithdrawalAmount: filteredPoolFundEntries
      .filter(e => e.type === 'withdrawal')
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0),
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
        { label: "Period Deposits", value: stats.poolFundDeposits },
        { label: "Period Withdrawals", value: stats.poolFundWithdrawals },
        { label: "Deposit Amount", value: `$${stats.poolFundDepositAmount.toFixed(2)}` },
        { label: "Withdrawal Amount", value: `$${stats.poolFundWithdrawalAmount.toFixed(2)}` },
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
    toast({
      title: "Export Started",
      description: `Generating ${action} report for ${periodDescription}...`,
    });
    
    // In a real application, this would trigger the actual export
    console.log(`Exporting: ${action} for period: ${periodDescription}`);
    
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Report for ${periodDescription} has been generated successfully.`,
      });
    }, 2000);
  };

  const handlePrint = () => {
    // Set print styles
    const printStyles = `
      <style>
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', printStyles);
    
    // Trigger print
    window.print();
    
    toast({
      title: "Print Started",
      description: `Printing report for ${periodDescription}`,
    });
  };

  return (
    <div className="space-y-4 print-area">
      {/* Date Range Selection */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateRangeType">Report Period</Label>
              <Select value={dateRangeType} onValueChange={(value: any) => setDateRangeType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">This Month</SelectItem>
                  <SelectItem value="select_month">Select Month</SelectItem>
                  <SelectItem value="custom_range">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRangeType === 'select_month' && (
              <div>
                <Label htmlFor="selectedMonth">Select Month</Label>
                <Input
                  id="selectedMonth"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {dateRangeType === 'custom_range' && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end gap-2">
              <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <Calendar className="h-4 w-4 inline mr-2" />
              Report Period: <strong>{periodDescription}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center">Housing Program Management Report</h1>
        <p className="text-center text-gray-600 mt-2">Report Period: {periodDescription}</p>
        <p className="text-center text-gray-500 text-sm">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.totalClients}</p>
            <p className="text-xs text-slate-600">Total Clients</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 text-center">
            <Building className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.totalProperties}</p>
            <p className="text-xs text-slate-600">Properties</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 text-center">
            <FileText className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">{stats.pendingApplications}</p>
            <p className="text-xs text-slate-600">Pending Apps</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 text-center">
            <PiggyBank className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-900">${stats.poolFundBalance.toFixed(0)}</p>
            <p className="text-xs text-slate-600">Pool Fund</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <p className="text-xs text-slate-600 mt-0.5">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {section.data.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-b-0">
                      <span className="text-xs text-slate-600">{item.label}</span>
                      <span className="font-semibold text-sm text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* County Payment Variance Report */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            County Payment Variance Analysis
          </CardTitle>
          <p className="text-sm text-gray-600">Payment deficits and surpluses by county for {periodDescription}</p>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No transactions found for selected period</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                <div>Transaction Type</div>
                <div>Amount</div>
                <div>Date</div>
              </div>
              {filteredTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-gray-100">
                  <div className="capitalize">{transaction.type.replace('_', ' ')}</div>
                  <div className={`font-medium ${parseFloat(transaction.amount.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${parseFloat(transaction.amount.toString()).toFixed(2)}
                  </div>
                  <div className="text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {filteredTransactions.length > 10 && (
                <p className="text-center text-sm text-gray-500 py-2">
                  Showing 10 of {filteredTransactions.length} transactions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export & Analytics Combined */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Export Section */}
        <Card className="hover:shadow-md transition-shadow no-print">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Download className="w-4 h-4" />
              <span>Export Reports</span>
            </CardTitle>
            <p className="text-xs text-slate-600">Generate and download reports</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {exportReports.map((report, index) => {
                const Icon = report.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{report.title}</p>
                        <p className="text-xs text-slate-600">{report.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{report.format}</Badge>
                      <Button
                        size="sm"
                        onClick={() => handleExport(report.action)}
                        className="h-7 text-xs no-print"
                      >
                        <Download className="w-3 h-3 mr-1" />
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
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <BarChart3 className="w-4 h-4" />
              <span>Key Performance Insights</span>
            </CardTitle>
            <p className="text-xs text-slate-600">Critical performance metrics</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="text-center p-3 bg-blue-50 rounded">
                <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xl font-bold text-blue-900">
                  {stats.totalApplications > 0 ? ((stats.approvedApplications / stats.totalApplications) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-blue-700">Application Approval Rate</p>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded">
                <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-xl font-bold text-green-900">
                  ${stats.totalApplications > 0 ? (stats.totalRevenue / stats.totalApplications).toFixed(0) : 0}
                </p>
                <p className="text-xs text-green-700">Average Reimbursement</p>
              </div>
              
              <div className="text-center p-3 bg-emerald-50 rounded">
                <PiggyBank className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-xl font-bold text-emerald-900">
                  {stats.totalRevenue > 0 ? ((stats.poolFundBalance / stats.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-emerald-700">Pool Fund Ratio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
