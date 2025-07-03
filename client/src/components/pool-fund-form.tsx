import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPoolFundSchema, type InsertPoolFund, type Client, type Transaction } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface PoolFundFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PoolFundForm({ onClose, onSuccess }: PoolFundFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: poolFundBalance } = useQuery({
    queryKey: ["/api/pool-fund/balance"],
  });

  const form = useForm<InsertPoolFund>({
    resolver: zodResolver(insertPoolFundSchema),
    defaultValues: {
      transactionId: 1, // This will be set by the backend
      amount: "0.00",
      type: "withdrawal",
      description: "",
    },
  });

  const createPoolFundMutation = useMutation({
    mutationFn: async (data: InsertPoolFund) => {
      // First create the base transaction
      const transactionData = {
        type: "pool_fund_withdrawal",
        amount: data.amount,
        description: data.description,
        applicationId: null,
      };

      const transactionResponse = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });
      
      if (!transactionResponse.ok) {
        throw new Error("Failed to create transaction");
      }
      
      const transaction = await transactionResponse.json();

      // Then create the pool fund entry
      const poolFundData = {
        ...data,
        transactionId: transaction.id,
      };

      const response = await fetch("/api/pool-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(poolFundData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create pool fund entry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Pool fund transaction recorded successfully!",
      });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record pool fund transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPoolFund) => {
    createPoolFundMutation.mutate(data);
  };

  const currentBalance = (poolFundBalance as any)?.balance || 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Pool Fund Transaction</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Current Pool Fund Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ${currentBalance.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <SelectItem value="withdrawal">Withdrawal (Purchase Supplies)</SelectItem>
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
                        max={currentBalance}
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiary Client (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client who will benefit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No specific client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.firstName} {client.lastName}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what supplies were purchased or what the funds were used for..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Pool Fund Guidelines:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Pool fund contains surplus money from county reimbursements</li>
                <li>• Funds can be used to purchase supplies for any client</li>
                <li>• All withdrawals must be documented with clear descriptions</li>
                <li>• Consider specifying which client benefits when applicable</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPoolFundMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {createPoolFundMutation.isPending ? "Recording..." : "Record Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
