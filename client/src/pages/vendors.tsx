import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Building2, Phone, Mail, Globe, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@shared/schema";
import VendorForm from "@/components/vendor-form";

export default function VendorsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: vendors, isLoading, error } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/vendors");
      return response.json() as Promise<Vendor[]>;
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      deleteVendorMutation.mutate(id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "county_hopwa":
        return <Building2 className="h-4 w-4" />;
      case "group_homes":
        return <Users className="h-4 w-4" />;
      case "healthcare":
        return <Users className="h-4 w-4" />;
      case "residential_care":
        return <Building2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "county_hopwa": return "County HOPWA";
      case "group_homes": return "Group Homes";
      case "other_subsidies": return "Other Subsidies";
      case "lth_pool": return "LTH Pool";
      case "healthcare": return "Healthcare";
      case "residential_care": return "Residential Care";
      default: return type;
    }
  };

  const filteredVendors = vendors?.filter(vendor => {
    const matchesFilter = filter === "all" || vendor.type === filter;
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  const vendorsByType = vendors?.reduce((acc, vendor) => {
    acc[vendor.type] = (acc[vendor.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load vendors. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <p className="text-gray-600">Manage housing support service providers</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-6 w-8" /> : vendors?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-6 w-8" />
              ) : (
                vendors?.filter(v => v.status === "active").length || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">County HOPWA</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-6 w-8" /> : vendorsByType["county_hopwa"] || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Group Homes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-6 w-8" /> : vendorsByType["group_homes"] || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="county_hopwa">County HOPWA</SelectItem>
            <SelectItem value="group_homes">Group Homes</SelectItem>
            <SelectItem value="other_subsidies">Other Subsidies</SelectItem>
            <SelectItem value="lth_pool">LTH Pool</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="residential_care">Residential Care</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>
            {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type/GRH</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Capacity/Rate</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{vendor.name}</div>
                        {vendor.registrationNumber && (
                          <div className="text-xs text-gray-500">Reg: {vendor.registrationNumber}</div>
                        )}
                        {vendor.contactPerson && (
                          <div className="text-sm text-gray-600">{vendor.contactPerson}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(vendor.type)}
                          <span className="text-sm">{getTypeLabel(vendor.type)}</span>
                        </div>
                        {vendor.grhType && (
                          <div className="text-xs text-gray-500">GRH: {vendor.grhType}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.phone && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Phone className="h-3 w-3" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-32">{vendor.email}</span>
                          </div>
                        )}
                        {vendor.keyPerson && (
                          <div className="text-xs text-gray-500">Key: {vendor.keyPerson}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.capacity && (
                          <div className="text-sm">
                            <Users className="h-3 w-3 inline mr-1" />
                            {vendor.capacity} beds
                          </div>
                        )}
                        {vendor.dailyRate && (
                          <div className="text-sm text-green-600">
                            ${vendor.dailyRate}/day
                          </div>
                        )}
                        {vendor.serviceArea && (
                          <div className="text-xs text-gray-500">{vendor.serviceArea}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.contractStartDate && (
                          <div className="text-xs">
                            Start: {new Date(vendor.contractStartDate).toLocaleDateString()}
                          </div>
                        )}
                        {vendor.contractEndDate && (
                          <div className="text-xs">
                            End: {new Date(vendor.contractEndDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge 
                          variant={vendor.licenseStatus === "active" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {vendor.licenseStatus}
                        </Badge>
                        {vendor.licenseExpirationDate && (
                          <div className="text-xs text-gray-500">
                            Exp: {new Date(vendor.licenseExpirationDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.status === "active" ? "default" : "secondary"}>
                        {vendor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDelete(vendor.id)}
                          disabled={deleteVendorMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <VendorForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  );
}