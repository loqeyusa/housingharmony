import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Mail, Phone, Calendar, DollarSign, MapPin } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Client } from "@shared/schema";

export default function CountyDetails() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get county name from URL
  const countyName = decodeURIComponent(window.location.pathname.split('/county/')[1] || '');

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Filter clients by county
  const countyClients = clients.filter(client => 
    (client.site || 'Unknown') === countyName
  );

  const filteredClients = countyClients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.vendorNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeClients = countyClients.filter(client => client.status === 'active').length;
  const inactiveClients = countyClients.filter(client => client.status === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/counties')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Counties
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              {countyName} County
            </h1>
            <p className="text-slate-600">
              {countyClients.length} clients ({activeClients} active, {inactiveClients} inactive)
            </p>
          </div>
        </div>
        
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* County Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Clients</p>
                <p className="text-2xl font-bold text-slate-900">{countyClients.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Clients</p>
                <p className="text-2xl font-bold text-green-600">{activeClients}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Badge className="h-4 w-4 text-green-600 bg-transparent border-0 p-0">✓</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Inactive Clients</p>
                <p className="text-2xl font-bold text-gray-600">{inactiveClients}</p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Badge className="h-4 w-4 text-gray-600 bg-transparent border-0 p-0">-</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">No clients found</div>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : `No clients found in ${countyName} County`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/client/${client.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {client.firstName} {client.lastName}
                  </CardTitle>
                  <Badge variant={client.status === "active" ? "default" : "secondary"}>
                    {client.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>{client.dateOfBirth}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <DollarSign className="h-4 w-4" />
                    <span>${client.monthlyIncome}</span>
                  </div>
                  {client.vendorNumber && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Badge variant="outline" className="text-xs">
                        {client.vendorNumber}
                      </Badge>
                      <span className="text-xs">{client.cluster}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}