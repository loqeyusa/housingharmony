import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Search, Check, X, Ban, BarChart3 } from "lucide-react";
import { Company, InsertCompany } from "@shared/schema";
import { CompanyForm } from "@/components/company-form";
import { CompanyStats } from "@/components/company-stats";
import { useToast } from "@/hooks/use-toast";

export default function Companies() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug: Log component mounting
  console.log("Companies component mounted");

  const { data: companies, isLoading, error } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debug logging
  console.log("Companies query state:", { isLoading, error, companies });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      return await apiRequest("/api/companies", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setShowAddDialog(false);
      toast({
        title: "Success",
        description: "Company created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/companies/${id}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Success",
        description: "Company approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve company",
        variant: "destructive",
      });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/companies/${id}/suspend`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Success",
        description: "Company suspended successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to suspend company",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <p className="text-red-600">Error loading companies: {error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Company Management</h1>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
            </DialogHeader>
            <CompanyForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Companies</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <CompanyGrid 
            companies={filteredCompanies}
            onApprove={approveMutation.mutate}
            onSuspend={suspendMutation.mutate}
            onViewStats={(company) => {
              setSelectedCompany(company);
              setShowStatsDialog(true);
            }}
            getStatusColor={getStatusColor}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <CompanyGrid 
            companies={filteredCompanies.filter(c => c.status === "active")}
            onApprove={approveMutation.mutate}
            onSuspend={suspendMutation.mutate}
            onViewStats={(company) => {
              setSelectedCompany(company);
              setShowStatsDialog(true);
            }}
            getStatusColor={getStatusColor}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <CompanyGrid 
            companies={filteredCompanies.filter(c => c.status === "pending")}
            onApprove={approveMutation.mutate}
            onSuspend={suspendMutation.mutate}
            onViewStats={(company) => {
              setSelectedCompany(company);
              setShowStatsDialog(true);
            }}
            getStatusColor={getStatusColor}
          />
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          <CompanyGrid 
            companies={filteredCompanies.filter(c => c.status === "suspended")}
            onApprove={approveMutation.mutate}
            onSuspend={suspendMutation.mutate}
            onViewStats={(company) => {
              setSelectedCompany(company);
              setShowStatsDialog(true);
            }}
            getStatusColor={getStatusColor}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Company Statistics - {selectedCompany?.displayName}</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <CompanyStats companyId={selectedCompany.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CompanyGridProps {
  companies: Company[];
  onApprove: (id: number) => void;
  onSuspend: (id: number) => void;
  onViewStats: (company: Company) => void;
  getStatusColor: (status: string) => string;
}

function CompanyGrid({ companies, onApprove, onSuspend, onViewStats, getStatusColor }: CompanyGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map((company) => (
        <Card key={company.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{company.displayName}</CardTitle>
              <Badge className={getStatusColor(company.status)}>
                {company.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Legal Name:</strong> {company.name}</p>
              <p><strong>Email:</strong> {company.email}</p>
              <p><strong>Phone:</strong> {company.phone}</p>
              <p><strong>Contact:</strong> {company.contactPersonName}</p>
              <p><strong>Plan:</strong> {company.subscriptionPlan}</p>
              <p><strong>Limits:</strong> {company.maxClients} clients, {company.maxUsers} users</p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewStats(company)}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Stats
              </Button>
              
              {company.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApprove(company.id)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              
              {company.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSuspend(company.id)}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}