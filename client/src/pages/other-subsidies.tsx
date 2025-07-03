import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { OtherSubsidy } from "@shared/schema";
import OtherSubsidyForm from "@/components/other-subsidy-form";

export default function OtherSubsidiesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subsidies = [], isLoading } = useQuery({
    queryKey: ["/api/other-subsidies"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/other-subsidies/${id}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-subsidies"] });
      toast({
        title: "Success",
        description: "Other subsidy deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete other subsidy",
        variant: "destructive",
      });
    },
  });

  const filteredSubsidies = subsidies.filter((subsidy: OtherSubsidy) => {
    const matchesSearch = 
      subsidy.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subsidy.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subsidy.site && subsidy.site.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || subsidy.serviceStatus === statusFilter;
    const matchesProgram = programFilter === "all" || subsidy.subsidyProgram === programFilter;
    
    return matchesSearch && matchesStatus && matchesProgram;
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this other subsidy record?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "discharged": return "secondary";
      default: return "outline";
    }
  };

  const getProgramBadgeVariant = (program: string) => {
    switch (program) {
      case "MHR": return "default";
      case "MSA": return "secondary";
      case "Other": return "outline";
      default: return "outline";
    }
  };

  const uniquePrograms = [...new Set(subsidies.map((s: OtherSubsidy) => s.subsidyProgram).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Other Subsidies</h1>
          <p className="text-muted-foreground">Track non-HS/GRH subsidies and payments</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Other Subsidy
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subsidies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subsidies.filter((s: OtherSubsidy) => s.serviceStatus === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discharged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subsidies.filter((s: OtherSubsidy) => s.serviceStatus === "discharged").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                subsidies
                  .filter((s: OtherSubsidy) => s.serviceStatus === "active")
                  .reduce((sum: number, s: OtherSubsidy) => 
                    sum + (parseFloat(s.rentPaidMonthly || "0")), 0
                  ).toString()
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by client, vendor, or site..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
          </SelectContent>
        </Select>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {uniquePrograms.map((program) => (
              <SelectItem key={program} value={program}>{program}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Other Subsidies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Other Subsidies Records</CardTitle>
          <CardDescription>
            Showing {filteredSubsidies.length} of {subsidies.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Site/Location</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Base Rent</TableHead>
                  <TableHead>We Paid</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Client Obligation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubsidies.map((subsidy: OtherSubsidy) => (
                  <TableRow key={subsidy.id}>
                    <TableCell className="font-medium">{subsidy.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(subsidy.serviceStatus)}>
                        {subsidy.serviceStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{subsidy.vendorName}</TableCell>
                    <TableCell>{subsidy.site || "N/A"}</TableCell>
                    <TableCell>
                      {subsidy.subsidyProgram ? (
                        <Badge variant={getProgramBadgeVariant(subsidy.subsidyProgram)}>
                          {subsidy.subsidyProgram}
                        </Badge>
                      ) : "N/A"}
                    </TableCell>
                    <TableCell>{formatCurrency(subsidy.baseRent)}</TableCell>
                    <TableCell>{formatCurrency(subsidy.rentWePaid)}</TableCell>
                    <TableCell>{formatCurrency(subsidy.rentPaidMonthly)}</TableCell>
                    <TableCell>{formatCurrency(subsidy.clientObligation)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement edit functionality
                            toast({
                              title: "Coming Soon",
                              description: "Edit functionality will be available soon",
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subsidy.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSubsidies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No other subsidies records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Other Subsidy Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Other Subsidy Record</DialogTitle>
          </DialogHeader>
          <OtherSubsidyForm
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/other-subsidies"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}