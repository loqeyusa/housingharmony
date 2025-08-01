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
  Filter,
  Eye,
  MessageSquare,
  CheckCircle2
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

// Schema for settling payments
const settlePaymentSchema = z.object({
  paymentId: z.number(),
  paymentMethod: z.string().default("check"),
  checkNumber: z.string().optional(),
  comments: z.string().optional(),
  settledDate: z.string(),
  settledAmount: z.string(),
});

type SettlePaymentFormData = z.infer<typeof settlePaymentSchema>;

export default function Financials() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [addMoneyDialogOpen, setAddMoneyDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  
  // Priority Actions Dialogs
  const [overdueVendorDialogOpen, setOverdueVendorDialogOpen] = useState(false);
  const [rentPaymentsDialogOpen, setRentPaymentsDialogOpen] = useState(false);
  const [settlePaymentDialogOpen, setSettlePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // Report generation states
  const [reportPeriod, setReportPeriod] = useState("1");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [statementData, setStatementData] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/applications"],
  });

  const { data: recurringBillInstances = [] } = useQuery<any[]>({
    queryKey: ["/api/recurring-bill-instances"],
  });

  const { data: recurringBills = [] } = useQuery<any[]>({
    queryKey: ["/api/recurring-bills"],
  });

  const form = useForm<AddMoneyFormData>({
    resolver: zodResolver(addMoneySchema),
    defaultValues: {
      paymentMethod: "check",
      paymentDate: new Date().toISOString().split('T')[0],
      month: selectedMonth,
    },
  });

  const settleForm = useForm<SettlePaymentFormData>({
    resolver: zodResolver(settlePaymentSchema),
    defaultValues: {
      paymentMethod: "check",
      settledDate: new Date().toISOString().split('T')[0],
    },
  });

  // Process real overdue vendor payments from transactions
  const overdueVendorPayments = useMemo(() => {
    const today = new Date();
    return transactions
      .filter((t: any) => t.type === 'vendor_payment' && t.description)
      .map((t: any) => {
        // Parse vendor info from description field
        const parts = t.description.split(' - ');
        const vendor = parts[0] || 'Unknown Vendor';
        const description = parts.slice(1).join(' - ');
        
        // Extract due date from description or use created date
        const dueDateMatch = t.description.match(/Due:\s*(\d{4}-\d{2}-\d{2})/);
        const dueDate = dueDateMatch ? new Date(dueDateMatch[1]) : new Date(t.created_at);
        const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          id: t.id,
          vendor,
          amount: parseFloat(t.amount),
          description,
          dueDate: dueDate.toISOString().split('T')[0],
          daysPastDue,
          invoiceNumber: t.confirmation_number || `INV-${t.id}`,
          priority: daysPastDue > 5 ? 'high' : daysPastDue > 2 ? 'medium' : 'low'
        };
      })
      .filter((p: any) => p.daysPastDue > 0) // Only show overdue
      .sort((a: any, b: any) => b.daysPastDue - a.daysPastDue);
  }, [transactions]);

  // Process real rent payments due today from bill instances
  const rentPaymentsDue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return recurringBillInstances
      .filter((instance: any) => 
        instance.status === 'pending' && 
        instance.dueDate <= today
      )
      .map((instance: any) => {
        const client = clients.find((c: any) => c.id === instance.clientId);
        const clientName = client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
        
        // Get landlord info from recurring bills
        const recurringBill = recurringBills.find((rb: any) => rb.id === instance.recurringBillId);
        const landlord = recurringBill?.landlordName || 'Property Management';
        const property = `${recurringBill?.description || 'Property'} - ${clientName}`;
        
        return {
          id: instance.id,
          property,
          landlord,
          client: clientName,
          amount: parseFloat(instance.amount),
          dueDate: instance.dueDate,
          leaseId: `RBI-${instance.id}`
        };
      });
  }, [recurringBillInstances, clients, recurringBills]);

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
      // Invalidate all transaction-related queries to ensure the transaction history updates
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Also invalidate any client-specific transaction queries
      const clientId = form.getValues("clientId");
      if (clientId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/transactions?clientId=${clientId}`] 
        });
      }
      
      setAddMoneyDialogOpen(false);
      form.reset();
      toast({
        title: "Payment Added Successfully",
        description: "County reimbursement has been recorded and will appear in transaction history.",
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

  const settlePaymentMutation = useMutation({
    mutationFn: (data: SettlePaymentFormData) =>
      apiRequest("POST", "/api/financial/settle-payment", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSettlePaymentDialogOpen(false);
      settleForm.reset();
      toast({
        title: "Payment Settled",
        description: "Payment has been successfully marked as settled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to settle payment",
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

    // Calculate client balances with detailed financial data
    const clientBalances: Record<number, { 
      name: string; 
      balance: number; 
      totalReceived: number;
      totalSpent: number;
      lastPayment: string | null;
    }> = {};
    
    clients.forEach((client: any) => {
      const clientTransactions = transactions.filter((t: any) => {
        const app = applications.find((a: any) => a.id === t.applicationId);
        return app?.clientId === client.id;
      });

      const totalReceived = clientTransactions
        .filter((t: any) => parseFloat(t.amount) > 0)
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
      const totalSpent = Math.abs(clientTransactions
        .filter((t: any) => parseFloat(t.amount) < 0)
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0));
      
      // Always calculate balance as monthly income minus total spent
      // This allows going negative if spending exceeds income before money is received
      const monthlyIncome = parseFloat(client.monthlyIncome?.toString() || "0");
      const balance = monthlyIncome - totalSpent;
      
      const lastPayment = clientTransactions
        .filter((t: any) => parseFloat(t.amount) > 0)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      clientBalances[client.id] = {
        name: `${client.firstName} ${client.lastName}`,
        balance,
        totalReceived,
        totalSpent,
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

  const handleSettlePayment = (payment: any) => {
    setSelectedPayment(payment);
    settleForm.reset({
      paymentId: payment.id,
      paymentMethod: "check",
      settledDate: new Date().toISOString().split('T')[0],
      settledAmount: payment.amount.toString(),
    });
    setSettlePaymentDialogOpen(true);
  };

  const onSubmitSettlePayment = (data: SettlePaymentFormData) => {
    settlePaymentMutation.mutate(data);
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

  // Report generation functions
  const generateStatement = async () => {
    setGeneratingReport(true);
    try {
      // Calculate date range based on selected period
      let startDate, endDate;
      const now = new Date();
      
      if (reportPeriod === 'custom') {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        const monthsBack = parseInt(reportPeriod);
        startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // Filter transactions for the selected period
      const periodTransactions = transactions.filter((t: any) => {
        const transactionDate = new Date(t.createdAt);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      // Calculate financial metrics for the period
      const totalIncome = periodTransactions
        .filter((t: any) => parseFloat(t.amount) > 0)
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      const totalExpenses = periodTransactions
        .filter((t: any) => parseFloat(t.amount) < 0)
        .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

      const netFlow = totalIncome - totalExpenses;

      // Calculate client balances for the period
      const periodClientBalances: Record<number, number> = {};
      clients.forEach((client: any) => {
        const clientTransactions = periodTransactions.filter((t: any) => {
          const app = applications.find((a: any) => a.id === t.applicationId);
          return app?.clientId === client.id;
        });
        periodClientBalances[client.id] = clientTransactions.reduce(
          (sum: number, t: any) => sum + parseFloat(t.amount), 0
        );
      });

      const positiveCount = Object.values(periodClientBalances).filter(balance => balance > 0).length;
      const negativeCount = Object.values(periodClientBalances).filter(balance => balance < 0).length;
      const zeroCount = Object.values(periodClientBalances).filter(balance => balance === 0).length;

      const statement = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          description: reportPeriod === 'custom' 
            ? `${customStartDate} to ${customEndDate}`
            : `Last ${reportPeriod} month${reportPeriod !== '1' ? 's' : ''}`
        },
        summary: {
          totalIncome,
          totalExpenses,
          netFlow,
          transactionCount: periodTransactions.length
        },
        transactions: periodTransactions.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        clientSummary: {
          positive: positiveCount,
          negative: negativeCount,
          zero: zeroCount,
          total: Object.keys(periodClientBalances).length
        },
        clientBalances: periodClientBalances,
        generatedAt: new Date().toISOString()
      };

      setStatementData(statement);
      setPreviewMode(true);

      toast({
        title: "Statement Generated",
        description: `Financial statement for ${statement.period.description} has been generated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate financial statement",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadStatement = () => {
    if (!statementData) return;

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      const timestamp = new Date().toISOString().split('T')[0];
      const periodDesc = statementData.period.description.replace(/[^a-zA-Z0-9]/g, '_');

      switch (exportFormat) {
        case 'json':
          content = JSON.stringify(statementData, null, 2);
          filename = `financial_statement_${periodDesc}_${timestamp}.json`;
          mimeType = 'application/json';
          break;

        case 'csv':
          // Generate CSV with transaction details
          const csvHeaders = ['Date', 'Description', 'Type', 'Amount', 'Client', 'Payment Method'];
          const csvRows = statementData.transactions.map((t: any) => {
            const relatedApp = applications.find((app: any) => app.id === t.applicationId);
            const relatedClient = relatedApp ? clients.find((c: any) => c.id === relatedApp.clientId) : null;
            const clientName = relatedClient ? `${relatedClient.firstName} ${relatedClient.lastName}` : 'No client';
            
            return [
              new Date(t.createdAt).toLocaleDateString(),
              `"${t.description}"`,
              t.type.replace('_', ' '),
              parseFloat(t.amount).toFixed(2),
              `"${clientName}"`,
              t.paymentMethod || 'N/A'
            ].join(',');
          });
          
          content = [csvHeaders.join(','), ...csvRows].join('\n');
          filename = `financial_statement_${periodDesc}_${timestamp}.csv`;
          mimeType = 'text/csv';
          break;

        case 'excel':
          // For Excel, we'll use CSV format but with .xlsx extension
          // In a real implementation, you'd use a library like xlsx
          const excelHeaders = ['Date', 'Description', 'Type', 'Amount', 'Client', 'Payment Method'];
          const excelRows = statementData.transactions.map((t: any) => {
            const relatedApp = applications.find((app: any) => app.id === t.applicationId);
            const relatedClient = relatedApp ? clients.find((c: any) => c.id === relatedApp.clientId) : null;
            const clientName = relatedClient ? `${relatedClient.firstName} ${relatedClient.lastName}` : 'No client';
            
            return [
              new Date(t.createdAt).toLocaleDateString(),
              t.description,
              t.type.replace('_', ' '),
              parseFloat(t.amount).toFixed(2),
              clientName,
              t.paymentMethod || 'N/A'
            ].join('\t');
          });
          
          content = [excelHeaders.join('\t'), ...excelRows].join('\n');
          filename = `financial_statement_${periodDesc}_${timestamp}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;

        case 'pdf':
        default:
          // For PDF, we'll create an HTML version that can be printed as PDF
          content = `
<!DOCTYPE html>
<html>
<head>
    <title>Financial Statement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .section { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .transactions { margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
        .total-row { font-weight: bold; border-top: 2px solid #333; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Financial Statement</h1>
        <p>Housing Program Management System</p>
        <p>Period: ${statementData.period.description}</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="summary">
        <div class="section">
            <h3>Income Summary</h3>
            <p>County Reimbursements: <span class="positive">$${statementData.summary.totalIncome.toFixed(2)}</span></p>
            <p>Other Income: $0.00</p>
            <hr>
            <p class="total-row">Total Income: <span class="positive">$${statementData.summary.totalIncome.toFixed(2)}</span></p>
        </div>
        
        <div class="section">
            <h3>Expense Summary</h3>
            <p>Client Expenses: <span class="negative">$${statementData.summary.totalExpenses.toFixed(2)}</span></p>
            <p>Administrative: $0.00</p>
            <hr>
            <p class="total-row">Total Expenses: <span class="negative">$${statementData.summary.totalExpenses.toFixed(2)}</span></p>
        </div>
    </div>
    
    <div class="section">
        <h3>Net Financial Position</h3>
        <p class="total-row ${statementData.summary.netFlow >= 0 ? 'positive' : 'negative'}">
            $${statementData.summary.netFlow.toFixed(2)}
        </p>
    </div>
    
    <div class="transactions">
        <h3>Transaction Details (${statementData.transactions.length} transactions)</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Client</th>
                    <th>Method</th>
                </tr>
            </thead>
            <tbody>
                ${statementData.transactions.map((t: any) => {
                  const relatedApp = applications.find((app: any) => app.id === t.applicationId);
                  const relatedClient = relatedApp ? clients.find((c: any) => c.id === relatedApp.clientId) : null;
                  const clientName = relatedClient ? `${relatedClient.firstName} ${relatedClient.lastName}` : 'No client';
                  
                  return `
                    <tr>
                        <td>${new Date(t.createdAt).toLocaleDateString()}</td>
                        <td>${t.description}</td>
                        <td>${t.type.replace('_', ' ')}</td>
                        <td class="${parseFloat(t.amount) >= 0 ? 'positive' : 'negative'}">
                            $${Math.abs(parseFloat(t.amount)).toFixed(2)}
                        </td>
                        <td>${clientName}</td>
                        <td>${t.paymentMethod || 'N/A'}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="section" style="margin-top: 20px;">
        <h3>Client Balance Summary</h3>
        <p>Clients with Positive Balance: ${statementData.clientSummary.positive}</p>
        <p>Clients with Negative Balance: ${statementData.clientSummary.negative}</p>
        <p>Clients with Zero Balance: ${statementData.clientSummary.zero}</p>
        <p class="total-row">Total Clients: ${statementData.clientSummary.total}</p>
    </div>
</body>
</html>
          `;
          filename = `financial_statement_${periodDesc}_${timestamp}.html`;
          mimeType = 'text/html';
          break;
      }

      // Create and download the file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `Financial statement downloaded as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the financial statement",
        variant: "destructive",
      });
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
          <TabsTrigger value="vendor-management">Vendor Management</TabsTrigger>
          <TabsTrigger value="landlord-payments">Landlord Payments</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Financial Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Priority Financial Actions
                </CardTitle>
                <CardDescription>
                  Urgent items requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Clients Needing Reimbursement */}
                  {financialMetrics.negativeBalanceClients.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-red-800 dark:text-red-200">
                          Clients Need Reimbursement
                        </div>
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {financialMetrics.negativeBalanceClients.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {financialMetrics.negativeBalanceClients.slice(0, 3).map(([clientId, data]) => (
                          <div key={clientId} className="flex justify-between items-center">
                            <span className="text-sm">{data.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-red-600">${Math.abs(data.balance).toFixed(2)}</span>
                              <Button
                                size="sm"
                                onClick={() => handleAddMoney(parseInt(clientId))}
                                className="h-6 px-2 text-xs"
                              >
                                Pay
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overdue Vendor Payments - Clickable */}
                  <div 
                    className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    onClick={() => setOverdueVendorDialogOpen(true)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
                        Overdue Vendor Payments
                        <Eye className="w-4 h-4" />
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {overdueVendorPayments.length}
                      </Badge>
                    </div>
                    <div className="text-sm text-orange-600">
                      ${overdueVendorPayments.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)} in overdue vendor payments require immediate attention
                    </div>
                  </div>

                  {/* Rent Payments Due Today - Clickable */}
                  <div 
                    className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    onClick={() => setRentPaymentsDialogOpen(true)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        Rent Payments Due Today
                        <Eye className="w-4 h-4" />
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {rentPaymentsDue.length}
                      </Badge>
                    </div>
                    <div className="text-sm text-blue-600">
                      ${rentPaymentsDue.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)} in rent payments due to landlords today
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Management Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Quick Financial Actions
                </CardTitle>
                <CardDescription>
                  Common finance department tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="h-16 flex flex-col gap-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => setAddMoneyDialogOpen(true)}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs">Add Client Payment</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col gap-1"
                    onClick={() => window.location.href = '/bill-management'}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs">Process Bills</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col gap-1"
                    onClick={() => window.location.href = '/vendors'}
                  >
                    <Users className="w-5 h-5" />
                    <span className="text-xs">Manage Vendors</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col gap-1"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-xs">Export Reports</span>
                  </Button>
                </div>

                {/* Recent Activity Summary */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Recent Activity</div>
                  <div className="space-y-2">
                    {financialMetrics.currentMonthTransactions.slice(0, 3).map((transaction: any) => (
                      <div key={transaction.id} className="flex justify-between items-center">
                        <span className="text-sm truncate">{transaction.description}</span>
                        <span className={`text-sm font-medium ${parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(transaction.amount) >= 0 ? '+' : ''}${transaction.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Balances Tab */}
        <TabsContent value="client-balances" className="space-y-4">
          {/* Client Balance Management Tools */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {financialMetrics.positiveBalanceClients.length}
                </div>
                <div className="text-sm text-muted-foreground">Positive Balance</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {financialMetrics.negativeBalanceClients.length}
                </div>
                <div className="text-sm text-muted-foreground">Need Reimbursement</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {financialMetrics.zeroBalanceClients.length}
                </div>
                <div className="text-sm text-muted-foreground">Zero Balance</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <Button 
                  className="w-full h-12"
                  onClick={() => setAddMoneyDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment
                </Button>
              </div>
            </Card>
          </div>

          {/* Enhanced Client Balance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Client Financial Management</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Comprehensive client account management and payment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Total Received</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(financialMetrics.clientBalances).map(([clientId, data]) => (
                    <TableRow key={clientId}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{data.name}</div>
                          <div className="text-xs text-muted-foreground">ID: {clientId}</div>
                        </div>
                      </TableCell>
                      <TableCell className={`font-medium text-lg ${data.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${data.balance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ${data.totalReceived?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-red-600 font-medium">
                        ${data.totalSpent?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>{getStatusBadge(data.balance)}</TableCell>
                      <TableCell>
                        {data.lastPayment ? new Date(data.lastPayment).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddMoney(parseInt(clientId))}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Add Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/client-details/${clientId}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bulk Client Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Client Operations</CardTitle>
              <CardDescription>
                Perform actions on multiple clients simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Users className="w-6 h-6" />
                  <span className="text-xs">Bulk Reimbursement</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <FileText className="w-6 h-6" />
                  <span className="text-xs">Generate Statements</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Calendar className="w-6 h-6" />
                  <span className="text-xs">Schedule Payments</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span className="text-xs">Flag Accounts</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Management Tab */}
        <TabsContent value="vendor-management" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outstanding Vendor Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Outstanding Vendor Payments
                </CardTitle>
                <CardDescription>
                  Unpaid vendor bills and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample vendor data - replace with actual vendor query */}
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Healthcare Plus</div>
                      <div className="text-sm text-muted-foreground">
                        Medical services • Due: 3 days
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">$2,450.00</div>
                      <Button size="sm" className="mt-1">Pay Now</Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Mental Health Services</div>
                      <div className="text-sm text-muted-foreground">
                        Counseling services • Due: 7 days
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">$1,800.00</div>
                      <Button size="sm" className="mt-1">Pay Now</Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Community Support Inc</div>
                      <div className="text-sm text-muted-foreground">
                        Support services • Due: 15 days
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-orange-600">$950.00</div>
                      <Button size="sm" variant="outline" className="mt-1">Schedule</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Vendor Payment Summary
                </CardTitle>
                <CardDescription>
                  Monthly vendor expenditure breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Healthcare Services</span>
                    <span className="font-medium">$8,450.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Mental Health</span>
                    <span className="font-medium">$5,200.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Support Services</span>
                    <span className="font-medium">$3,100.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Group Homes</span>
                    <span className="font-medium">$12,800.00</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="font-medium">Total Vendor Payments</span>
                    <span className="font-bold text-blue-600">$29,550.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendor Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex flex-col gap-2">
              <Plus className="w-6 h-6" />
              Add Vendor Payment
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileText className="w-6 h-6" />
              Generate Vendor Report
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Calendar className="w-6 h-6" />
              Schedule Payments
            </Button>
          </div>
        </TabsContent>

        {/* Landlord Payments Tab */}
        <TabsContent value="landlord-payments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Rent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Pending Rent Payments
                </CardTitle>
                <CardDescription>
                  Monthly rent payments to landlords
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample landlord payment data */}
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">ABC Property Management</div>
                      <div className="text-sm text-muted-foreground">
                        Client: Craig Johnson • 1234 Main St
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">$1,200.00</div>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Due Today
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Sunrise Apartments</div>
                      <div className="text-sm text-muted-foreground">
                        Client: Multiple clients • Various units
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">$3,600.00</div>
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Overdue
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Metro Housing LLC</div>
                      <div className="text-sm text-muted-foreground">
                        Client: Sarah Williams • 567 Oak Ave
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">$950.00</div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Paid
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Landlord Payment Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Payment Analytics
                </CardTitle>
                <CardDescription>
                  Landlord payment trends and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-sm font-medium text-green-800 dark:text-green-200">
                      On-Time Payment Rate
                    </div>
                    <div className="text-2xl font-bold text-green-600">92%</div>
                    <div className="text-xs text-green-600">+3% from last month</div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Average Processing Time
                    </div>
                    <div className="text-2xl font-bold text-blue-600">2.3 days</div>
                    <div className="text-xs text-blue-600">-0.5 days improvement</div>
                  </div>

                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Total Monthly Rent
                    </div>
                    <div className="text-2xl font-bold text-orange-600">$45,200</div>
                    <div className="text-xs text-orange-600">23 active leases</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Landlord Management Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="h-16 flex flex-col gap-1">
              <Plus className="w-5 h-5" />
              <span className="text-xs">Process Payment</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-1">
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Schedule Batch</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-1">
              <FileText className="w-5 h-5" />
              <span className="text-xs">Generate Report</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-1">
              <Download className="w-5 h-5" />
              <span className="text-xs">Export Data</span>
            </Button>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Transaction Filters */}
          <div className="flex gap-4 items-center mb-4">
            <div className="flex items-center gap-2">
              <Label>Month:</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthValue = date.toISOString().substring(0, 7);
                    const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    return (
                      <SelectItem key={monthValue} value={monthValue}>
                        {monthLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => setAddMoneyDialogOpen(true)}
              className="ml-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transaction History</span>
                <Badge variant="outline">
                  {financialMetrics.currentMonthTransactions.length} transactions
                </Badge>
              </CardTitle>
              <CardDescription>
                Complete financial transaction log for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financialMetrics.currentMonthTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                  <Button 
                    onClick={() => setAddMoneyDialogOpen(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    Add First Transaction
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Client</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialMetrics.currentMonthTransactions
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((transaction: any) => {
                        const relatedApp = applications.find((app: any) => app.id === transaction.applicationId);
                        const relatedClient = relatedApp ? clients.find((c: any) => c.id === relatedApp.clientId) : null;
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div>
                                <div>{new Date(transaction.createdAt).toLocaleDateString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(transaction.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.type.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell className={`font-medium ${parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {parseFloat(transaction.amount) >= 0 ? '+' : ''}${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                            </TableCell>
                            <TableCell>{transaction.paymentMethod || 'N/A'}</TableCell>
                            <TableCell>
                              {relatedClient ? (
                                <div className="text-sm">
                                  <div className="font-medium">{relatedClient.firstName} {relatedClient.lastName}</div>
                                  <div className="text-muted-foreground">ID: {relatedClient.id}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No client</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Report Generation Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generate Financial Statements
              </CardTitle>
              <CardDescription>
                Create comprehensive financial reports with customizable date ranges and export options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Period Selection */}
                <div className="space-y-2">
                  <Label>Report Period</Label>
                  <Select value={reportPeriod} onValueChange={setReportPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Current Month</SelectItem>
                      <SelectItem value="2">Last 2 Months</SelectItem>
                      <SelectItem value="3">Last 3 Months</SelectItem>
                      <SelectItem value="6">Last 6 Months</SelectItem>
                      <SelectItem value="12">Last 12 Months</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range */}
                {reportPeriod === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input 
                        type="date" 
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input 
                        type="date" 
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Export Format */}
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV File</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Report Actions */}
              <div className="flex gap-3">
                <Button 
                  onClick={generateStatement} 
                  disabled={generatingReport}
                  className="flex items-center gap-2"
                >
                  {generatingReport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate Statement
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={downloadStatement}
                  disabled={!statementData || generatingReport}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download {exportFormat.toUpperCase()}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPreviewMode(!previewMode)}
                  disabled={!statementData}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {previewMode ? 'Hide Preview' : 'Preview Statement'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statement Preview */}
          {previewMode && statementData && (
            <Card>
              <CardHeader>
                <CardTitle>Financial Statement Preview</CardTitle>
                <CardDescription>
                  {reportPeriod === 'custom' 
                    ? `${customStartDate} to ${customEndDate}`
                    : `Last ${reportPeriod} month${reportPeriod !== '1' ? 's' : ''}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-h-96 overflow-y-auto border rounded-lg p-4">
                  {/* Statement Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">Financial Statement</h2>
                    <p className="text-muted-foreground">Housing Program Management System</p>
                    <p className="text-sm">Generated on {new Date().toLocaleDateString()}</p>
                  </div>

                  {/* Summary Section */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Income Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>County Reimbursements:</span>
                          <span className="font-medium text-green-600">
                            ${statementData.summary.totalIncome.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other Income:</span>
                          <span className="font-medium">$0.00</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total Income:</span>
                          <span className="text-green-600">
                            ${statementData.summary.totalIncome.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Expense Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Client Expenses:</span>
                          <span className="font-medium text-red-600">
                            ${statementData.summary.totalExpenses.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Administrative:</span>
                          <span className="font-medium">$0.00</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total Expenses:</span>
                          <span className="text-red-600">
                            ${statementData.summary.totalExpenses.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Position */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Net Financial Position:</span>
                      <span className={`text-xl font-bold ${
                        statementData.summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${statementData.summary.netFlow.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div>
                    <h3 className="font-semibold mb-3">Transaction Details ({statementData.transactions.length} transactions)</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                      {statementData.transactions.slice(0, 10).map((transaction: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">{transaction.description}</span>
                            <span className="text-muted-foreground ml-2">
                              ({new Date(transaction.createdAt).toLocaleDateString()})
                            </span>
                          </div>
                          <span className={`font-medium ${
                            parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {statementData.transactions.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          ... and {statementData.transactions.length - 10} more transactions
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Client Balance Summary */}
                  <div>
                    <h3 className="font-semibold mb-3">Client Balance Summary</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-600">
                          {statementData.clientSummary.positive}
                        </div>
                        <div className="text-sm text-muted-foreground">Positive Balance</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-600">
                          {statementData.clientSummary.negative}
                        </div>
                        <div className="text-sm text-muted-foreground">Negative Balance</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-2xl font-bold">
                          {statementData.clientSummary.zero}
                        </div>
                        <div className="text-sm text-muted-foreground">Zero Balance</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Month Summary</CardTitle>
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

      {/* Overdue Vendor Payments Detail Dialog */}
      <Dialog open={overdueVendorDialogOpen} onOpenChange={setOverdueVendorDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Overdue Vendor Payments Details
            </DialogTitle>
            <DialogDescription>
              {overdueVendorPayments.length} payments totaling ${overdueVendorPayments.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)} require immediate attention
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Past Due</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueVendorPayments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.vendor}</div>
                        <div className="text-sm text-muted-foreground">{payment.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{new Date(payment.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={`${payment.daysPastDue > 5 ? 'bg-red-100 text-red-800' : 
                        payment.daysPastDue > 2 ? 'bg-orange-100 text-orange-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                        {payment.daysPastDue} days
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{payment.invoiceNumber}</TableCell>
                    <TableCell>
                      <Badge className={`${payment.priority === 'high' ? 'bg-red-100 text-red-800' : 
                        payment.priority === 'medium' ? 'bg-orange-100 text-orange-800' : 
                        'bg-green-100 text-green-800'}`}>
                        {payment.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSettlePayment(payment)}
                          className="h-8 px-3"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Settle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Comment
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverdueVendorDialogOpen(false)}>
              Close
            </Button>
            <Button>
              Bulk Actions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rent Payments Due Today Detail Dialog */}
      <Dialog open={rentPaymentsDialogOpen} onOpenChange={setRentPaymentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Rent Payments Due Today
            </DialogTitle>
            <DialogDescription>
              {rentPaymentsDue.length} rent payments totaling ${rentPaymentsDue.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)} due to landlords today
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Lease ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentPaymentsDue.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">{payment.property}</div>
                    </TableCell>
                    <TableCell>{payment.landlord}</TableCell>
                    <TableCell>
                      <div className="font-medium">{payment.client}</div>
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{new Date(payment.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-sm">{payment.leaseId}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSettlePayment(payment)}
                          className="h-8 px-3"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Pay Rent
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Comment
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRentPaymentsDialogOpen(false)}>
              Close
            </Button>
            <Button>
              Process All Payments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Payment Dialog */}
      <Dialog open={settlePaymentDialogOpen} onOpenChange={setSettlePaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Payment</DialogTitle>
            <DialogDescription>
              Mark this payment as settled and add settlement details
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={settleForm.handleSubmit(onSubmitSettlePayment)} className="space-y-4">
            {selectedPayment && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{selectedPayment.vendor || selectedPayment.landlord}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedPayment.description || selectedPayment.property}
                </div>
                <div className="font-medium text-lg mt-1">
                  ${selectedPayment.amount.toFixed(2)}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="settle-amount">Settlement Amount</Label>
              <Input
                id="settle-amount"
                {...settleForm.register("settledAmount")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settle-method">Payment Method</Label>
              <Select value={settleForm.watch("paymentMethod")} onValueChange={(value) => settleForm.setValue("paymentMethod", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="melio">Melio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settleForm.watch("paymentMethod") === "check" && (
              <div className="space-y-2">
                <Label htmlFor="check-number">Check Number</Label>
                <Input
                  id="check-number"
                  {...settleForm.register("checkNumber")}
                  placeholder="Enter check number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="settle-date">Settlement Date</Label>
              <Input
                id="settle-date"
                type="date"
                {...settleForm.register("settledDate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settle-comments">Comments (Optional)</Label>
              <Textarea
                id="settle-comments"
                {...settleForm.register("comments")}
                placeholder="Add any notes about this settlement..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettlePaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={settlePaymentMutation.isPending}>
                {settlePaymentMutation.isPending ? "Processing..." : "Settle Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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