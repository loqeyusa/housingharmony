import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Mail, Phone, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import ClientForm from "@/components/client-form";
import type { Client } from "@shared/schema";

export default function Clients() {
  const [showClientForm, setShowClientForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        <Button onClick={() => setShowClientForm(true)} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">No clients found</div>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first client"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowClientForm(true)} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add First Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                console.log('Navigating to client:', client.id);
                setLocation(`/clients/${client.id}`);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {client.firstName} {client.lastName}
                      </CardTitle>
                    </div>
                  </div>
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                    {client.status}
                  </Badge>
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
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 capitalize">
                      {client.employmentStatus.replace('-', ' ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Registered {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientForm onClose={() => setShowClientForm(false)} />
      )}
    </div>
  );
}
