import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Building2, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Eye,
  Check,
  X,
  Home,
  UserCheck,
  DollarSign,
  Activity,
  AlertCircle,
  TrendingUp,
  Lock,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Company, InsertCompany, User } from "@shared/schema";
import { CompanyForm } from "@/components/company-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SystemAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Check if already authenticated on component mount
  useEffect(() => {
    const isAuth = sessionStorage.getItem('systemAdminAuth') === 'true';
    if (isAuth) {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiRequest('POST', '/api/system/auth', { password });
      const result = await response.json();
      
      if (result.authenticated) {
        setIsAuthenticated(true);
        setShowPasswordDialog(false);
        sessionStorage.setItem('systemAdminAuth', 'true');
        toast({
          title: "Access Granted",
          description: "System admin access authenticated successfully",
        });
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid system admin password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate system admin access",
        variant: "destructive",
      });
    }
  };

  // Show password dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Dialog open={showPasswordDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                System Admin Access
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter system admin password"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit" className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Authenticate
                </Button>
              </div>
            </form>
            <p className="text-sm text-gray-500 text-center">
              This area requires system administrator credentials
            </p>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: companiesStats } = useQuery({
    queryKey: ["/api/system/companies-stats"],
  });

  const approveCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return apiRequest(`/api/companies/${companyId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/companies-stats"] });
      toast({
        title: "Success",
        description: "Company approved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve company",
        variant: "destructive",
      });
    },
  });

  const deactivateCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return apiRequest(`/api/companies/${companyId}/deactivate`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/companies-stats"] });
      toast({
        title: "Success",
        description: "Company deactivated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate company",
        variant: "destructive",
      });
    },
  });

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.phone?.includes(searchTerm)
  );

  const pendingCompanies = filteredCompanies.filter(c => c.status === "pending");
  const approvedCompanies = filteredCompanies.filter(c => c.status === "approved");
  const rejectedCompanies = filteredCompanies.filter(c => c.status === "rejected");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading system admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Administration</h1>
          <p className="text-gray-600">Manage housing program companies and system-wide settings</p>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {companies.filter(c => c.status === 'approved').length} active
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingCompanies.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {pendingCompanies.length > 0 ? 'Needs attention' : 'All clear'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{approvedCompanies.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((approvedCompanies.length / companies.length) * 100).toFixed(1)}% approval rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">System Users</p>
                  <p className="text-2xl font-bold text-gray-900">{companiesStats?.totalUsers || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Across all companies
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Company Approval Rate</span>
                  <span className="text-sm text-gray-600">
                    {companies.length > 0 ? ((approvedCompanies.length / companies.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${companies.length > 0 ? (approvedCompanies.length / companies.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending Reviews</span>
                  <span className="text-sm text-gray-600">{pendingCompanies.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${companies.length > 0 ? (pendingCompanies.length / companies.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Status</span>
                  <Badge className="bg-green-100 text-green-800">
                    <Activity className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">All systems operational</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
          <Button onClick={() => setShowCompanyForm(true)} className="bg-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending ({pendingCompanies.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedCompanies.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedCompanies.length})</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingCompanies.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending companies</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingCompanies.map((company) => (
                  <Card key={company.id} className="border-l-4 border-l-yellow-400">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{company.name}</h3>
                            <Badge className={getStatusColor(company.status)}>
                              {getStatusIcon(company.status)}
                              <span className="ml-1 capitalize">{company.status}</span>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Contact:</strong> {company.email}</p>
                              <p><strong>Phone:</strong> {company.phone}</p>
                            </div>
                            <div>
                              <p><strong>Address:</strong> {company.address}</p>
                              <p><strong>Display Name:</strong> {company.displayName}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCompany(company)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveCompanyMutation.mutate(company.id)}
                            disabled={approveCompanyMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateCompanyMutation.mutate(company.id)}
                            disabled={deactivateCompanyMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedCompanies.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No approved companies</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvedCompanies.map((company) => (
                  <Card key={company.id} className="border-l-4 border-l-green-400">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{company.name}</h3>
                            <Badge className={getStatusColor(company.status)}>
                              {getStatusIcon(company.status)}
                              <span className="ml-1 capitalize">{company.status}</span>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Contact:</strong> {company.email}</p>
                              <p><strong>Phone:</strong> {company.phone}</p>
                            </div>
                            <div>
                              <p><strong>Approved:</strong> {company.approvedAt ? new Date(company.approvedAt).toLocaleDateString() : 'N/A'}</p>
                              <p><strong>Display Name:</strong> {company.displayName}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCompany(company)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateCompanyMutation.mutate(company.id)}
                            disabled={deactivateCompanyMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Deactivate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedCompanies.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No rejected companies</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedCompanies.map((company) => (
                  <Card key={company.id} className="border-l-4 border-l-red-400">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{company.name}</h3>
                            <Badge className={getStatusColor(company.status)}>
                              {getStatusIcon(company.status)}
                              <span className="ml-1 capitalize">{company.status}</span>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Contact:</strong> {company.email}</p>
                              <p><strong>Phone:</strong> {company.phone}</p>
                            </div>
                            <div>
                              <p><strong>Address:</strong> {company.address}</p>
                              <p><strong>Display Name:</strong> {company.displayName}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCompany(company)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveCompanyMutation.mutate(company.id)}
                            disabled={approveCompanyMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        </Tabs>

        {/* Company Form Modal */}
        {showCompanyForm && (
          <CompanyFormModal
            onClose={() => setShowCompanyForm(false)}
            onSuccess={() => {
              setShowCompanyForm(false);
              queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
            }}
          />
        )}

        {/* Company Details Modal */}
        {selectedCompany && (
          <CompanyDetailsModal
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)}
            onApprove={() => {
              approveCompanyMutation.mutate(selectedCompany.id);
              setSelectedCompany(null);
            }}
            onDeactivate={() => {
              deactivateCompanyMutation.mutate(selectedCompany.id);
              setSelectedCompany(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Company Details Modal Component
interface CompanyDetailsModalProps {
  company: Company;
  onClose: () => void;
  onApprove: () => void;
  onDeactivate: () => void;
}

function CompanyDetailsModal({ company, onClose, onApprove, onDeactivate }: CompanyDetailsModalProps) {
  const { data: companyStats } = useQuery({
    queryKey: ["/api/companies", company.id, "stats"],
    enabled: !!company.id,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {company.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Company Status and Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(company.status)}>
                {getStatusIcon(company.status)}
                <span className="ml-1 capitalize">{company.status}</span>
              </Badge>
              <span className="text-sm text-gray-600">
                Created: {new Date(company.createdAt).toLocaleDateString()}
              </span>
              {company.approvedAt && (
                <span className="text-sm text-gray-600">
                  Approved: {new Date(company.approvedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {company.status === "pending" && (
                <>
                  <Button 
                    onClick={onApprove}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={onDeactivate}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
              {company.status === "approved" && (
                <Button 
                  onClick={onDeactivate}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Deactivate
                </Button>
              )}
              {company.status === "rejected" && (
                <Button 
                  onClick={onApprove}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
            </div>
          </div>

          {/* Company Statistics */}
          {companyStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{companyStats.totalClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Home className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Active Properties</p>
                      <p className="text-2xl font-bold text-gray-900">{companyStats.activeProperties}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <UserCheck className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{companyStats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">${companyStats.monthlyRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Company Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Business Name</h4>
                  <p className="text-gray-600">{company.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Display Name</h4>
                  <p className="text-gray-600">{company.displayName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">License Number</h4>
                  <p className="text-gray-600">{company.licenseNumber || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Tax ID</h4>
                  <p className="text-gray-600">{company.taxId || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Contact Email</h4>
                  <p className="text-gray-600">{company.email}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Contact Phone</h4>
                  <p className="text-gray-600">{company.phone}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Address</h4>
                  <p className="text-gray-600">{company.address}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Website</h4>
                  <p className="text-gray-600">{company.website || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Description */}
          {company.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">{company.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Company ID</h4>
                  <p className="text-gray-600 font-mono">{company.id}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Created Date</h4>
                  <p className="text-gray-600">{new Date(company.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Last Updated</h4>
                  <p className="text-gray-600">{new Date(company.updatedAt).toLocaleString()}</p>
                </div>
              </div>
              
              {company.approvedAt && company.approvedBy && (
                <div>
                  <h4 className="font-medium text-gray-900">Approval Details</h4>
                  <p className="text-gray-600">
                    Approved on {new Date(company.approvedAt).toLocaleString()} by User ID: {company.approvedBy}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Company Form Modal Component
interface CompanyFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CompanyFormModal({ onClose, onSuccess }: CompanyFormModalProps) {
  const { toast } = useToast();

  const createCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      const response = await apiRequest("POST", "/api/companies", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company created successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>
        <CompanyForm
          onSubmit={(data) => createCompanyMutation.mutate(data)}
          isLoading={createCompanyMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

// User Management Component
interface UserWithCompany extends User {
  companyName?: string;
  companyStatus?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  companyContactPersonName?: string;
  companyContactPersonEmail?: string;
}

function UserManagement() {
  const [userSearchTerm, setUserSearchTerm] = useState("");
  
  const { data: systemUsers = [], isLoading: usersLoading, error } = useQuery<UserWithCompany[]>({
    queryKey: ["/api/system/users"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  console.log("System Users:", systemUsers);
  console.log("Users Loading:", usersLoading);
  console.log("Users Error:", error);

  // Helper function to get company details for a user
  const getCompanyDetails = (user: UserWithCompany): Company | null => {
    if (!user.companyId) return null;
    return companies.find(company => company.id === user.companyId) || null;
  };

  const filteredUsers = systemUsers.filter(user =>
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.companyName?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const getUserRoleBadge = (user: UserWithCompany) => {
    if (user.isSuperAdmin) {
      return (
        <Badge className="bg-purple-100 text-purple-800">
          <UserCheck className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Users className="h-3 w-3 mr-1" />
        Company Admin
      </Badge>
    );
  };

  const getCompanyStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const colors = {
      approved: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  if (usersLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                    <div className="h-3 bg-gray-200 rounded w-60"></div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate user statistics by company
  const usersByCompany = systemUsers.reduce((acc, user) => {
    const companyName = user.companyName || 'No Company';
    if (!acc[companyName]) {
      acc[companyName] = { count: 0, active: 0, superAdmins: 0 };
    }
    acc[companyName].count++;
    if (user.isEnabled) acc[companyName].active++;
    if (user.isSuperAdmin) acc[companyName].superAdmins++;
    return acc;
  }, {} as Record<string, { count: number; active: number; superAdmins: number }>);

  return (
    <div className="space-y-6">
      {/* User Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{systemUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemUsers.filter(u => u.isEnabled).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Companies</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(usersByCompany).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemUsers.filter(u => u.isSuperAdmin).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Distribution by Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(usersByCompany).map(([companyName, stats]) => (
              <div key={companyName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{companyName}</p>
                  <p className="text-sm text-gray-600">
                    {stats.count} users ({stats.active} active)
                    {stats.superAdmins > 0 && ` • ${stats.superAdmins} admin${stats.superAdmins > 1 ? 's' : ''}`}
                  </p>
                </div>
                <Badge variant="outline">{stats.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users by name, email, username, or company..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredUsers.length} of {systemUsers.length} users
        </div>
      </div>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {userSearchTerm ? 'No users found matching your search' : 'No users found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* User Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </h3>
                          {getUserRoleBadge(user)}
                          <Badge variant={user.isEnabled ? "default" : "secondary"}>
                            {user.isEnabled ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span><strong>Username:</strong> {user.username}</span>
                          <span><strong>Email:</strong> {user.email}</span>
                          <span><strong>User ID:</strong> {user.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {getCompanyStatusBadge(user.companyStatus)}
                      <div className="text-xs text-gray-500">
                        {user.companyId && <span>Company ID: {user.companyId}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Company Details Section */}
                  {user.companyName && (
                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-gray-900">Company Details</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-700">Company Name:</span>
                            <p className="text-gray-600">{user.companyName}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Company Status:</span>
                            <div className="mt-1">
                              {getCompanyStatusBadge(user.companyStatus)}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Company ID:</span>
                            <p className="text-gray-600">{user.companyId}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-700">User Role:</span>
                            <p className="text-gray-600">
                              {user.isSuperAdmin ? 'Super Administrator' : 'Company Administrator'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Access Level:</span>
                            <p className="text-gray-600">
                              {user.isSuperAdmin ? 'System-wide Access' : 'Company-scoped Access'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Company Email:</span>
                            <p className="text-gray-600">{getCompanyDetails(user)?.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium text-gray-700">Phone:</span>
                            <p className="text-gray-600">{getCompanyDetails(user)?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Address:</span>
                            <p className="text-gray-600">{getCompanyDetails(user)?.address || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Website:</span>
                            <p className="text-gray-600">
                              {getCompanyDetails(user)?.website ? (
                                <a 
                                  href={getCompanyDetails(user)?.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {getCompanyDetails(user)?.website}
                                </a>
                              ) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {getCompanyDetails(user)?.contactPersonName && (
                        <div className="mt-4 pt-3 border-t">
                          <h5 className="font-medium text-gray-700 mb-2">Contact Person:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Name:</span>
                              <p className="text-gray-600">{getCompanyDetails(user)?.contactPersonName}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Email:</span>
                              <p className="text-gray-600">{getCompanyDetails(user)?.contactPersonEmail || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Activity Information */}
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-gray-900">Activity Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Created:</span>
                        <p className="text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Last Login:</span>
                        <p className="text-gray-600">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Account Status:</span>
                        <p className="text-gray-600">
                          {user.isEnabled ? 'Active & Enabled' : 'Inactive/Disabled'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}