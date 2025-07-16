import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface ClientNote {
  id: number;
  clientId: number;
  userId: number;
  content: string;
  noteDate: string;
  createdAt: string;
  updatedAt: string;
  userName?: string;
}

interface ClientNotesDisplayProps {
  clientId: number;
  onAddNote: () => void;
}

export function ClientNotesDisplay({ clientId, onAddNote }: ClientNotesDisplayProps) {
  const { data: notes, isLoading, error } = useQuery<ClientNote[]>({
    queryKey: [`/api/clients/${clientId}/notes`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/notes`);
      if (!response.ok) {
        throw new Error('Failed to fetch client notes');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Client Notes
            </span>
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Client Notes
            </span>
            <Button size="sm" onClick={onAddNote}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Failed to load client notes</p>
            <p className="text-sm">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Client Notes
            <Badge variant="secondary" className="ml-2">
              {notes?.length || 0}
            </Badge>
          </span>
          <Button size="sm" onClick={onAddNote}>
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!notes || notes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm">Add your first note to get started</p>
            <Button
              onClick={onAddNote}
              className="mt-4"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Note
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {format(new Date(note.noteDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    <span>{note.userName || 'Unknown User'}</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {note.content}
                </div>
                
                <div className="text-xs text-gray-400 mt-2">
                  Added on {format(new Date(note.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}
                  {note.updatedAt !== note.createdAt && (
                    <span className="ml-2">
                      • Updated {format(new Date(note.updatedAt), 'MMM dd, yyyy \'at\' h:mm a')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}