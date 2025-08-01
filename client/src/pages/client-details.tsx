import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  MapPin, 
  FileText, 
  Upload, 
  Download, 
  Trash2,
  Eye,
  Plus,
  User,
  CreditCard,
  Home,
  ClipboardList,
  History,
  Wallet,
  Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Client, Application, Transaction, HousingSupport } from "@shared/schema";
import ClientTransactionForm from "@/components/client-transaction-form";
import ClientTransactionFormEnhanced from "@/components/client-transaction-form-enhanced";
import { ClientNotesDisplay } from "@/components/client-notes-display";
import { ClientNotesForm } from "@/components/client-notes-form";
import CountyPaymentForm from "@/components/county-payment-form";
import { useAuth } from "@/contexts/auth-context";

export default function ClientDetails() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [showCountyPaymentForm, setShowCountyPaymentForm] = useState(false);
  const [newDocument, setNewDocument] = useState({ name: "", type: "id", file: null as File | null });
  const { toast } = useToast();

  console.log('ClientDetails loaded with clientId:', clientId);

  const { data: client, isLoading, error } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: [`/api/applications?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: housingSupport = [] } = useQuery<HousingSupport[]>({
    queryKey: [`/api/housing-support?clientId=${clientId}`],
    enabled: !!clientId,
  });

  // Get client pool fund balance and activity
  const { data: clientPoolFund } = useQuery<{
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    recentEntries: Array<{
      id: number;
      amount: number;
      type: string;
      description: string;
      created_at: string;
      county: string;
    }>;
  }>({
    queryKey: [`/api/clients/${clientId}/pool-fund`],
    enabled: !!clientId,
  });

  console.log('Client data:', client, 'Loading:', isLoading, 'Error:', error);

  const updateClientMutation = useMutation({
    mutationFn: (data: Partial<Client>) => 
      apiRequest("PUT", `/api/clients/${clientId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      setIsEditing(false);
      setEditedClient({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (Object.keys(editedClient).length > 0) {
      updateClientMutation.mutate(editedClient);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedClient({});
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEditedClient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentUpload = async () => {
    if (!newDocument.file) return;

    // For now, just show a success message
    // In production, you'd upload to a file storage service
    toast({
      title: "Success",
      description: `Document "${newDocument.name}" uploaded successfully`,
    });
    
    setShowAddDocument(false);
    setNewDocument({ name: "", type: "id", file: null });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error loading client</h2>
          <p className="text-gray-600">There was an error loading the client details: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!client && !isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Client not found</h2>
          <p className="text-gray-600">The client you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-medium text-lg">
                {client?.firstName?.charAt(0)}{client?.lastName?.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client?.firstName} {client?.lastName}
              </h1>
              <p className="text-gray-600">Client ID: {client?.id}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={client?.status === 'active' ? 'default' : 'secondary'}>
            {client?.status}
          </Badge>
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateClientMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={updateClientMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowTransactionForm(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                Add Transaction
              </Button>
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="housing" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Housing
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      {isEditing ? (
                        <Input
                          id="firstName"
                          value={editedClient.firstName ?? client.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{client.firstName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      {isEditing ? (
                        <Input
                          id="lastName"
                          value={editedClient.lastName ?? client.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{client.lastName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={editedClient.email ?? client.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {client.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={editedClient.phone ?? client.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {client.phone}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      {isEditing ? (
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={editedClient.dateOfBirth ?? client.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="site">County</Label>
                      {isEditing ? (
                        <Input
                          id="site"
                          value={editedClient.site ?? client.site}
                          onChange={(e) => handleInputChange('site', e.target.value)}
                          placeholder="e.g., Dakota County"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {client.site || 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="ssn">SSN</Label>
                      {isEditing ? (
                        <Input
                          id="ssn"
                          value={editedClient.ssn ?? client.ssn}
                          onChange={(e) => handleInputChange('ssn', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          ***-**-{client.ssn.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="currentAddress">Current Address</Label>
                    {isEditing ? (
                      <Textarea
                        id="currentAddress"
                        value={editedClient.currentAddress ?? client.currentAddress}
                        onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1" />
                        {client.currentAddress}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employmentStatus">Employment Status</Label>
                      {isEditing ? (
                        <Select
                          value={editedClient.employmentStatus ?? client.employmentStatus}
                          onValueChange={(value) => handleInputChange('employmentStatus', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employment status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                            <SelectItem value="self-employed">Self-employed</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-gray-900 font-medium capitalize">
                          {client.employmentStatus.replace('-', ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced Financial Information */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Financial Overview
                    </h3>
                    
                    {clientPoolFund && client ? (
                      <div className="space-y-4">
                        {/* Monthly Income */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-700 font-medium">Monthly Income</p>
                              <p className="text-2xl font-bold text-blue-800">
                                ${parseFloat(client.monthlyIncome?.toString() || '0').toFixed(2)}
                              </p>
                              <p className="text-xs text-blue-600">per month</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-600" />
                          </div>
                        </div>
                        
                        {/* Financial Breakdown */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-green-700 mb-1">Received This Month</p>
                            <p className="text-xl font-bold text-green-800">
                              ${clientPoolFund.totalDeposits.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-red-700 mb-1">Total Spent</p>
                            <p className="text-xl font-bold text-red-800">
                              ${clientPoolFund.totalWithdrawals.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Active Balance Calculation */}
                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary">
                          <div className="text-center">
                            <p className="text-sm text-gray-700 mb-2">Active Balance Calculation</p>
                            <p className="text-sm text-gray-600 mb-2">
                              ${parseFloat(client.monthlyIncome?.toString() || '0').toFixed(2)} - ${clientPoolFund.totalWithdrawals.toFixed(2)} = 
                            </p>
                            <p className={`text-3xl font-bold ${clientPoolFund.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${clientPoolFund.balance.toFixed(2)}
                            </p>
                            {clientPoolFund.balance < 0 && (
                              <div className="mt-3 p-2 bg-red-100 rounded border border-red-200">
                                <p className="text-sm text-red-700 font-medium">
                                  ⚠️ Spending exceeded income before money received
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Recent Financial Activity */}
                        {clientPoolFund.recentEntries.length > 0 && (
                          <div className="bg-white border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-3 text-gray-700">Recent Financial Activity</h4>
                            <div className="space-y-2">
                              {clientPoolFund.recentEntries.slice(0, 3).map((entry) => (
                                <div key={entry.id} className="flex justify-between items-start text-sm border-b border-gray-100 pb-2 last:border-b-0">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 truncate">
                                      {entry.description}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {entry.county} • {new Date(entry.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className={`font-bold text-sm ${
                                    entry.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {entry.type === 'deposit' ? '+' : '-'}${entry.amount.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Loading financial data...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="housing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Housing Support Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendorNumber">Vendor Number</Label>
                      {isEditing ? (
                        <Input
                          id="vendorNumber"
                          value={editedClient.vendorNumber ?? client.vendorNumber ?? ''}
                          onChange={(e) => handleInputChange('vendorNumber', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{client.vendorNumber || 'Not assigned'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="site">Site</Label>
                      {isEditing ? (
                        <Input
                          id="site"
                          value={editedClient.site ?? client.site ?? ''}
                          onChange={(e) => handleInputChange('site', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{client.site || 'Not assigned'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="cluster">Cluster</Label>
                      {isEditing ? (
                        <Input
                          id="cluster"
                          value={editedClient.cluster ?? client.cluster ?? ''}
                          onChange={(e) => handleInputChange('cluster', e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{client.cluster || 'Not assigned'}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="subsidyStatus">Subsidy Status</Label>
                      {isEditing ? (
                        <Select
                          value={editedClient.subsidyStatus ?? client.subsidyStatus ?? 'pending'}
                          onValueChange={(value) => handleInputChange('subsidyStatus', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subsidy status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="receiving">Receiving</SelectItem>
                            <SelectItem value="stopped">Stopped</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={client.subsidyStatus === 'receiving' ? 'default' : 'secondary'}>
                          {client.subsidyStatus || 'pending'}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="grhStatus">GRH Status</Label>
                      {isEditing ? (
                        <Select
                          value={editedClient.grhStatus ?? client.grhStatus ?? 'pending'}
                          onValueChange={(value) => handleInputChange('grhStatus', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select GRH status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="denied">Denied</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={client.grhStatus === 'approved' ? 'default' : 'secondary'}>
                          {client.grhStatus || 'pending'}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="maxHousingPayment">Max Housing Payment</Label>
                      {isEditing ? (
                        <Input
                          id="maxHousingPayment"
                          type="number"
                          step="0.01"
                          value={editedClient.maxHousingPayment ?? client.maxHousingPayment}
                          onChange={(e) => handleInputChange('maxHousingPayment', parseFloat(e.target.value))}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          ${parseFloat(client.maxHousingPayment?.toString() || '0').toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className={`text-2xl font-bold ${parseFloat(client.currentBalance?.toString() || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${parseFloat(client.currentBalance?.toString() || '0').toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Credit Limit</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${parseFloat(client.creditLimit?.toString() || '0').toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Client Obligation</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {parseFloat(client.clientObligationPercent?.toString() || '0').toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {isEditing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="creditLimit">Credit Limit</Label>
                        <Input
                          id="creditLimit"
                          type="number"
                          step="0.01"
                          value={editedClient.creditLimit ?? client.creditLimit}
                          onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientObligationPercent">Client Obligation %</Label>
                        <Input
                          id="clientObligationPercent"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={editedClient.clientObligationPercent ?? client.clientObligationPercent}
                          onChange={(e) => handleInputChange('clientObligationPercent', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="applications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Housing Applications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {applications.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No applications found</p>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <div key={app.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">Application #{app.id}</h4>
                              <p className="text-sm text-gray-600">
                                Submitted {new Date(app.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={app.status === 'approved' ? 'default' : app.status === 'pending' ? 'secondary' : 'destructive'}>
                              {app.status}
                            </Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Rent:</span> ${parseFloat(app.rentPaid.toString()).toFixed(2)}
                            </div>
                            <div>
                              <span className="text-gray-600">Deposit:</span> ${parseFloat(app.depositPaid.toString()).toFixed(2)}
                            </div>
                            <div>
                              <span className="text-gray-600">App Fee:</span> ${parseFloat(app.applicationFee.toString()).toFixed(2)}
                            </div>
                            <div>
                              <span className="text-gray-600">Reimbursement:</span> ${parseFloat(app.countyReimbursement?.toString() || '0').toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <ClientNotesDisplay
                clientId={parseInt(clientId!)}
                onAddNote={() => setShowNotesForm(true)}
              />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No transactions found</p>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{transaction.type.replace('_', ' ')}</h4>
                              <p className="text-sm text-gray-600">{transaction.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className={`text-lg font-bold ${parseFloat(transaction.amount.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${parseFloat(transaction.amount.toString()).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Documents & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
                <Dialog open={showAddDocument} onOpenChange={setShowAddDocument}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="documentName">Document Name</Label>
                        <Input
                          id="documentName"
                          value={newDocument.name}
                          onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter document name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="documentType">Document Type</Label>
                        <Select
                          value={newDocument.type}
                          onValueChange={(value) => setNewDocument(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="id">ID Document</SelectItem>
                            <SelectItem value="income">Income Verification</SelectItem>
                            <SelectItem value="housing">Housing Document</SelectItem>
                            <SelectItem value="medical">Medical Document</SelectItem>
                            <SelectItem value="legal">Legal Document</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="documentFile">Upload File</Label>
                        <Input
                          id="documentFile"
                          type="file"
                          onChange={(e) => setNewDocument(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDocumentUpload}
                          disabled={!newDocument.name || !newDocument.file}
                          className="bg-primary text-white hover:bg-primary/90"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddDocument(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sample documents - in production, these would come from the database */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Driver's License</p>
                      <p className="text-xs text-gray-500">ID Document</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Pay Stub</p>
                      <p className="text-xs text-gray-500">Income Verification</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center py-4">
                  Add documents to keep track of important client files
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <ClipboardList className="h-4 w-4 mr-2" />
                Create Application
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowTransactionForm(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowCountyPaymentForm(true)}
              >
                <Banknote className="h-4 w-4 mr-2" />
                County Payment Received
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowNotesForm(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Note
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>



          <Card>
            <CardHeader>
              <CardTitle>Client Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-gray-600">Member Since</p>
                <p className="font-medium">{new Date(client.createdAt).toLocaleDateString()}</p>
              </div>
              <Separator />
              <div className="text-sm">
                <p className="text-gray-600">Total Applications</p>
                <p className="font-medium">{applications.length}</p>
              </div>
              <Separator />
              <div className="text-sm">
                <p className="text-gray-600">Total Transactions</p>
                <p className="font-medium">{transactions.length}</p>
              </div>
              <Separator />
              <div className="text-sm">
                <p className="text-gray-600">Housing Support Records</p>
                <p className="font-medium">{housingSupport.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <ClientTransactionFormEnhanced
          clientId={parseInt(clientId!)}
          clientName={`${client.firstName} ${client.lastName}`}
          onClose={() => setShowTransactionForm(false)}
          onSuccess={() => {
            // Refresh transaction data
            queryClient.invalidateQueries({ 
              queryKey: [`/api/transactions?clientId=${clientId}`] 
            });
          }}
        />
      )}

      {/* Notes Form Modal */}
      {showNotesForm && user && (
        <ClientNotesForm
          clientId={parseInt(clientId!)}
          clientName={`${client.firstName} ${client.lastName}`}
          currentUserId={user.id}
          onClose={() => setShowNotesForm(false)}
          onSuccess={() => {
            // Refresh notes data
            queryClient.invalidateQueries({ 
              queryKey: [`/api/clients/${clientId}/notes`] 
            });
          }}
        />
      )}

      {/* County Payment Form Modal */}
      {showCountyPaymentForm && client && (
        <CountyPaymentForm
          clientId={parseInt(clientId!)}
          clientName={`${client.firstName} ${client.lastName}`}
          monthlyIncome={parseFloat(client.monthlyIncome?.toString() || '0')}
          county={client.site || ''}
          onClose={() => setShowCountyPaymentForm(false)}
          onSuccess={() => {
            // Refresh all relevant data
            queryClient.invalidateQueries({ 
              queryKey: [`/api/clients/${clientId}/pool-fund`] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ["/api/pool-fund"] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ["/api/transactions"] 
            });
          }}
        />
      )}
    </div>
  );
}