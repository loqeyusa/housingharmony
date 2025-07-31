import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, MapPin, User, Phone, Mail, Bed, Bath, Square, Building2, Home, Users } from "lucide-react";
import { useState } from "react";
import PropertyForm from "@/components/property-form";
import BuildingForm from "@/components/building-form";
import type { Property, Building } from "@shared/schema";
import { PageLoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/contexts/auth-context";

export default function Properties() {
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("units");
  const { user } = useAuth();

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: !!user,
  });

  const { data: buildings = [], isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    enabled: !!user,
  });

  const isLoading = propertiesLoading || buildingsLoading;

  // Group properties by building
  const propertiesByBuilding = properties.reduce((acc, property) => {
    const buildingId = property.buildingId;
    if (!acc[buildingId]) {
      acc[buildingId] = [];
    }
    acc[buildingId].push(property);
    return acc;
  }, {} as Record<number, Property[]>);

  const filteredBuildings = buildings.filter(building =>
    building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.landlordName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (building.name && building.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProperties = properties.filter(property => {
    const building = buildings.find(b => b.id === property.buildingId);
    if (!building) return false;
    
    return building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
           building.landlordName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (building.name && building.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
           property.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <PageLoadingSpinner message="Loading properties..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={() => setShowPropertyForm(true)} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">No properties found</div>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first property"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowPropertyForm(true)} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add First Property
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-start space-x-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                      <span className="line-clamp-2">{property.address}</span>
                    </CardTitle>
                  </div>
                  <Badge className={getStatusColor(property.status)}>
                    {property.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Property Details */}
                  <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-slate-600">
                        <Bed className="w-4 h-4" />
                        <span className="text-sm font-medium">{property.bedrooms}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Bedrooms</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-slate-600">
                        <Bath className="w-4 h-4" />
                        <span className="text-sm font-medium">{property.bathrooms}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Bathrooms</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-slate-600">
                        <Square className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {property.squareFootage || 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Sq Ft</p>
                    </div>
                  </div>

                  {/* Rental Information */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Monthly Rent</span>
                      <span className="font-semibold text-slate-900">
                        ${parseFloat(property.rentAmount.toString()).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Security Deposit</span>
                      <span className="font-semibold text-slate-900">
                        ${parseFloat(property.depositAmount.toString()).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Landlord Information */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <h4 className="text-sm font-medium text-slate-900 flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>Landlord</span>
                    </h4>
                    <p className="text-sm text-slate-700">{property.landlordName}</p>
                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <Phone className="w-3 h-3" />
                      <span>{property.landlordPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{property.landlordEmail}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-slate-400">
                      Added {new Date(property.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Property Form Modal */}
      {showPropertyForm && (
        <PropertyForm onClose={() => setShowPropertyForm(false)} />
      )}
    </div>
  );
}
