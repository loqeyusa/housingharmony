import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TestClientDetails() {
  const { clientId } = useParams<{ clientId: string }>();

  console.log('TestClientDetails loaded with clientId:', clientId);

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>
        <h1 className="text-2xl font-bold">Test Client Details</h1>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
        <p><strong>Client ID:</strong> {clientId}</p>
        <p><strong>URL:</strong> {window.location.pathname}</p>
        <p><strong>Status:</strong> Navigation working!</p>
      </div>
    </div>
  );
}