import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

const rentChangeSchema = z.object({
  newRentAmount: z.string().min(1, "Rent amount is required"),
  changeReason: z.string().min(1, "Change reason is required"),
  changeDate: z.string().min(1, "Change date is required"),
  notes: z.string().optional(),
});

type RentChangeFormData = z.infer<typeof rentChangeSchema>;

interface RentChangeDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RentChangeDialog({ property, open, onOpenChange }: RentChangeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<RentChangeFormData>({
    resolver: zodResolver(rentChangeSchema),
    defaultValues: {
      newRentAmount: "",
      changeReason: "",
      changeDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const updateRentMutation = useMutation({
    mutationFn: async (data: RentChangeFormData) => {
      if (!property) throw new Error("No property selected");
      return apiRequest(`/api/properties/${property.id}/rent`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property?.id?.toString()] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property?.id, "rent-changes"] });
      toast({
        title: "Rent Updated",
        description: "The rent amount has been successfully updated and logged.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating rent:", error);
      toast({
        title: "Error",
        description: "Failed to update rent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RentChangeFormData) => {
    updateRentMutation.mutate(data);
  };

  const commonReasons = [
    "Annual rent increase",
    "Market adjustment",
    "Property improvements",
    "Lease renewal negotiation",
    "Utility cost changes",
    "Property tax increase",
    "Maintenance cost adjustment",
    "Other",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Rent Amount</DialogTitle>
          <DialogDescription>
            {property ? (
              <>
                Current rent: <strong>${property.rentAmount}</strong> for {property.unitNumber}
              </>
            ) : (
              "Update the rent amount for this property and log the change."
            )}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newRentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Rent Amount ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter new rent amount" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="changeReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {commonReasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="changeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the rent change..." 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRentMutation.isPending}>
                {updateRentMutation.isPending ? "Updating..." : "Update Rent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}