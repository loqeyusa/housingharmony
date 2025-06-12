import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Calendar, 
  DollarSign, 
  User, 
  MapPin, 
  FileText,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useState } from "react";
import ApplicationForm from "@/components/application-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Application, Client, Property } from "@shared/schema";

export default function Applications() {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Application> }) => {
      const response = await apiRequest("PUT", `/api/applications/${id}`, data);
      return response.json();
    },
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pool-fund/balance"] });
      
      toast({
        title: "Success",
        description: `Application ${data.status}!`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    },
  });

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
  };

  const getPropertyAddress = (propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.address : 'Unknown Property';
  };

  const filteredApplications = applications.filter(application => {
    const clientName = getClientName(application.clientId).toLowerCase();
    const propertyAddress = getPropertyAddress(application.propertyId).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return clientName.includes(searchLower) || propertyAddress.includes(searchLower);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleApproval = (application: Application, reimbursementAmount: string) => {
    updateApplicationMutation.mutate({
      id: application.id,
      data: {
        status: 'approved',
        countyReimbursement: reimbursementAmount,
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={() => setShowApplicationForm(true)} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Button>
      </div>

      {/* Applications Grid */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">No applications found</div>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by submitting your first application"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowApplicationForm(true)} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Submit First Application
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(application.status)}
                    <CardTitle className="text-lg">
                      Application #{application.id}
                    </CardTitle>
                  </div>
                  <Badge className={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Client and Property Info */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-900">
                        {getClientName(application.clientId)}
                      </span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">
                        {getPropertyAddress(application.propertyId)}
                      </span>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Rent Paid</p>
                      <p className="font-semibold text-slate-900">
                        ${parseFloat(application.rentPaid.toString()).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Deposit Paid</p>
                      <p className="font-semibold text-slate-900">
                        ${parseFloat(application.depositPaid.toString()).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Application Fee</p>
                      <p className="font-semibold text-slate-900">
                        ${parseFloat(application.applicationFee.toString()).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">County Reimbursement</p>
                      <p className="font-semibold text-slate-900">
                        {application.countyReimbursement 
                          ? `$${parseFloat(application.countyReimbursement.toString()).toFixed(2)}`
                          : 'Pending'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>Submitted: {new Date(application.submittedAt).toLocaleDateString()}</span>
                    </div>
                    {application.approvedAt && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Approved: {new Date(application.approvedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for pending applications */}
                  {application.status === 'pending' && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-slate-500" />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="County reimbursement amount"
                            className="flex-1"
                            id={`reimbursement-${application.id}`}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                            onClick={() => {
                              const input = document.getElementById(`reimbursement-${application.id}`) as HTMLInputElement;
                              const amount = input.value;
                              if (amount && parseFloat(amount) > 0) {
                                handleApproval(application, amount);
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Please enter a valid reimbursement amount.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => updateApplicationMutation.mutate({
                              id: application.id,
                              data: { status: 'rejected' }
                            })}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Application Form Modal */}
      {showApplicationForm && (
        <ApplicationForm onClose={() => setShowApplicationForm(false)} />
      )}
    </div>
  );
}
