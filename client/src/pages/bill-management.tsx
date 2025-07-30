import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Check, Clock, CreditCard, DollarSign, FileText, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const paymentSchema = z.object({
  paymentMethod: z.string().default("check"),
  checkNumber: z.string().optional(),
  checkDate: z.string().optional(),
  paymentDate: z.string(),
  paymentNotes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function BillManagement() {
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: billInstances = [] } = useQuery({
    queryKey: ["/api/recurring-bill-instances", selectedStatus],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "check",
      paymentDate: new Date().toISOString().split('T')[0],
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentFormData }) =>
      fetch(`/api/recurring-bill-instances/${id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-bill-instances"] });
      setPaymentDialogOpen(false);
      setSelectedBill(null);
      form.reset();
      toast({
        title: "Success",
        description: "Bill marked as paid successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark bill as paid",
        variant: "destructive",
      });
    },
  });

  const onSubmitPayment = (data: PaymentFormData) => {
    if (selectedBill) {
      markPaidMutation.mutate({ id: selectedBill.id, data });
    }
  };

  const handleMarkPaid = (bill: any) => {
    setSelectedBill(bill);
    form.reset({
      paymentMethod: "check",
      paymentDate: new Date().toISOString().split('T')[0],
    });
    setPaymentDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients.find((c: any) => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const pendingBills = billInstances.filter((bill: any) => bill.status === "pending");
  const paidBills = billInstances.filter((bill: any) => bill.status === "paid");
  const overdueBills = billInstances.filter((bill: any) => 
    bill.status === "pending" && new Date(bill.dueDate) < new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bill Management</h1>
          <p className="text-muted-foreground">
            Track and manage pending recurring bill payments
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingBills.length}</div>
            <div className="text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{overdueBills.length}</div>
            <div className="text-muted-foreground">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{paidBills.length}</div>
            <div className="text-muted-foreground">Paid This Month</div>
          </div>
        </div>
      </div>

      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList>
          <TabsTrigger value="pending">Pending Bills</TabsTrigger>
          <TabsTrigger value="paid">Paid Bills</TabsTrigger>
          <TabsTrigger value="">All Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Bills
              </CardTitle>
              <CardDescription>
                Bills that have been generated but not yet paid to landlords
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingBills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending bills found.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBills.map((bill: any) => {
                    const isOverdue = new Date(bill.dueDate) < new Date();
                    
                    return (
                      <div key={bill.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(isOverdue ? "overdue" : "pending")}>
                                {isOverdue ? "Overdue" : "Pending"}
                              </Badge>
                              <span className="font-medium capitalize">{bill.recurringBill?.billType || "Bill"}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-mono text-lg">${bill.amount}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Client: {getClientName(bill.clientId)}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleMarkPaid(bill)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Mark Paid
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Due Date</div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(bill.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Amount</div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {bill.amount}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Generated</div>
                            <div>{new Date(bill.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Days {isOverdue ? 'Overdue' : 'Remaining'}</div>
                            <div className={isOverdue ? "text-red-600 font-medium" : ""}>
                              {Math.abs(Math.ceil((new Date(bill.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                Paid Bills
              </CardTitle>
              <CardDescription>
                Bills that have been marked as paid with payment details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paidBills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No paid bills found.
                </div>
              ) : (
                <div className="space-y-4">
                  {paidBills.map((bill: any) => (
                    <div key={bill.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor("paid")}>
                              Paid
                            </Badge>
                            <span className="font-medium capitalize">{bill.recurringBill?.billType || "Bill"}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-mono text-lg">${bill.amount}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Client: {getClientName(bill.clientId)}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">Paid on {new Date(bill.paymentDate).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            {bill.paymentMethod === "check" && bill.checkNumber && `Check #${bill.checkNumber}`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Due Date</div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(bill.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Payment Method</div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {bill.paymentMethod}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Check Number</div>
                          <div>{bill.checkNumber || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Check Date</div>
                          <div>{bill.checkDate ? new Date(bill.checkDate).toLocaleDateString() : "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Paid At</div>
                          <div>{new Date(bill.paidAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {bill.paymentNotes && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground mb-1">Payment Notes</div>
                          <div className="text-sm">{bill.paymentNotes}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                All Bills
              </CardTitle>
              <CardDescription>
                Complete history of all recurring bill instances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billInstances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bills found.
                </div>
              ) : (
                <div className="space-y-4">
                  {billInstances.map((bill: any) => {
                    const isOverdue = bill.status === "pending" && new Date(bill.dueDate) < new Date();
                    
                    return (
                      <div key={bill.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(isOverdue ? "overdue" : bill.status)}>
                                {isOverdue ? "Overdue" : bill.status}
                              </Badge>
                              <span className="font-medium capitalize">{bill.recurringBill?.billType || "Bill"}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-mono text-lg">${bill.amount}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Client: {getClientName(bill.clientId)}
                            </div>
                          </div>
                          {bill.status === "pending" && (
                            <Button
                              onClick={() => handleMarkPaid(bill)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Due Date</div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(bill.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Amount</div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {bill.amount}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Status</div>
                            <div className="capitalize">{bill.status}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">
                              {bill.status === "paid" ? "Paid Date" : "Generated"}
                            </div>
                            <div>
                              {bill.status === "paid" && bill.paymentDate
                                ? new Date(bill.paymentDate).toLocaleDateString()
                                : new Date(bill.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
            <DialogDescription>
              Record payment details for this recurring bill.
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <form onSubmit={form.handleSubmit(onSubmitPayment)} className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">{getClientName(selectedBill.clientId)}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedBill.recurringBill?.billType || "Bill"} • ${selectedBill.amount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Due: {new Date(selectedBill.dueDate).toLocaleDateString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkNumber">Check Number</Label>
                    <Input
                      {...form.register("checkNumber")}
                      placeholder="1234"
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkDate">Check Date</Label>
                    <Input
                      {...form.register("checkDate")}
                      type="date"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="paymentNotes">Payment Notes (Optional)</Label>
                <Textarea
                  {...form.register("paymentNotes")}
                  placeholder="Additional notes about this payment"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={markPaidMutation.isPending}>
                  Mark as Paid
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}