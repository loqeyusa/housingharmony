import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  PiggyBank, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  Wallet
} from "lucide-react";
import { useState } from "react";
import PoolFundForm from "@/components/pool-fund-form";
import type { PoolFund, Client, Transaction } from "@shared/schema";

export default function PoolFundPage() {
  const [showPoolFundForm, setShowPoolFundForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: poolFundEntries = [], isLoading } = useQuery<PoolFund[]>({
    queryKey: ["/api/pool-fund"],
  });

  const { data: poolFundBalance } = useQuery({
    queryKey: ["/api/pool-fund/balance"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const getClientName = (clientId: number | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : null;
  };

  const getTransactionDescription = (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    return transaction ? transaction.description : 'Unknown Transaction';
  };

  const filteredEntries = poolFundEntries.filter(entry =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(entry.clientId)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentBalance = poolFundBalance?.balance || 0;
  const totalDeposits = poolFundEntries
    .filter(entry => entry.type === 'deposit')
    .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);
  const totalWithdrawals = poolFundEntries
    .filter(entry => entry.type === 'withdrawal')
    .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

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
      {/* Pool Fund Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm font-medium">Current Balance</p>
                <p className="text-3xl font-bold text-emerald-800 mt-1">
                  ${currentBalance.toFixed(2)}
                </p>
                <p className="text-emerald-600 text-xs mt-2 flex items-center">
                  <Wallet className="w-3 h-3 mr-1" />
                  Available for supplies
                </p>
              </div>
              <div className="w-14 h-14 bg-emerald-200 rounded-lg flex items-center justify-center">
                <PiggyBank className="text-emerald-700 w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Deposits</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ${totalDeposits.toFixed(2)}
                </p>
                <p className="text-green-600 text-xs mt-2 flex items-center">
                  <ArrowDown className="w-3 h-3 mr-1" />
                  Surplus funds added
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowDown className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Withdrawals</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  ${totalWithdrawals.toFixed(2)}
                </p>
                <p className="text-orange-600 text-xs mt-2 flex items-center">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  Supplies purchased
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ArrowUp className="text-orange-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pool Fund Guidelines */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <PiggyBank className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Pool Fund Guidelines</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Pool fund contains surplus money from county reimbursements exceeding actual payments</li>
                <li>• Funds can be used to purchase supplies, household items, or other necessities for any client</li>
                <li>• All withdrawals must be documented with clear descriptions and receipts when applicable</li>
                <li>• Consider specifying which client benefits when making withdrawals for targeted assistance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pool Fund Entries */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Pool Fund Activity</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button 
                onClick={() => setShowPoolFundForm(true)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <div className="text-slate-400 text-lg mb-2">No pool fund activity found</div>
              <p className="text-slate-600 mb-4">
                {searchTerm 
                  ? "Try adjusting your search criteria" 
                  : "Pool fund entries will appear here when surplus funds are deposited or withdrawn"
                }
              </p>
              {!searchTerm && currentBalance > 0 && (
                <Button 
                  onClick={() => setShowPoolFundForm(true)}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Record First Transaction
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const clientName = getClientName(entry.clientId);
                
                return (
                  <div key={entry.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        entry.type === 'deposit' ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {entry.type === 'deposit' ? (
                          <ArrowDown className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUp className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{entry.description}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              entry.type === 'deposit' 
                                ? 'border-green-200 text-green-700 bg-green-50' 
                                : 'border-orange-200 text-orange-700 bg-orange-50'
                            }`}
                          >
                            {entry.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </Badge>
                          {clientName && (
                            <div className="flex items-center space-x-1 text-xs text-slate-600">
                              <User className="w-3 h-3" />
                              <span>For: {clientName}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Transaction: {getTransactionDescription(entry.transactionId)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        entry.type === 'deposit' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {entry.type === 'deposit' ? '+' : '-'}${parseFloat(entry.amount.toString()).toFixed(2)}
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pool Fund Form Modal */}
      {showPoolFundForm && (
        <PoolFundForm onClose={() => setShowPoolFundForm(false)} />
      )}
    </div>
  );
}
