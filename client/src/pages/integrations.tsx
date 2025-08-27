import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Settings, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  DollarSign,
  FileText
} from 'lucide-react';

interface ExternalIntegration {
  id: number;
  companyId: number;
  systemName: string;
  systemType: 'api' | 'web_automation';
  displayName: string;
  isActive: boolean;
  loginUrl?: string;
  settings?: any;
  lastSyncAt?: string;
  syncStatus: 'pending' | 'active' | 'error' | 'disabled';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface AutomationTask {
  id: number;
  companyId: number;
  integrationId: number;
  clientId?: number;
  taskType: string;
  systemName: string;
  taskData: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  startedAt?: string;
  completedAt?: string;
  executionTime?: number;
  success?: boolean;
  result?: any;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  triggeredBy: number;
  createdAt: string;
}

export default function Integrations() {
  const [selectedIntegration, setSelectedIntegration] = useState<ExternalIntegration | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch integrations
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['/api/integrations'],
    queryFn: () => apiRequest('/api/integrations')
  });

  // Fetch automation tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/automation-tasks'],
    queryFn: () => apiRequest('/api/automation-tasks')
  });

  // Create integration mutation
  const createIntegrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/integrations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setShowAddDialog(false);
      toast({
        title: 'Integration Created',
        description: 'External integration has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create integration',
        variant: 'destructive',
      });
    }
  });

  // Create automation task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/automation-tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation-tasks'] });
      setShowPaymentDialog(false);
      toast({
        title: 'Task Created',
        description: 'Automation task has been scheduled successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    }
  });

  // Test integration mutation
  const testIntegrationMutation = useMutation({
    mutationFn: (integrationId: number) => apiRequest(`/api/integrations/${integrationId}/test`, {
      method: 'POST'
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({
        title: data.success ? 'Test Successful' : 'Test Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to test integration',
        variant: 'destructive',
      });
    }
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const { register: registerPayment, handleSubmit: handlePaymentSubmit, reset: resetPayment } = useForm();

  const systemType = watch('systemType');

  const onSubmitIntegration = (data: any) => {
    createIntegrationMutation.mutate(data);
  };

  const onSubmitPayment = (data: any) => {
    if (!selectedIntegration) return;

    const taskData = {
      integrationId: selectedIntegration.id,
      taskType: 'utility_payment',
      systemName: selectedIntegration.systemName,
      taskData: {
        taskType: 'utility_payment',
        systemName: selectedIntegration.systemName,
        meterNumber: data.meterNumber,
        cardNumber: data.cardNumber,
        expiryDate: data.expiryDate,
        cvv: data.cvv,
        amount: parseFloat(data.amount),
        clientId: data.clientId ? parseInt(data.clientId) : undefined
      }
    };

    createTaskMutation.mutate(taskData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'disabled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'in_progress': return <Activity className="w-4 h-4 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">External Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Manage API connections and web automation for external systems
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add External Integration</DialogTitle>
              <DialogDescription>
                Configure a new external system integration
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitIntegration)} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  {...register('displayName', { required: true })}
                  placeholder="QuickBooks Production"
                />
              </div>

              <div>
                <Label htmlFor="systemType">Integration Type</Label>
                <Select onValueChange={(value) => setValue('systemType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API Integration</SelectItem>
                    <SelectItem value="web_automation">Web Automation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="systemName">System Name</Label>
                <Select onValueChange={(value) => setValue('systemName', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select system" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quickbooks">QuickBooks</SelectItem>
                    <SelectItem value="excel_energy">Excel Energy</SelectItem>
                    <SelectItem value="xcel_energy">Xcel Energy</SelectItem>
                    <SelectItem value="centerpoint_energy">CenterPoint Energy</SelectItem>
                    <SelectItem value="custom">Custom System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {systemType === 'web_automation' && (
                <div>
                  <Label htmlFor="loginUrl">Login URL</Label>
                  <Input
                    {...register('loginUrl')}
                    placeholder="https://www.example.com/login"
                  />
                </div>
              )}

              {systemType === 'api' && (
                <div>
                  <Label htmlFor="apiCredentials">API Configuration</Label>
                  <Textarea
                    {...register('apiCredentials')}
                    placeholder='{"clientId": "your-client-id", "clientSecret": "your-secret"}'
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createIntegrationMutation.isPending}>
                  Create Integration
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="tasks">Automation Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration: ExternalIntegration) => (
              <Card key={integration.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{integration.displayName}</CardTitle>
                      <CardDescription className="capitalize">
                        {integration.systemName} • {integration.systemType}
                      </CardDescription>
                    </div>
                    <Badge 
                      className={`${getStatusColor(integration.syncStatus)} text-white text-xs`}
                    >
                      {integration.syncStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {integration.lastSyncAt && (
                      <div className="text-sm text-muted-foreground">
                        Last sync: {new Date(integration.lastSyncAt).toLocaleDateString()}
                      </div>
                    )}
                    
                    {integration.errorMessage && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {integration.errorMessage}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testIntegrationMutation.mutate(integration.id)}
                        disabled={testIntegrationMutation.isPending}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Test
                      </Button>

                      {integration.systemType === 'web_automation' && 
                       integration.systemName.includes('energy') && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setShowPaymentDialog(true);
                          }}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Pay Bill
                        </Button>
                      )}

                      {integration.systemName === 'quickbooks' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Open QuickBooks auth URL
                            window.open(`/api/integrations/${integration.id}/quickbooks/auth-url`, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {integrations.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Integrations Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first external system integration to get started
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Integration
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="space-y-4">
            {tasks.map((task: AutomationTask) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {getTaskStatusIcon(task.status)}
                        <span className="ml-2 capitalize">
                          {task.taskType.replace('_', ' ')} - {task.systemName}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        Created {new Date(task.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge className={getTaskStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {task.taskType === 'utility_payment' && task.taskData && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Amount:</span> ${task.taskData.amount}
                        </div>
                        <div>
                          <span className="font-medium">Meter:</span> {task.taskData.meterNumber}
                        </div>
                      </div>
                    )}
                    
                    {task.executionTime && (
                      <div className="text-sm text-muted-foreground">
                        Execution time: {task.executionTime}ms
                      </div>
                    )}
                    
                    {task.errorMessage && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {task.errorMessage}
                      </div>
                    )}

                    {task.result && task.success && (
                      <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                        Task completed successfully
                        {task.result.confirmationNumber && (
                          <div>Confirmation: {task.result.confirmationNumber}</div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {tasks.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Automation Tasks</h3>
                <p className="text-muted-foreground">
                  Automation tasks will appear here when you create them
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Utility Payment</DialogTitle>
            <DialogDescription>
              Create an automated payment task for {selectedIntegration?.displayName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit(onSubmitPayment)} className="space-y-4">
            <div>
              <Label htmlFor="meterNumber">Meter Number</Label>
              <Input
                {...registerPayment('meterNumber', { required: true })}
                placeholder="123456789"
              />
            </div>

            <div>
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                {...registerPayment('amount', { required: true })}
                type="number"
                step="0.01"
                placeholder="150.00"
              />
            </div>

            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                {...registerPayment('cardNumber', { required: true })}
                placeholder="**** **** **** ****"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  {...registerPayment('expiryDate', { required: true })}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  {...registerPayment('cvv', { required: true })}
                  placeholder="123"
                  maxLength={3}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clientId">Client ID (Optional)</Label>
              <Input
                {...registerPayment('clientId')}
                type="number"
                placeholder="Link to specific client"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                Schedule Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}