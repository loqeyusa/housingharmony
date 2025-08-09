import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, RotateCcw, Trash2, ArrowLeft, Mail, Phone, Calendar, DollarSign, Grid3X3, List } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation as useMutationHook } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import { PageLoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/contexts/auth-context";

export default function DeletedClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: deletedClients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients/deleted"],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const restoreClientMutation = useMutationHook({
    mutationFn: (clientId: number) => 
      apiRequest("POST", `/api/clients/${clientId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients/deleted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client restored",
        description: "Client has been restored successfully.",
      });
      setRestoreDialogOpen(false);
      setSelectedClient(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutationHook({
    mutationFn: (clientId: number) => 
      apiRequest("DELETE", `/api/clients/${clientId}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients/deleted"] });
      toast({
        title: "Client permanently deleted",
        description: "Client has been permanently removed from the system.",
      });
      setPermanentDeleteDialogOpen(false);
      setSelectedClient(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to permanently delete client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRestoreClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setSelectedClient(client);
    setRestoreDialogOpen(true);
  };

  const handlePermanentDeleteClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setSelectedClient(client);
    setPermanentDeleteDialogOpen(true);
  };

  const handleRestoreConfirm = () => {
    if (selectedClient) {
      restoreClientMutation.mutate(selectedClient.id);
    }
  };

  const handlePermanentDeleteConfirm = () => {
    if (selectedClient) {
      permanentDeleteMutation.mutate(selectedClient.id);
    }
  };

  const filteredClients = deletedClients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <PageLoadingSpinner message="Loading deleted clients..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/clients')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deleted Clients</h1>
            <p className="text-gray-600">Manage clients that have been moved to deleted status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search deleted clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-2"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Deleted Clients Display */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">No deleted clients found</div>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "No clients have been deleted yet"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-medium text-sm">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {client.firstName} {client.lastName}
                      </CardTitle>
                    </div>
                  </div>
                  <Badge variant="destructive">Deleted</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(client.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    <span>${parseFloat(client.monthlyIncome.toString()).toFixed(2)}/month</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleRestoreClick(e, client)}
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handlePermanentDeleteClick(e, client)}
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Permanent
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="border-red-200 bg-red-50/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-medium">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {client.employmentStatus.replace('-', ' ')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>${parseFloat(client.monthlyIncome.toString()).toFixed(2)}/month</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="destructive">Deleted</Badge>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleRestoreClick(e, client)}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handlePermanentDeleteClick(e, client)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Permanent Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Client</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {selectedClient?.firstName} {selectedClient?.lastName} back to active status. 
              The client will appear in the main clients list again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={restoreClientMutation.isPending}
            >
              {restoreClientMutation.isPending ? "Restoring..." : "Restore Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedClient?.firstName} {selectedClient?.lastName} from the system. 
              This action cannot be undone. All client data, transactions, and history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}