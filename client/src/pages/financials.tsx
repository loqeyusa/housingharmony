import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  File,
  Users
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transaction, Application, Client } from "@shared/schema";

export default function Financials() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const getClientNameFromApplication = (applicationId: number | null) => {
    if (!applicationId) return "Pool Fund Operations";
    const application = applications.find(app => app.id === applicationId);
    if (!application) return "Pool Fund Operations";
    const client = clients.find(c => c.id === application.clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Pool Fund Operations";
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || transaction.type === filterType;
    
    // Client filter
    let matchesClient = true;
    if (selectedClient !== "all") {
      const clientName = getClientNameFromApplication(transaction.applicationId);
      matchesClient = clientName === selectedClient;
    }
    
    return matchesSearch && matchesFilter && matchesClient;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'county_reimbursement':
        return <ArrowDownCircle className="w-5 h-5 text-green-600" />;
      case 'rent_payment':
      case 'deposit_payment':
        return <ArrowUpCircle className="w-5 h-5 text-red-600" />;
      case 'application_fee':
        return <File className="w-5 h-5 text-orange-600" />;
      default:
        return <DollarSign className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'county_reimbursement':
        return 'text-green-600';
      case 'rent_payment':
      case 'deposit_payment':
      case 'application_fee':
      case 'pool_fund_withdrawal':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  const formatTransactionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Calculate summary statistics based on filtered transactions
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'county_reimbursement')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const totalExpenses = filteredTransactions
    .filter(t => ['rent_payment', 'deposit_payment', 'application_fee', 'pool_fund_withdrawal'].includes(t.type))
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
  const totalDeposits = filteredTransactions
    .filter(t => t.type === 'pool_fund_deposit')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  // Get unique clients who have transactions
  const clientsWithTransactions = Array.from(new Set(
    transactions
      .map(t => getClientNameFromApplication(t.applicationId))
      .filter(name => name !== null && name !== "Pool Fund Operations")
  )) as string[];

  const netCashFlow = totalIncome + totalDeposits - totalExpenses;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ${totalIncome.toFixed(2)}
                </p>
                <p className="text-green-600 text-xs mt-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  County reimbursements
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowDownCircle className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  ${totalExpenses.toFixed(2)}
                </p>
                <p className="text-red-600 text-xs mt-2 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Payments & fees
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <ArrowUpCircle className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Net Cash Flow</p>
                <p className={`text-2xl font-bold mt-1 ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netCashFlow.toFixed(2)}
                </p>
                <p className={`text-xs mt-2 flex items-center ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCashFlow >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {netCashFlow >= 0 ? 'Positive flow' : 'Negative flow'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                netCashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <DollarSign className={`w-6 h-6 ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="county_reimbursement">County Reimbursements</SelectItem>
                  <SelectItem value="rent_payment">Rent Payments</SelectItem>
                  <SelectItem value="deposit_payment">Deposit Payments</SelectItem>
                  <SelectItem value="application_fee">Application Fees</SelectItem>
                  <SelectItem value="pool_fund_withdrawal">Pool Fund Withdrawals</SelectItem>
                  <SelectItem value="pool_fund_deposit">Pool Fund Deposits</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-full sm:w-48">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientsWithTransactions.map((clientName) => (
                    <SelectItem key={clientName} value={clientName}>
                      {clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Active Filters Indicator */}
        {(filterType !== "all" || selectedClient !== "all" || searchTerm.trim() !== "") && (
          <div className="px-6 py-2 border-t bg-slate-50">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-slate-600">Active filters:</span>
              {searchTerm.trim() !== "" && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {filterType !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Type: {formatTransactionType(filterType)}
                </Badge>
              )}
              {selectedClient !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Client: {selectedClient}
                </Badge>
              )}
              <span className="text-sm text-slate-500">
                ({filteredTransactions.length} of {transactions.length} transactions)
              </span>
            </div>
          </div>
        )}
        
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <div className="text-slate-400 text-lg mb-2">No transactions found</div>
              <p className="text-slate-600">
                {searchTerm || filterType !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "Financial transactions will appear here once applications are processed"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => {
                const clientName = getClientNameFromApplication(transaction.applicationId);
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      {getTransactionIcon(transaction.type)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{transaction.description}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {formatTransactionType(transaction.type)}
                          </Badge>
                          {clientName && (
                            <span className="text-xs text-slate-600">Client: {clientName}</span>
                          )}
                          {transaction.applicationId && (
                            <span className="text-xs text-slate-600">App #{transaction.applicationId}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'county_reimbursement' ? '+' : '-'}${parseFloat(transaction.amount.toString()).toFixed(2)}
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
