import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema, type InsertCompany } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Phone, Mail, Globe, CreditCard } from "lucide-react";

interface CompanyFormProps {
  onSubmit: (data: InsertCompany) => void;
  isLoading?: boolean;
  defaultValues?: Partial<InsertCompany>;
}

export function CompanyForm({ onSubmit, isLoading, defaultValues }: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      subscriptionPlan: "basic",
      maxClients: 100,
      maxUsers: 5,
      ...defaultValues,
    },
  });

  const subscriptionPlan = watch("subscriptionPlan");

  const handlePlanChange = (plan: string) => {
    setValue("subscriptionPlan", plan);
    
    // Set default limits based on plan
    switch (plan) {
      case "basic":
        setValue("maxClients", 100);
        setValue("maxUsers", 5);
        break;
      case "premium":
        setValue("maxClients", 500);
        setValue("maxUsers", 20);
        break;
      case "enterprise":
        setValue("maxClients", 2000);
        setValue("maxUsers", 100);
        break;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Basic company details and registration information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Legal Company Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="ABC Housing Solutions LLC"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                {...register("displayName")}
                placeholder="ABC Housing"
              />
              {errors.displayName && (
                <p className="text-sm text-red-500 mt-1">{errors.displayName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Company Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="info@abchousing.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                {...register("address")}
                placeholder="123 Main St, City, State 12345"
                rows={3}
              />
              {errors.address && (
                <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                {...register("website")}
                placeholder="https://www.abchousing.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Person */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Primary Contact
            </CardTitle>
            <CardDescription>
              Main point of contact for this company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contactPersonName">Contact Person Name</Label>
              <Input
                id="contactPersonName"
                {...register("contactPersonName")}
                placeholder="John Smith"
              />
              {errors.contactPersonName && (
                <p className="text-sm text-red-500 mt-1">{errors.contactPersonName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactPersonEmail">Contact Person Email</Label>
              <Input
                id="contactPersonEmail"
                type="email"
                {...register("contactPersonEmail")}
                placeholder="john@abchousing.com"
              />
              {errors.contactPersonEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.contactPersonEmail.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactPersonPhone">Contact Person Phone</Label>
              <Input
                id="contactPersonPhone"
                {...register("contactPersonPhone")}
                placeholder="(555) 123-4567"
              />
              {errors.contactPersonPhone && (
                <p className="text-sm text-red-500 mt-1">{errors.contactPersonPhone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="registrationNumber">Registration Number (Optional)</Label>
              <Input
                id="registrationNumber"
                {...register("registrationNumber")}
                placeholder="REG-123456"
              />
            </div>

            <div>
              <Label htmlFor="taxId">Tax ID (Optional)</Label>
              <Input
                id="taxId"
                {...register("taxId")}
                placeholder="12-3456789"
              />
            </div>

            <div>
              <Label htmlFor="licenseNumber">License Number (Optional)</Label>
              <Input
                id="licenseNumber"
                {...register("licenseNumber")}
                placeholder="LIC-789012"
              />
            </div>

            <div>
              <Label htmlFor="licenseExpirationDate">License Expiration (Optional)</Label>
              <Input
                id="licenseExpirationDate"
                type="date"
                {...register("licenseExpirationDate")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Plan
          </CardTitle>
          <CardDescription>
            Choose the appropriate plan for this company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="subscriptionPlan">Plan Type</Label>
              <Select value={subscriptionPlan} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxClients">Max Clients</Label>
              <Input
                id="maxClients"
                type="number"
                {...register("maxClients", { valueAsNumber: true })}
                placeholder="100"
              />
              {errors.maxClients && (
                <p className="text-sm text-red-500 mt-1">{errors.maxClients.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="maxUsers">Max Users</Label>
              <Input
                id="maxUsers"
                type="number"
                {...register("maxUsers", { valueAsNumber: true })}
                placeholder="5"
              />
              {errors.maxUsers && (
                <p className="text-sm text-red-500 mt-1">{errors.maxUsers.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Any additional notes about this company..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Company"}
        </Button>
      </div>
    </form>
  );
}