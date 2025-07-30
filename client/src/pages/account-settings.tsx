import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, DollarSign, Plus, Settings, Trash2, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const recurringBillSchema = z.object({
  clientId: z.number(),
  propertyId: z.number().optional(),
  billType: z.string().min(1, "Bill type is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDay: z.number().min(1).max(31),
  isActive: z.boolean(),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  landlordName: z.string().optional(),
  landlordPhone: z.string().optional(),
  landlordEmail: z.string().optional(),
});

type RecurringBillFormData = z.infer<typeof recurringBillSchema>;

export default function AccountSettings() {
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"], 
  });

  const { data: recurringBills = [] } = useQuery({
    queryKey: ["/api/recurring-bills", selectedClient],
    queryFn: () => apiRequest(`/api/recurring-bills${selectedClient ? `?clientId=${selectedClient}` : ""}`),
  });

  const form = useForm<RecurringBillFormData>({
    resolver: zodResolver(recurringBillSchema),
    defaultValues: {
      billType: "rent",
      dueDay: 1,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const createBillMutation = useMutation({
    mutationFn: (data: RecurringBillFormData) => 
      fetch("/api/recurring-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-bills"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Recurring bill created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create recurring bill",
        variant: "destructive",
      });
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecurringBillFormData> }) =>
      fetch(`/api/recurring-bills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-bills"] });
      setIsDialogOpen(false);
      setEditingBill(null);
      form.reset();
      toast({
        title: "Success",
        description: "Recurring bill updated successfully",
      });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/recurring-bills/${id}`, {
        method: "DELETE",
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-bills"] });
      toast({
        title: "Success",
        description: "Recurring bill deleted successfully",
      });
    },
  });

  const generateMonthlyBillsMutation = useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      fetch("/api/recurring-bills/generate-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      }).then(res => res.json()),
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message,
      });
    },
  });

  const onSubmit = (data: RecurringBillFormData) => {
    if (editingBill) {
      updateBillMutation.mutate({ id: (editingBill as any).id, data });
    } else {
      createBillMutation.mutate(data);
    }
  };

  const handleEdit = (bill: any) => {
    setEditingBill(bill);
    form.reset({
      clientId: bill.clientId,
      propertyId: bill.propertyId || undefined,
      billType: bill.billType,
      amount: bill.amount,
      dueDay: bill.dueDay,
      isActive: bill.isActive,
      startDate: bill.startDate,
      endDate: bill.endDate || undefined,
      description: bill.description || "",
      landlordName: bill.landlordName || "",
      landlordPhone: bill.landlordPhone || "",
      landlordEmail: bill.landlordEmail || "",
    });
    setIsDialogOpen(true);
  };

  const handleGenerateCurrentMonth = () => {
    const now = new Date();
    generateMonthlyBillsMutation.mutate({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage recurring bills and account configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateCurrentMonth} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Generate This Month's Bills
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Recurring Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBill ? "Edit Recurring Bill" : "Add Recurring Bill"}
                </DialogTitle>
                <DialogDescription>
                  Set up automatic monthly charges that will deduct from client accounts.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientId">Client *</Label>
                    <Select
                      value={form.watch("clientId")?.toString() || ""}
                      onValueChange={(value) => form.setValue("clientId", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="propertyId">Property (Optional)</Label>
                    <Select
                      value={form.watch("propertyId")?.toString() || ""}
                      onValueChange={(value) => form.setValue("propertyId", value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No property</SelectItem>
                        {properties.map((property: any) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="billType">Bill Type *</Label>
                    <Select
                      value={form.watch("billType")}
                      onValueChange={(value) => form.setValue("billType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label htmlFor="dueDay">Due Day *</Label>
                    <Input
                      {...form.register("dueDay", { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      {...form.register("startDate")}
                      type="date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      {...form.register("endDate")}
                      type="date"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    {...form.register("description")}
                    placeholder="Additional details about this recurring bill"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Landlord Information (for rent bills)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="landlordName">Landlord Name</Label>
                      <Input
                        {...form.register("landlordName")}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="landlordPhone">Phone</Label>
                      <Input
                        {...form.register("landlordPhone")}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="landlordEmail">Email</Label>
                      <Input
                        {...form.register("landlordEmail")}
                        type="email"
                        placeholder="landlord@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.watch("isActive")}
                    onCheckedChange={(checked) => form.setValue("isActive", checked)}
                  />
                  <Label>Active</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createBillMutation.isPending || updateBillMutation.isPending}>
                    {editingBill ? "Update" : "Create"} Recurring Bill
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Client Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Filter by Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedClient?.toString() || ""}
            onValueChange={(value) => setSelectedClient(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All clients</SelectItem>
              {clients.map((client: any) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.firstName} {client.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Recurring Bills List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Recurring Bills
          </CardTitle>
          <CardDescription>
            Automatic monthly charges that deduct from client accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurringBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recurring bills found. Create one to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {recurringBills.map((bill: any) => {
                const client = clients.find((c: any) => c.id === bill.clientId);
                const property = properties.find((p: any) => p.id === bill.propertyId);
                
                return (
                  <div key={bill.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={bill.isActive ? "default" : "secondary"}>
                            {bill.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="font-medium capitalize">{bill.billType}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-mono">${bill.amount}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Client: {client ? `${client.firstName} ${client.lastName}` : "Unknown"}
                          {property && (
                            <>
                              <span className="mx-2">•</span>
                              Property: {property.address}
                            </>
                          )}
                        </div>
                        {bill.description && (
                          <div className="text-sm">{bill.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(bill)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBillMutation.mutate(bill.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Due Day</div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {bill.dueDay}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Start Date</div>
                        <div>{new Date(bill.startDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">End Date</div>
                        <div>{bill.endDate ? new Date(bill.endDate).toLocaleDateString() : "Ongoing"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Amount</div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {bill.amount}
                        </div>
                      </div>
                    </div>

                    {bill.landlordName && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">Landlord</div>
                        <div className="text-sm">
                          {bill.landlordName}
                          {bill.landlordPhone && <span className="ml-2">• {bill.landlordPhone}</span>}
                          {bill.landlordEmail && <span className="ml-2">• {bill.landlordEmail}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}