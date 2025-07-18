import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Activity,
  Search,
  Calendar,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Eye
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditLog, User as UserType } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

export default function ActivityLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [limit, setLimit] = useState(100);
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", { limit, userFilter: userFilter === "all" ? undefined : userFilter }],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Filter logs based on search and filters
  const filteredLogs = auditLogs.filter(log => {
    if (searchTerm && !log.action.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !log.resource?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (actionFilter !== "all" && log.action !== actionFilter) {
      return false;
    }

    // Time range filter
    if (selectedTimeRange !== "all") {
      const logDate = new Date(log.timestamp);
      const now = new Date();
      const hours = parseInt(selectedTimeRange.replace('h', ''));
      const cutoff = new Date(now.getTime() - (hours * 60 * 60 * 1000));
      if (logDate < cutoff) {
        return false;
      }
    }

    return true;
  });

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));

  // Get action badge variant
  const getActionBadge = (action: string) => {
    if (action.includes("login")) {
      return action.includes("failed") ? "destructive" : "default";
    }
    if (action.includes("create")) return "default";
    if (action.includes("update") || action.includes("assign")) return "secondary";
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    if (action.includes("system_admin")) return "outline";
    return "outline";
  };

  // Get activity icon
  const getActivityIcon = (action: string) => {
    if (action.includes("login")) return action.includes("failed") ? XCircle : CheckCircle;
    if (action.includes("create")) return CheckCircle;
    if (action.includes("update")) return Clock;
    if (action.includes("delete")) return XCircle;
    if (action.includes("system_admin")) return Shield;
    return Activity;
  };

  // Get user display name
  const getUserDisplayName = (userId: number | null) => {
    if (!userId) return "System";
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName} (@${user.username})` : `User #${userId}`;
  };

  // Activity statistics
  const stats = {
    total: filteredLogs.length,
    logins: filteredLogs.filter(log => log.action === "login").length,
    failed_logins: filteredLogs.filter(log => log.action === "login_failed").length,
    system_access: filteredLogs.filter(log => log.action.includes("system_admin")).length,
    user_actions: filteredLogs.filter(log => log.action.includes("user") || log.action.includes("role")).length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            Activity Logs
          </h1>
          <p className="text-gray-600 mt-2">Monitor system activity and security events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful Logins</p>
                <p className="text-2xl font-bold text-green-600">{stats.logins}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed Logins</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed_logins}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Access</p>
                <p className="text-2xl font-bold text-orange-600">{stats.system_access}</p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">User Actions</p>
                <p className="text-2xl font-bold text-purple-600">{stats.user_actions}</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="user-actions">User Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search actions, resources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {uniqueActions.map(action => (
                        <SelectItem key={action} value={action}>
                          {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="168h">Last Week</SelectItem>
                      <SelectItem value="720h">Last Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Limit</Label>
                  <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 events</SelectItem>
                      <SelectItem value="100">100 events</SelectItem>
                      <SelectItem value="250">250 events</SelectItem>
                      <SelectItem value="500">500 events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Events ({filteredLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-4 w-4 animate-spin" />
                          Loading activity logs...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No activity logs found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => {
                      const ActivityIcon = getActivityIcon(log.action);
                      
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{getUserDisplayName(log.userId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ActivityIcon className="h-4 w-4" />
                              <Badge variant={getActionBadge(log.action)}>
                                {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{log.resource || 'N/A'}</span>
                            {log.resourceId && (
                              <span className="text-xs text-gray-500 ml-2">#{log.resourceId}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">{log.ipAddress || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            {log.details && (
                              <div className="text-xs">
                                <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                                  {typeof log.details === 'string' 
                                    ? log.details 
                                    : JSON.stringify(log.details).slice(0, 100)
                                  }
                                  {typeof log.details !== 'string' && JSON.stringify(log.details).length > 100 && '...'}
                                </code>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs
                    .filter(log => log.action.includes("login") || log.action.includes("system_admin"))
                    .map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}</TableCell>
                        <TableCell>
                          <Badge variant={getActionBadge(log.action)}>
                            {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>{getUserDisplayName(log.userId)}</TableCell>
                        <TableCell>
                          {log.action.includes("failed") ? (
                            <Badge variant="destructive">Failed</Badge>
                          ) : (
                            <Badge variant="default">Success</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.ipAddress || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-actions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Management Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs
                    .filter(log => log.action.includes("user") || log.action.includes("role"))
                    .map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}</TableCell>
                        <TableCell>
                          <Badge variant={getActionBadge(log.action)}>
                            {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>{getUserDisplayName(log.userId)}</TableCell>
                        <TableCell>
                          {log.resource} {log.resourceId && `#${log.resourceId}`}
                        </TableCell>
                        <TableCell>
                          {log.details && (
                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                              {typeof log.details === 'string' 
                                ? log.details 
                                : JSON.stringify(log.details)
                              }
                            </code>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}