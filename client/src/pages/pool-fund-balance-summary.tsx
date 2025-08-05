import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface PoolFundTransaction {
  id: number;
  transactionId: number;
  amount: string;
  type: 'deposit' | 'withdrawal';
  description: string;
  clientId?: number;
  county: string;
  month?: string;
  createdAt: string;
  // Transaction details
  transactionType?: string;
  paymentMethod?: string;
  checkNumber?: string;
  paymentDate?: string;
  // Client details for withdrawals
  clientName?: string;
  vendorNumber?: string;
}

interface BalanceSummary {
  county: string;
  totalDeposits: number;
  totalWithdrawals: number;
  currentBalance: number;
  transactionCount: number;
  lastTransaction?: string;
}

function PoolFundBalanceSummary() {
  const [match, params] = useRoute("/pool-fund/balance-summary/:county");
  const county = params?.county;

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<PoolFundTransaction[]>({
    queryKey: ['/api/pool-fund/transactions', county],
    enabled: !!county,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<BalanceSummary>({
    queryKey: ['/api/pool-fund/summary', county], 
    enabled: !!county,
  });

  if (!county) {
    return <div>County not specified</div>;
  }

  if (transactionsLoading || summaryLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const decodedCounty = decodeURIComponent(county);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{decodedCounty} Pool Fund Balance</h1>
            <p className="text-muted-foreground">Detailed breakdown of balance calculation</p>
          </div>
        </div>
      </div>

      {/* Balance Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.currentBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalDeposits)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalWithdrawals)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Badge variant="secondary">{summary.transactionCount}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.transactionCount}</div>
              {summary.lastTransaction && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last: {formatDate(summary.lastTransaction)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Calculation */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Balance Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-lg">
              <span className="text-green-600">Total Deposits:</span>
              <span className="font-semibold text-green-600">
                +{formatCurrency(summary.totalDeposits)}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="text-red-600">Total Withdrawals:</span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(summary.totalWithdrawals)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Current Balance:</span>
              <span className={summary.currentBalance >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(summary.currentBalance)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <p className="text-sm text-muted-foreground">
            All transactions contributing to the current balance
          </p>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge
                          variant={transaction.type === 'deposit' ? 'default' : 'destructive'}
                        >
                          {transaction.type === 'deposit' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {transaction.type.toUpperCase()}
                        </Badge>
                        {transaction.paymentMethod && (
                          <Badge variant="outline">
                            {transaction.paymentMethod}
                          </Badge>
                        )}
                        {transaction.checkNumber && (
                          <Badge variant="outline">
                            Check #{transaction.checkNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm">
                        {transaction.description}
                      </p>
                      {transaction.clientName && (
                        <p className="text-sm text-muted-foreground">
                          Client: {transaction.clientName} ({transaction.vendorNumber})
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                        {transaction.month && ` • Month: ${transaction.month}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${
                          transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'deposit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No transactions found for {decodedCounty}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PoolFundBalanceSummary;