import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Building, FileText } from "lucide-react";
import { useLocation } from "wouter";
import type { Client } from "@shared/schema";
import { PageLoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/contexts/auth-context";

export default function Counties() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", user?.id],
    enabled: !!user,
  });

  if (isLoading) {
    return <PageLoadingSpinner message="Loading counties..." />;
  }

  // Group clients by county
  const countiesSummary = clients.reduce((acc, client) => {
    const county = client.county || 'Unknown';
    if (!acc[county]) {
      acc[county] = {
        name: county,
        totalClients: 0,
        activeClients: 0,
        inactiveClients: 0,
        clients: []
      };
    }
    acc[county].totalClients++;
    acc[county].clients.push(client);
    if (client.status === 'active') {
      acc[county].activeClients++;
    } else {
      acc[county].inactiveClients++;
    }
    return acc;
  }, {} as Record<string, {
    name: string;
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
    clients: Client[];
  }>);

  const counties = Object.values(countiesSummary).sort((a, b) => b.totalClients - a.totalClients);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Counties</h1>
          <p className="text-slate-600">Overview of clients across all counties</p>
        </div>
      </div>

      {/* Counties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {counties.map((county) => (
          <Card 
            key={county.name} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation(`/county/${encodeURIComponent(county.name)}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {county.name}
                </CardTitle>
                <Badge variant={county.activeClients > 0 ? "default" : "secondary"}>
                  {county.totalClients} clients
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-slate-600">Active</span>
                  </div>
                  <span className="font-semibold text-green-600">{county.activeClients}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-slate-600">Inactive</span>
                  </div>
                  <span className="font-semibold text-gray-600">{county.inactiveClients}</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Clients</span>
                    <span className="font-bold text-slate-900">{county.totalClients}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{counties.length}</div>
              <div className="text-sm text-slate-600">Counties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {counties.reduce((sum, county) => sum + county.activeClients, 0)}
              </div>
              <div className="text-sm text-slate-600">Active Clients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">
                {counties.reduce((sum, county) => sum + county.totalClients, 0)}
              </div>
              <div className="text-sm text-slate-600">Total Clients</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}