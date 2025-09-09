import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Banknote, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const countyPaymentSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Please enter a valid amount greater than 0"),
  expectedAmount: z.string().min(1, "Expected amount is required"),
  county: z.string().min(1, "County is required"),
  paymentMethod: z.enum(["check", "direct_deposit", "wire_transfer"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type CountyPaymentData = z.infer<typeof countyPaymentSchema>;

interface CountyPaymentFormProps {
  clientId: number;
  clientName: string;
  monthlyIncome: number;
  county?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CountyPaymentForm({
  clientId,
  clientName,
  monthlyIncome,
  county = "",
  onClose,
  onSuccess,
}: CountyPaymentFormProps) {
  const { toast } = useToast();

  const form = useForm<CountyPaymentData>({
    resolver: zodResolver(countyPaymentSchema),
    defaultValues: {
      amount: "1242",
      expectedAmount: monthlyIncome.toString(),
      county: county,
      paymentMethod: "check",
      referenceNumber: "",
      notes: "",
    },
  });

  const watchedAmount = form.watch("amount");
  const watchedExpected = form.watch("expectedAmount");
  
  const actualAmount = parseFloat(watchedAmount || "0");
  const expectedAmount = parseFloat(watchedExpected || "0");
  const difference = actualAmount - expectedAmount;

  const createCountyPaymentMutation = useMutation({
    mutationFn: async (data: CountyPaymentData) => {
      // Create pool fund deposit
      const poolFundData = {
        transactionId: 1, // Will be set by backend
        amount: data.amount,
        type: "deposit",
        description: `County payment received - ${data.paymentMethod} ${data.referenceNumber ? `(${data.referenceNumber})` : ''}`,
        county: data.county,
      };

      const poolFundResponse = await fetch("/api/pool-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...poolFundData,
          clientId,
        }),
      });

      if (!poolFundResponse.ok) {
        throw new Error("Failed to record county payment");
      }

      // If there's a difference, create a note about it
      if (Math.abs(difference) > 0.01) {
        const noteData = {
          clientId,
          content: `County Payment Variance: Expected $${expectedAmount.toFixed(2)}, Received $${actualAmount.toFixed(2)}. ${difference > 0 ? 'Surplus' : 'Deficit'}: $${Math.abs(difference).toFixed(2)}. ${data.notes || ''}`,
          category: "financial",
        };

        await fetch("/api/clients/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteData),
        });
      }

      return poolFundResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/pool-fund`] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/notes`] });
      
      toast({
        title: "County Payment Recorded",
        description: `Successfully recorded $${actualAmount.toFixed(2)} payment from ${form.getValues("county")} county.`,
      });
      
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error("County payment error:", error);
      toast({
        title: "Error",
        description: `Failed to record county payment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CountyPaymentData) => {
    createCountyPaymentMutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            County Payment Received
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Record payment received from county for {clientName}
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expectedAmount">Expected Amount</Label>
              <Input
                id="expectedAmount"
                type="text"
                {...form.register("expectedAmount")}
                className="bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Monthly income</p>
            </div>
            <div>
              <Label htmlFor="amount">Amount Received</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0.00"
                {...form.register("amount")}
                onChange={(e) => {
                  // Allow only numbers and decimal point
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  // Ensure only one decimal point
                  const parts = value.split('.');
                  if (parts.length > 2) {
                    return;
                  }
                  form.setValue("amount", value);
                }}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* Variance Display */}
          {actualAmount > 0 && expectedAmount > 0 && Math.abs(difference) > 0.01 && (
            <div className={`p-3 rounded-lg border ${
              difference > 0 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2">
                {difference > 0 ? (
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span className={`font-medium text-sm ${
                  difference > 0 ? 'text-blue-700' : 'text-yellow-700'
                }`}>
                  {difference > 0 ? 'Surplus' : 'Deficit'}: ${Math.abs(difference).toFixed(2)}
                </span>
              </div>
              <p className={`text-xs mt-1 ${
                difference > 0 ? 'text-blue-600' : 'text-yellow-600'
              }`}>
                {difference > 0 
                  ? 'County sent more than expected - credit available'
                  : 'County sent less than expected - follow up required'
                }
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="county">County</Label>
            <Input
              id="county"
              placeholder="e.g., Hennepin County"
              {...form.register("county")}
            />
            {form.formState.errors.county && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.county.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select 
              value={form.watch("paymentMethod")} 
              onValueChange={(value) => form.setValue("paymentMethod", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
            <Input
              id="referenceNumber"
              placeholder="Check #, Transaction ID, etc."
              {...form.register("referenceNumber")}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this payment..."
              rows={2}
              {...form.register("notes")}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={createCountyPaymentMutation.isPending}
              className="flex-1"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {createCountyPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}