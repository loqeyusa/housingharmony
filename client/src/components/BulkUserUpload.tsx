import { useState } from "react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Users, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BulkUploadResult {
  success: number;
  errors: number;
  createdUsers: any[];
  errorDetails: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

interface BulkUserUploadProps {
  onUploadComplete?: () => void;
}

export function BulkUserUpload({ onUploadComplete }: BulkUserUploadProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest('/api/upload/users', {
        method: 'POST',
      });
      return {
        method: 'PUT' as const,
        url: response.uploadURL,
      };
    } catch (error) {
      console.error('Failed to get upload parameters:', error);
      throw new Error('Failed to get upload URL');
    }
  };

  const handleUploadComplete = async (result: { successful: Array<{ uploadURL: string; name: string }> }) => {
    if (result.successful.length === 0) {
      toast({
        title: "Upload failed",
        description: "No files were uploaded successfully",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const uploadedFile = result.successful[0];
      const fileUrl = uploadedFile.uploadURL;

      const response = await apiRequest('/api/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl }),
      });

      setUploadResult(response);

      if (response.success > 0) {
        toast({
          title: "Bulk upload completed",
          description: `Successfully created ${response.success} users${response.errors > 0 ? ` with ${response.errors} errors` : ''}`,
          variant: response.errors > 0 ? "default" : "default",
        });

        // Call the callback to refresh the users list
        onUploadComplete?.();
      } else {
        toast({
          title: "Upload failed",
          description: "No users were created. Please check the error details.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process bulk user upload",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setUploadResult(null);
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        Bulk Upload Users
      </Button>

      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk User Upload
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file to create multiple users at once. The file should contain columns for Username, Email, First Name, Last Name, and optionally Password and Company ID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                <strong>Excel File Format:</strong>
                <br />
                Required columns: Username, Email, First Name, Last Name
                <br />
                Optional columns: Password (will use default if not provided), Company
                <br />
                Make sure the first row contains column headers.
              </AlertDescription>
            </Alert>

            {/* Upload Component */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760} // 10MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {isProcessing ? "Processing..." : "Select Excel File"}
                </div>
              </ObjectUploader>
            </div>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Processing Excel file and creating users...
              </div>
            )}

            {/* Results */}
            {uploadResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Success:</span>
                    <Badge variant="secondary">{uploadResult.success}</Badge>
                  </div>
                  {uploadResult.errors > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Errors:</span>
                      <Badge variant="destructive">{uploadResult.errors}</Badge>
                    </div>
                  )}
                </div>

                {/* Success List */}
                {uploadResult.createdUsers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Successfully Created Users:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.createdUsers.map((user, index) => (
                        <div key={index} className="text-sm bg-green-50 p-2 rounded">
                          <span className="font-medium">{user.username}</span> ({user.email}) - {user.firstName} {user.lastName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error List */}
                {uploadResult.errorDetails.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.errorDetails.map((error, index) => (
                        <div key={index} className="text-sm bg-red-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium">Row {error.row}:</span>
                          </div>
                          <p className="text-red-700 ml-6">{error.error}</p>
                          {error.data && (
                            <p className="text-gray-600 ml-6 text-xs">
                              Data: {JSON.stringify(error.data, null, 2)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={closeDialog}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}