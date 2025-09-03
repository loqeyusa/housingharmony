import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface BulkUploadResult {
  success: number;
  errors: number;
  createdClients: number;
  createdProperties: number;
  createdApplications: number;
  errorDetails: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  warnings: Array<{
    row: number;
    message: string;
    data: any;
  }>;
}

interface BulkHousingUploadProps {
  onUploadComplete?: () => void;
}

export function BulkHousingUpload({ onUploadComplete }: BulkHousingUploadProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest('POST', '/api/upload/housing');
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
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

      const response = await apiRequest('POST', '/api/housing/bulk', { fileUrl });
      const data = await response.json();

      setUploadResult(data);

      if (data.success > 0) {
        toast({
          title: "Bulk upload completed",
          description: `Successfully processed ${data.success} records${data.errors > 0 ? ` with ${data.errors} errors` : ''}`,
          variant: data.errors > 0 ? "default" : "default",
        });

        // Call the callback to refresh the data
        onUploadComplete?.();
      } else {
        toast({
          title: "Upload failed",
          description: "No records were processed. Please check the error details.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process bulk housing upload",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setUploadResult(null);
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        Bulk Upload Excel
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Upload Housing Data
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {!uploadResult && !isProcessing && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Upload an Excel file with housing data. The system will automatically detect columns and create clients, properties, and applications.
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Expected Excel Columns:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Client Information:</strong>
                      <ul className="list-disc list-inside ml-2 text-gray-600">
                        <li>Case Number</li>
                        <li>Client Name</li>
                        <li>Client Address</li>
                        <li>Cell Number</li>
                        <li>Email</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Property Information:</strong>
                      <ul className="list-disc list-inside ml-2 text-gray-600">
                        <li>Properties Management</li>
                        <li>Rental Office Address</li>
                        <li>Rent Amount</li>
                        <li>County</li>
                        <li>County Amount</li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Column names are matched automatically. The system will handle variations in naming.
                  </p>
                </div>

                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760} // 10MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="w-full"
                >
                  <div className="flex items-center justify-center gap-2 py-8">
                    <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                    <div className="text-center">
                      <p className="font-medium">Click to select Excel file</p>
                      <p className="text-sm text-gray-500">Supports .xlsx and .xls files</p>
                    </div>
                  </div>
                </ObjectUploader>
              </div>
            )}

            {isProcessing && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="font-medium">Processing Excel file...</p>
                <p className="text-sm text-gray-500">This may take a few moments for large files</p>
              </div>
            )}

            {uploadResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Successful Records</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-1">{uploadResult.success}</p>
                    <div className="text-sm text-green-700 mt-2 space-y-1">
                      {uploadResult.createdClients > 0 && <div>• {uploadResult.createdClients} clients created</div>}
                      {uploadResult.createdProperties > 0 && <div>• {uploadResult.createdProperties} properties created</div>}
                      {uploadResult.createdApplications > 0 && <div>• {uploadResult.createdApplications} applications created</div>}
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Failed Records</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900 mt-1">{uploadResult.errors}</p>
                    {uploadResult.errors > 0 && (
                      <p className="text-sm text-red-700 mt-2">Check details below</p>
                    )}
                  </div>
                </div>

                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Warnings ({uploadResult.warnings.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadResult.warnings.map((warning, index) => (
                        <div key={index} className="bg-yellow-50 p-2 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Row {warning.row}</Badge>
                            <span className="text-yellow-800">{warning.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Error Details ({uploadResult.errorDetails.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {uploadResult.errorDetails.map((error, index) => (
                        <div key={index} className="bg-red-50 p-3 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">Row {error.row}</Badge>
                            <span className="font-medium text-red-800">{error.error}</span>
                          </div>
                          {error.data && (
                            <div className="text-xs text-red-600 ml-2">
                              Data: {JSON.stringify(error.data, null, 2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                  <Button onClick={() => setShowDialog(false)}>
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}