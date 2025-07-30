import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, DollarSign, User, Wallet, Home, Receipt, Zap, Phone, Globe, Shirt, HelpCircle } from "lucide-react";
import type { Client, Application, Property } from "@shared/schema";

// Predefined transaction types
const TRANSACTION_TYPES = [
  {
    id: "rent",
    label: "Rent",
    description: "Monthly rent payment",
    icon: Home,
    defaultAmount: 0, // Will be populated from property
    category: "housing"
  },
  {
    id: "utility",
    label: "Utility",
    description: "Water, gas, electricity",
    icon: Zap,
    defaultAmount: 120.00,
    category: "utility"
  },
  {
    id: "phone",
    label: "Phone",
    description: "Mobile phone service",
    icon: Phone,
    defaultAmount: 50.00,
    category: "communication"
  },
  {
    id: "internet",
    label: "Internet",
    description: "Internet service",
    icon: Globe,
    defaultAmount: 60.00,
    category: "communication"
  },
  {
    id: "laundry",
    label: "Laundry",
    description: "Laundry services",
    icon: Shirt,
    defaultAmount: 30.00,
    category: "household"
  },
  {
    id: "misc",
    label: "Miscellaneous",
    description: "Other household expenses",
    icon: Receipt,
    defaultAmount: 0,
    category: "household"
  },
  {
    id: "other",
    label: "Other",
    description: "Other expenses",
    icon: HelpCircle,
    defaultAmount: 0,
    category: "other"
  }
];

const transactionSchema = z.object({
  transactions: z.array(z.object({
    type: z.string(),
    amount: z.string(),
    description: z.string(),
    selected: z.boolean(),
    month: z.string(), // YYYY-MM format
  })),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface ClientTransactionFormEnhancedProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ClientTransactionFormEnhanced({ 
  clientId, 
  clientName, 
  onClose, 
  onSuccess 
}: ClientTransactionFormEnhancedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  
  const { data: client } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: [`/api/applications?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: poolFundBalance } = useQuery({
    queryKey: client?.site ? ["/api/pool-fund/balance", client.site] : ["/api/pool-fund/balance"],
    enabled: !!client,
  });

  const { data: clientBalance } = useQuery({
    queryKey: ["/api/clients", clientId, "balance"],
    enabled: !!clientId,
  });

  // Get client's current property and rent amount
  const getClientRentAmount = () => {
    const approvedApplication = applications.find(app => app.status === "approved");
    if (approvedApplication) {
      const property = properties.find(prop => prop.id === approvedApplication.propertyId);
      return property ? parseFloat(property.rentAmount) : 0;
    }
    return 0;
  };

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Initialize form with transaction types
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transactions: TRANSACTION_TYPES.map(type => ({
        type: type.id,
        amount: type.id === "rent" ? getClientRentAmount().toFixed(2) : type.defaultAmount.toFixed(2),
        description: type.description,
        selected: false,
        month: getCurrentMonth(),
      })),
      notes: "",
    },
  });

  // Update rent amount when applications or properties change
  useEffect(() => {
    const rentAmount = getClientRentAmount();
    if (rentAmount > 0) {
      const currentTransactions = form.getValues("transactions");
      const updatedTransactions = currentTransactions.map(t => 
        t.type === "rent" ? { ...t, amount: rentAmount.toFixed(2) } : t
      );
      form.setValue("transactions", updatedTransactions);
    }
  }, [applications, properties, form]);

  const createTransactionsMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const selectedTxns = data.transactions.filter(t => t.selected);
      const results = [];

      for (const txn of selectedTxns) {
        // Create transaction entry with month information
        const transactionData = {
          type: `${txn.type}_payment`,
          amount: txn.amount,
          description: `${txn.description} - ${clientName} (${txn.month})${data.notes ? ` (${data.notes})` : ''}`,
          applicationId: applications.find(app => app.status === "approved")?.id || null,
          month: txn.month,
        };

        const transactionResponse = await apiRequest("POST", "/api/transactions", transactionData);
        const transaction = await transactionResponse.json();

        // Create pool fund withdrawal for the transaction
        const poolFundData = {
          transactionId: transaction.id,
          amount: txn.amount,
          type: "withdrawal",
          description: `${txn.description} payment for ${clientName} (${txn.month})`,
          clientId: clientId,
          county: client?.site || "Unknown",
          month: txn.month,
        };

        const poolFundResponse = await apiRequest("POST", "/api/pool-fund", poolFundData);
        const poolFund = await poolFundResponse.json();

        results.push({ transaction, poolFund });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund/balance"] });
      if (client?.site) {
        queryClient.invalidateQueries({ queryKey: ["/api/pool-fund/balance", client.site] });
        queryClient.invalidateQueries({ queryKey: ["/api/pool-fund/county", client.site] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund/summary/counties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions?clientId=${clientId}`] });
      
      toast({
        title: "Success",
        description: `${results.length} transaction(s) recorded successfully for ${clientName}!`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transactions",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    const selectedCount = data.transactions.filter(t => t.selected).length;
    if (selectedCount === 0) {
      toast({
        title: "No transactions selected",
        description: "Please select at least one transaction type.",
        variant: "destructive",
      });
      return;
    }
    createTransactionsMutation.mutate(data);
  };

  const toggleTransaction = (index: number) => {
    const currentTransactions = form.getValues("transactions");
    const updatedTransactions = [...currentTransactions];
    updatedTransactions[index].selected = !updatedTransactions[index].selected;
    form.setValue("transactions", updatedTransactions);
    
    // Update selected transactions state for UI
    const selectedTypes = updatedTransactions.filter(t => t.selected).map(t => t.type);
    setSelectedTransactions(selectedTypes);
  };



  const currentBalance = (poolFundBalance as any)?.balance || 0;
  const currentClientBalance = (clientBalance as any)?.balance || 0;
  const selectedCount = selectedTransactions.length;
  const totalAmount = form.getValues("transactions")
    .filter(t => t.selected)
    .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Add Transactions for {clientName}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Balance Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Pool Fund Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-green-600">
                  ${currentBalance.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {client?.site ? `${client.site} County` : "No County Assigned"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-blue-600">
                  ${currentClientBalance.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Transaction Total
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-purple-600">
                  ${totalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedCount} selected
                </div>
              </CardContent>
            </Card>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Transaction Types Grid */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Select Transaction Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TRANSACTION_TYPES.map((type, index) => {
                    const transaction = form.watch(`transactions.${index}`);
                    const Icon = type.icon;
                    
                    return (
                      <Card key={type.id} className={`cursor-pointer transition-all ${
                        transaction.selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={transaction.selected}
                              onCheckedChange={() => toggleTransaction(index)}
                            />
                            <Icon className="h-5 w-5 text-gray-600" />
                            <div className="flex-1">
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-gray-500">{type.description}</div>
                            </div>
                            <div className="text-right space-y-2">
                              <div>
                                <div className="text-sm text-gray-500">Amount</div>
                                <FormField
                                  control={form.control}
                                  name={`transactions.${index}.amount`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...field}
                                          className="w-24 h-8 text-right"
                                          placeholder="0.00"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Month</div>
                                <FormField
                                  control={form.control}
                                  name={`transactions.${index}.month`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger className="w-32 h-8">
                                            <SelectValue placeholder="Select month" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {/* Generate months for current year and next year */}
                                            {Array.from({ length: 24 }, (_, i) => {
                                              const date = new Date();
                                              date.setMonth(date.getMonth() - 12 + i);
                                              const year = date.getFullYear();
                                              const month = date.getMonth() + 1;
                                              const value = `${year}-${String(month).padStart(2, '0')}`;
                                              const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                                              return (
                                                <SelectItem key={value} value={value}>
                                                  {label}
                                                </SelectItem>
                                              );
                                            })}
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional notes about these transactions..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTransactionsMutation.isPending || selectedCount === 0}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {createTransactionsMutation.isPending ? 
                    "Recording..." : 
                    `Record ${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}`
                  }
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}