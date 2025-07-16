import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { X, Calendar, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const clientNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  noteDate: z.string().min(1, "Note date is required"),
  userId: z.number(),
});

type ClientNoteData = z.infer<typeof clientNoteSchema>;

interface ClientNotesFormProps {
  clientId: number;
  clientName: string;
  currentUserId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClientNotesForm({
  clientId,
  clientName,
  currentUserId,
  onClose,
  onSuccess,
}: ClientNotesFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientNoteData>({
    resolver: zodResolver(clientNoteSchema),
    defaultValues: {
      content: "",
      noteDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      userId: currentUserId,
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: ClientNoteData) => {
      console.log("Making API request with data:", noteData);
      console.log("API endpoint:", `/api/clients/${clientId}/notes`);
      return await apiRequest(`/api/clients/${clientId}/notes`, {
        method: "POST",
        body: noteData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/notes`] });
      toast({
        title: "Success",
        description: "Client note added successfully",
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to add client note",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ClientNoteData) => {
    console.log("Form submitted with data:", data);
    console.log("Client ID:", clientId);
    console.log("Current User ID:", currentUserId);
    
    setIsSubmitting(true);
    try {
      await createNoteMutation.mutateAsync(data);
    } catch (error) {
      console.error("Failed to create client note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Add Client Note</CardTitle>
            <CardDescription>
              Add a note for {clientName}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="noteDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Note Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your note here..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}