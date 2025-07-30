import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  CreditCard, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  MinusCircle,
  Download,
  Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Schema for adding money to client accounts
const addMoneySchema = z.object({
  clientId: z.number(),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.string().default("check"),
  checkNumber: z.string().optional(),
  checkDate: z.string().optional(),
  paymentDate: z.string(),
  month: z.string(),
});

type AddMoneyFormData = z.infer<typeof addMoneySchema>;

export default function Financials() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [addMoneyDialogOpen, setAddMoneyDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications"],
  });

  const { data: recurringBillInstances = [] } = useQuery({
    queryKey: ["/api/recurring-bill-instances"],
  });

  const form = useForm<AddMoneyFormData>({
    resolver: zodResolver(addMoneySchema),
    defaultValues: {
      paymentMethod: "check",
      paymentDate: new Date().toISOString().split('T')[0],
      month: selectedMonth,
    },
  });

  const addMoneyMutation = useMutation({
    mutationFn: (data: AddMoneyFormData) =>
      fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "county_reimbursement",
          amount: data.amount,
          description: `${data.description} - Check #${data.checkNumber || 'N/A'}`,
          month: data.month,
          paymentMethod: data.paymentMethod,
          checkNumber: data.checkNumber,
          checkDate: data.checkDate,
          paymentDate: data.paymentDate,
        }),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setAddMoneyDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Payment added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment",
        variant: "destructive",
      });
    },
  });

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    const currentMonthTransactions = transactions.filter((t: any) => 
      t.month === selectedMonth || new Date(t.createdAt).toISOString().substring(0, 7) === selectedMonth
    );

    const totalIncome = currentMonthTransactions
      .filter((t: any) => parseFloat(t.amount) > 0)
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    const totalExpenses = currentMonthTransactions
      .filter((t: any) => parseFloat(t.amount) < 0)
      .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

    const netFlow = totalIncome - totalExpenses;

    // Calculate client balances
    const clientBalances: Record<number, { name: string; balance: number; lastPayment: string | null }> = {};
    
    clients.forEach((client: any) => {
      const clientTransactions = transactions.filter((t: any) => {
        const app = applications.find((a: any) => a.id === t.applicationId);
        return app?.clientId === client.id;
      });

      const balance = clientTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
      const lastPayment = clientTransactions
        .filter((t: any) => parseFloat(t.amount) > 0)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      clientBalances[client.id] = {
        name: `${client.firstName} ${client.lastName}`,
        balance,
        lastPayment: lastPayment ? lastPayment.createdAt : null,
      };
    });

    const positiveBalanceClients = Object.entries(clientBalances).filter(([_, data]) => data.balance > 0);
    const negativeBalanceClients = Object.entries(clientBalances).filter(([_, data]) => data.balance < 0);
    const zeroBalanceClients = Object.entries(clientBalances).filter(([_, data]) => data.balance === 0);

    return {
      totalIncome,
      totalExpenses,
      netFlow,
      clientBalances,
      positiveBalanceClients,
      negativeBalanceClients,
      zeroBalanceClients,
      currentMonthTransactions,
    };
  }, [transactions, clients, applications, selectedMonth]);

  const handleAddMoney = (clientId: number) => {
    setSelectedClient(clientId);
    const client = clients.find((c: any) => c.id === clientId);
    form.reset({
      clientId,
      paymentMethod: "check",
      paymentDate: new Date().toISOString().split('T')[0],
      month: selectedMonth,
      description: `County reimbursement for ${client?.firstName} ${client?.lastName}`,
    });
    setAddMoneyDialogOpen(true);
  };

  const onSubmitAddMoney = (data: AddMoneyFormData) => {
    addMoneyMutation.mutate(data);
  };

  const getStatusBadge = (balance: number) => {
    if (balance > 0) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Positive
      </Badge>;
    } else if (balance < 0) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Negative
      </Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        <MinusCircle className="w-3 h-3 mr-1" />
        Zero
      </Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Management</h1>
          <p className="text-muted-foreground">
            Comprehensive financial tracking and client account management
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = date.toISOString().substring(0, 7);
                const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                return (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${financialMetrics.totalIncome.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              County reimbursements & payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${financialMetrics.totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Rent, bills & client expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <DollarSign className={`h-4 w-4 ${financialMetrics.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialMetrics.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${financialMetrics.netFlow.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly net position
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(financialMetrics.clientBalances).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialMetrics.negativeBalanceClients.length} with negative balance
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="client-balances">Client Balances</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clients with Negative Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Clients with Negative Balances
                </CardTitle>
                <CardDescription>
                  Clients who need county reimbursement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {financialMetrics.negativeBalanceClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No clients with negative balances
                  </div>
                ) : (
                  <div className="space-y-4">
                    {financialMetrics.negativeBalanceClients.slice(0, 5).map(([clientId, data]) => (
                      <div key={clientId} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{data.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Balance: <span className="text-red-600 font-medium">${data.balance.toFixed(2)}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMoney(parseInt(clientId))}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Add Payment
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>
                  Latest financial activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialMetrics.currentMonthTransactions.slice(0, 5).map((transaction: any) => (
                    <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`font-medium ${parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(transaction.amount) >= 0 ? '+' : ''}${transaction.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Balances Tab */}
        <TabsContent value="client-balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Account Balances</CardTitle>
              <CardDescription>
                View and manage individual client account balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Account Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(financialMetrics.clientBalances).map(([clientId, data]) => (
                    <TableRow key={clientId}>
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell className={`font-medium ${data.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${data.balance.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(data.balance)}</TableCell>
                      <TableCell>
                        {data.lastPayment ? new Date(data.lastPayment).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddMoney(parseInt(clientId))}
                        >
                          Add Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Complete financial transaction log for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialMetrics.currentMonthTransactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className={`font-medium ${parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(transaction.amount) >= 0 ? '+' : ''}${transaction.amount}
                      </TableCell>
                      <TableCell>{transaction.paymentMethod || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Receipts:</span>
                  <span className="font-medium text-green-600">${financialMetrics.totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenditures:</span>
                  <span className="font-medium text-red-600">${financialMetrics.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Net Position:</span>
                  <span className={`font-bold ${financialMetrics.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${financialMetrics.netFlow.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Balance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Clients with Positive Balance:</span>
                  <span className="font-medium">{financialMetrics.positiveBalanceClients.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clients with Negative Balance:</span>
                  <span className="font-medium text-red-600">{financialMetrics.negativeBalanceClients.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clients with Zero Balance:</span>
                  <span className="font-medium">{financialMetrics.zeroBalanceClients.length}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total Clients:</span>
                  <span className="font-bold">{Object.keys(financialMetrics.clientBalances).length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recurring Bills Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recurring Bills Configuration
                </CardTitle>
                <CardDescription>
                  Set up automated monthly billing for clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Configure automatic monthly rent and bill deductions from client accounts. 
                    This creates negative balances that require county reimbursement.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/account-settings'}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Configure Recurring Bills
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Processing Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Processing
                </CardTitle>
                <CardDescription>
                  Default settings for county reimbursements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Default Payment Method</Label>
                    <Select defaultValue="check">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="ach">ACH Transfer</SelectItem>
                        <SelectItem value="wire">Wire Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Processing Schedule</Label>
                    <Select defaultValue="monthly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Reporting Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Reporting Configuration
                </CardTitle>
                <CardDescription>
                  Configure financial report generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Report Generation</Label>
                    <Select defaultValue="monthly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto-export Reports</Label>
                    <input type="checkbox" className="toggle" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Email Notifications</Label>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bill Management Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Bill Management
                </CardTitle>
                <CardDescription>
                  Automated bill processing controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Access bill management interface to track pending payments and mark bills as paid.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/bill-management'}
                    className="w-full"
                    variant="outline"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Manage Bills & Payments
                  </Button>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Monthly Bill Generation
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">
                      Automatically generates bills on the 1st of each month
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Financial Settings</CardTitle>
              <CardDescription>
                System-wide financial configuration options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Currency Format</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="cad">CAD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Select defaultValue="january">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="january">January</SelectItem>
                      <SelectItem value="april">April</SelectItem>
                      <SelectItem value="july">July</SelectItem>
                      <SelectItem value="october">October</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Retention</Label>
                  <Select defaultValue="7years">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3years">3 Years</SelectItem>
                      <SelectItem value="5years">5 Years</SelectItem>
                      <SelectItem value="7years">7 Years</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Money Dialog */}
      <Dialog open={addMoneyDialogOpen} onOpenChange={setAddMoneyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment to Client Account</DialogTitle>
            <DialogDescription>
              Record a county reimbursement or payment for this client
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <form onSubmit={form.handleSubmit(onSubmitAddMoney)} className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">
                  {clients.find((c: any) => c.id === selectedClient)?.firstName} {clients.find((c: any) => c.id === selectedClient)?.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  Current Balance: <span className={`font-medium ${financialMetrics.clientBalances[selectedClient]?.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${financialMetrics.clientBalances[selectedClient]?.balance.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    {...form.register("amount")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="month">Month *</Label>
                  <Input
                    {...form.register("month")}
                    type="month"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  {...form.register("description")}
                  placeholder="County reimbursement for..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={form.watch("paymentMethod")}
                    onValueChange={(value) => form.setValue("paymentMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="ach">ACH Transfer</SelectItem>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="checkNumber">Check Number</Label>
                  <Input
                    {...form.register("checkNumber")}
                    placeholder="1234"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    {...form.register("paymentDate")}
                    type="date"
                  />
                </div>
              </div>

              {form.watch("paymentMethod") === "check" && (
                <div>
                  <Label htmlFor="checkDate">Check Date</Label>
                  <Input
                    {...form.register("checkDate")}
                    type="date"
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddMoneyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addMoneyMutation.isPending}>
                  Add Payment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}