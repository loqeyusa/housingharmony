import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  Plus,
  Eye,
  Edit,
  Home,
  Banknote
} from "lucide-react";
import type { Client, HousingSupport, InsertHousingSupport } from "@shared/schema";

const housingSupportSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  propertyId: z.number().optional(),
  month: z.string().min(1, "Month is required"),
  rentAmount: z.string().min(1, "Rent amount is required"),
  subsidyAward: z.string().min(1, "Subsidy award is required"),
  subsidyReceived: z.string().min(1, "Subsidy received is required"),
  clientObligation: z.string().min(1, "Client obligation is required"),
  clientPaid: z.string().default("0.00"),
  electricityFee: z.string().default("0.00"),
  adminFee: z.string().min(1, "Admin fee is required"),
  rentLateFee: z.string().default("0.00"),
  notes: z.string().optional(),
});

type HousingSupportFormData = z.infer<typeof housingSupportSchema>;

interface HousingSupportFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function HousingSupportForm({ onClose, onSuccess }: HousingSupportFormProps) {
  const { toast } = useToast();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<HousingSupportFormData>({
    resolver: zodResolver(housingSupportSchema),
    defaultValues: {
      clientPaid: "0.00",
      electricityFee: "0.00",
      rentLateFee: "0.00",
      adminFee: "61.00", // Default 5% admin fee for $1220 max
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHousingSupport) => {
      const response = await fetch("/api/housing-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create housing support record");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/housing-support"] });
      queryClient.invalidateQueries({ queryKey: ["/api/housing-support/pool-total/running"] });
      toast({ title: "Success", description: "Housing support record created successfully" });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create housing support record", variant: "destructive" });
    },
  });

  const onSubmit = (data: HousingSupportFormData) => {
    // Calculate admin fee (5% of max housing payment)
    const maxPayment = parseFloat(data.subsidyAward);
    const calculatedAdminFee = (maxPayment * 0.05).toFixed(2);
    
    // Backend will calculate monthPoolTotal and runningPoolTotal
    const submitData = {
      ...data,
      adminFee: calculatedAdminFee,
    };
    
    createMutation.mutate(submitData as any);
  };

  // Calculate preview of pool contribution
  const watchedValues = form.watch();
  const previewPoolContribution = () => {
    const subsidyReceived = parseFloat(watchedValues.subsidyReceived || "0");
    const clientObligation = parseFloat(watchedValues.clientObligation || "0");
    const rentAmount = parseFloat(watchedValues.rentAmount || "0");
    const adminFee = parseFloat(watchedValues.adminFee || "0");
    const electricityFee = parseFloat(watchedValues.electricityFee || "0");
    const rentLateFee = parseFloat(watchedValues.rentLateFee || "0");
    
    return subsidyReceived + clientObligation - rentAmount - adminFee - electricityFee - rentLateFee;
  };

  const poolContribution = previewPoolContribution();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Housing Support Record</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month (YYYY-MM)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2025-01" type="month" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Amount</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1100.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subsidyAward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subsidy Award</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1220.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subsidyReceived"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subsidy Received</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1220.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientObligation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Obligation</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="330.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="clientPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Paid</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="electricityFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Electricity Fee</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rentLateFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Fee</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0.00" type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="adminFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Fee (5%)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="61.00" type="number" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pool Contribution Preview */}
            <Card className={`${poolContribution >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {poolContribution >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">Pool Contribution Preview:</span>
                  </div>
                  <span className={`font-bold ${poolContribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${poolContribution.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Formula: (Subsidy Received + Client Obligation) - (Rent + Admin Fee + Electricity + Late Fee)
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function HousingSupportPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: records = [] } = useQuery<HousingSupport[]>({
    queryKey: ["/api/housing-support"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: runningTotal } = useQuery({
    queryKey: ["/api/housing-support/pool-total/running"],
  });

  const { data: monthlyTotal } = useQuery({
    queryKey: ["/api/housing-support/pool-total/month", selectedMonth],
  });

  // Group records by month
  const recordsByMonth = records.reduce((acc, record) => {
    const month = record.month;
    if (!acc[month]) acc[month] = [];
    acc[month].push(record);
    return acc;
  }, {} as Record<string, HousingSupport[]>);

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Housing Support Tracker</h1>
          <p className="text-slate-600">Automated pooled fund calculation and management</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Monthly Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Pool Total</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${((runningTotal as any)?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency((runningTotal as any)?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total accumulated pool fund
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(recordsByMonth).sort().reverse().map(month => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className={`text-xl font-bold ${((monthlyTotal as any)?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency((monthlyTotal as any)?.total || 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
            <p className="text-xs text-muted-foreground">
              Total monthly records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">No housing support records yet</p>
              <Button onClick={() => setShowForm(true)}>
                Add First Record
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(recordsByMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, monthRecords]) => (
                  <div key={month} className="space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Client</th>
                            <th className="text-right p-2">Rent</th>
                            <th className="text-right p-2">Subsidy</th>
                            <th className="text-right p-2">Received</th>
                            <th className="text-right p-2">Obligation</th>
                            <th className="text-right p-2">Admin Fee</th>
                            <th className="text-right p-2">Pool Contribution</th>
                            <th className="text-right p-2">Running Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthRecords.map((record) => (
                            <tr key={record.id} className="border-b hover:bg-slate-50">
                              <td className="p-2 font-medium">{getClientName(record.clientId)}</td>
                              <td className="p-2 text-right">{formatCurrency(record.rentAmount)}</td>
                              <td className="p-2 text-right">{formatCurrency(record.subsidyAward)}</td>
                              <td className="p-2 text-right">{formatCurrency(record.subsidyReceived)}</td>
                              <td className="p-2 text-right">{formatCurrency(record.clientObligation)}</td>
                              <td className="p-2 text-right">{formatCurrency(record.adminFee)}</td>
                              <td className={`p-2 text-right font-semibold ${
                                parseFloat(record.monthPoolTotal.toString()) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(record.monthPoolTotal)}
                              </td>
                              <td className={`p-2 text-right font-semibold ${
                                parseFloat(record.runningPoolTotal.toString()) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(record.runningPoolTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <HousingSupportForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  );
}