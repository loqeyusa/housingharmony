import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPoolFundSchema, type InsertPoolFund } from "@shared/schema";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, DollarSign, User, Wallet } from "lucide-react";

interface ClientTransactionFormProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ClientTransactionForm({ 
  clientId, 
  clientName, 
  onClose, 
  onSuccess 
}: ClientTransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: poolFundBalance } = useQuery({
    queryKey: ["/api/pool-fund/balance"],
  });

  const { data: clientBalance } = useQuery({
    queryKey: ["/api/clients", clientId, "balance"],
    enabled: !!clientId,
  });

  const { data: client } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const form = useForm<InsertPoolFund>({
    resolver: zodResolver(insertPoolFundSchema),
    defaultValues: {
      transactionId: 1, // This will be set by the backend
      amount: "0.00",
      type: "withdrawal",
      description: "",
      clientId: clientId,
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: InsertPoolFund) => {
      // First create the base transaction
      const transactionData = {
        type: data.type === "deposit" ? "pool_fund_deposit" : "pool_fund_withdrawal",
        amount: data.amount,
        description: data.description,
        applicationId: null,
      };

      const transactionResponse = await apiRequest("POST", "/api/transactions", transactionData);
      const transaction = await transactionResponse.json();

      // Then create the pool fund entry
      const poolFundData = {
        ...data,
        transactionId: transaction.id,
        clientId: clientId,
        county: client?.site || "Unknown",
      };

      const poolFundResponse = await apiRequest("POST", "/api/pool-fund", poolFundData);
      return await poolFundResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions?clientId=${clientId}`] });
      toast({
        title: "Success",
        description: `Transaction recorded successfully for ${clientName}!`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPoolFund) => {
    createTransactionMutation.mutate(data);
  };

  const currentBalance = poolFundBalance?.balance || 0;
  const currentClientBalance = clientBalance?.balance || 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Add Transaction for {clientName}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Balance Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <SelectItem value="deposit">Deposit to Pool Fund</SelectItem>
                          <SelectItem value="withdrawal">Withdrawal from Pool Fund</SelectItem>
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
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
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
                        placeholder="Enter transaction description..."
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
                  disabled={createTransactionMutation.isPending}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}