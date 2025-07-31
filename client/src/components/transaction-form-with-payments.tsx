import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, CreditCard, CheckSquare, Smartphone, Banknote, FileText, Zap } from "lucide-react";
import type { Client, Application } from "@shared/schema";

const transactionSchema = z.object({
  type: z.string().min(1, "Transaction type is required"),
  subType: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required"),
  month: z.string().min(1, "Month is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  checkNumber: z.string().optional(),
  confirmationNumber: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
  applicationId: z.number().optional(),
  clientId: z.number(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

// Payment method options
const PAYMENT_METHODS = [
  { value: "check", label: "Check", icon: CheckSquare },
  { value: "ach", label: "ACH Transfer", icon: Banknote },
  { value: "melio", label: "Melio", icon: Smartphone },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "money_order", label: "Money Order", icon: FileText },
  { value: "wire_transfer", label: "Wire Transfer", icon: Zap },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
];

// Transaction types with enhanced categories
const TRANSACTION_TYPES = [
  { value: "rent", label: "Rent Payment" },
  { value: "utility_electric", label: "Utility - Electric" },
  { value: "utility_gas", label: "Utility - Gas" },
  { value: "utility_water", label: "Utility - Water" },
  { value: "utility_internet", label: "Utility - Internet" },
  { value: "utility_phone", label: "Utility - Phone" },
  { value: "admin_fee", label: "Administrative Fee" },
  { value: "late_fee", label: "Late Fee" },
  { value: "county_reimbursement", label: "County Reimbursement" },
  { value: "pool_fund_deposit", label: "Pool Fund Deposit" },
  { value: "pool_fund_withdrawal", label: "Pool Fund Withdrawal" },
  { value: "misc", label: "Miscellaneous" },
];

interface TransactionFormWithPaymentsProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TransactionFormWithPayments({ 
  clientId, 
  clientName, 
  onClose, 
  onSuccess 
}: TransactionFormWithPaymentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const { data: client } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: [`/api/applications?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      clientId,
      type: "",
      subType: "",
      amount: "",
      description: "",
      month: new Date().toISOString().substring(0, 7), // YYYY-MM format
      paymentMethod: "",
      checkNumber: "",
      confirmationNumber: "",
      paymentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      notes: "",
      applicationId: applications.find(app => app.status === "approved")?.id,
    },
  });

  const watchPaymentMethod = form.watch("paymentMethod");
  const watchTransactionType = form.watch("type");

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const response = await apiRequest("POST", "/api/transactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/balance`] });
      toast({
        title: "Success",
        description: "Transaction recorded successfully!",
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    // Convert amount to decimal format for negative transactions
    const isNegativeTransaction = ['rent', 'utility_electric', 'utility_gas', 'utility_water', 'utility_internet', 'utility_phone', 'admin_fee', 'late_fee', 'pool_fund_withdrawal'].includes(data.type);
    const amount = isNegativeTransaction ? (-Math.abs(parseFloat(data.amount))).toString() : data.amount;
    
    createTransactionMutation.mutate({
      ...data,
      amount,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Record Transaction - {clientName}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSACTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500">$</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          className="pl-8"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter transaction description" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Month</FormLabel>
                    <FormControl>
                      <Input 
                        type="month"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setShowPaymentDetails(["check", "ach", "melio", "wire_transfer", "credit_card"].includes(value));
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => {
                          const Icon = method.icon;
                          return (
                            <SelectItem key={method.value} value={method.value}>
                              <div className="flex items-center space-x-2">
                                <Icon className="w-4 h-4" />
                                <span>{method.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Details Section */}
            {showPaymentDetails && (
              <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4">
                <h4 className="font-medium">Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {watchPaymentMethod === "check" && (
                    <FormField
                      control={form.control}
                      name="checkNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter check number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {["ach", "melio", "wire_transfer", "credit_card"].includes(watchPaymentMethod) && (
                    <FormField
                      control={form.control}
                      name="confirmationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmation Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter confirmation number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional notes about this transaction" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTransactionMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}