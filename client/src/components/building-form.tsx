import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin, User, Phone, Mail } from "lucide-react";
import { insertBuildingSchema, type InsertBuilding, type Site } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BuildingFormProps {
  onClose: () => void;
  building?: any;
}

export default function BuildingForm({ onClose, building }: BuildingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amenities, setAmenities] = useState<string[]>(building?.amenities || []);
  const [newAmenity, setNewAmenity] = useState("");

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const form = useForm<InsertBuilding>({
    resolver: zodResolver(insertBuildingSchema),
    defaultValues: {
      name: building?.name || "",
      address: building?.address || "",
      landlordName: building?.landlordName || "",
      landlordPhone: building?.landlordPhone || "",
      landlordEmail: building?.landlordEmail || "",
      totalUnits: building?.totalUnits || 1,
      buildingType: building?.buildingType || "single_unit",
      propertyManager: building?.propertyManager || "",
      propertyManagerPhone: building?.propertyManagerPhone || "",
      amenities: building?.amenities || [],
      parkingSpaces: building?.parkingSpaces || 0,
      notes: building?.notes || "",
      status: building?.status || "active",
      siteId: building?.siteId || null,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertBuilding) => apiRequest("/api/buildings", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      toast({ title: "Building created successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error creating building", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<InsertBuilding>) => 
      apiRequest(`/api/buildings/${building.id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      toast({ title: "Building updated successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error updating building", description: error.message, variant: "destructive" });
    },
  });

  const addAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      const updatedAmenities = [...amenities, newAmenity.trim()];
      setAmenities(updatedAmenities);
      form.setValue("amenities", updatedAmenities);
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenity: string) => {
    const updatedAmenities = amenities.filter(a => a !== amenity);
    setAmenities(updatedAmenities);
    form.setValue("amenities", updatedAmenities);
  };

  const onSubmit = (data: InsertBuilding) => {
    const buildingData = { ...data, amenities };
    if (building) {
      updateMutation.mutate(buildingData);
    } else {
      createMutation.mutate(buildingData);
    }
  };

  const buildingTypes = [
    { value: "single_unit", label: "Single Unit" },
    { value: "apartment", label: "Apartment Building" },
    { value: "townhouse", label: "Townhouse" },
    { value: "duplex", label: "Duplex" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {building ? "Edit Building" : "Add New Building"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Building Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sunset Apartments"
                  {...form.register("name")}
                />
              </div>
              <div>
                <Label htmlFor="buildingType">Building Type</Label>
                <Select 
                  value={form.watch("buildingType")} 
                  onValueChange={(value) => form.setValue("buildingType", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building type" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildingTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </Label>
              <Input
                id="address"
                placeholder="Full building address"
                {...form.register("address")}
              />
            </div>

            <div>
              <Label htmlFor="siteId">Site (Optional)</Label>
              <Select 
                value={form.watch("siteId")?.toString() || ""} 
                onValueChange={(value) => form.setValue("siteId", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Site</SelectItem>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name} - {site.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Landlord Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Landlord Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="landlordName">Landlord Name</Label>
                  <Input
                    id="landlordName"
                    placeholder="Full name"
                    {...form.register("landlordName")}
                  />
                </div>
                <div>
                  <Label htmlFor="landlordPhone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </Label>
                  <Input
                    id="landlordPhone"
                    placeholder="(555) 123-4567"
                    {...form.register("landlordPhone")}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="landlordEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="landlordEmail"
                  type="email"
                  placeholder="landlord@example.com"
                  {...form.register("landlordEmail")}
                />
              </div>
            </div>

            {/* Property Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyManager">Property Manager (Optional)</Label>
                  <Input
                    id="propertyManager"
                    placeholder="On-site manager name"
                    {...form.register("propertyManager")}
                  />
                </div>
                <div>
                  <Label htmlFor="propertyManagerPhone">Manager Phone</Label>
                  <Input
                    id="propertyManagerPhone"
                    placeholder="(555) 123-4567"
                    {...form.register("propertyManagerPhone")}
                  />
                </div>
              </div>
            </div>

            {/* Building Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalUnits">Total Units</Label>
                <Input
                  id="totalUnits"
                  type="number"
                  min="1"
                  {...form.register("totalUnits", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="parkingSpaces">Parking Spaces</Label>
                <Input
                  id="parkingSpaces"
                  type="number"
                  min="0"
                  {...form.register("parkingSpaces", { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Amenities */}
            <div>
              <Label>Building Amenities</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  placeholder="Add amenity (e.g., Pool, Gym, Laundry)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                />
                <Button type="button" onClick={addAmenity} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground" onClick={() => removeAmenity(amenity)}>
                    {amenity} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the building"
                rows={3}
                {...form.register("notes")}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : (building ? "Update Building" : "Create Building")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}