import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UploadStats {
  clientsCreated: number;
  propertiesCreated: number;
  buildingsCreated: number;
}

interface UploadResponse {
  success: boolean;
  message: string;
  stats: UploadStats;
}

export function CsvUpload({ onSuccess }: { onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.toLowerCase();
      if (fileExtension.endsWith('.csv') || fileExtension.endsWith('.xlsx') || fileExtension.endsWith('.xls')) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select a CSV or Excel file (.csv, .xlsx, .xls)"
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a file to upload"
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/clients/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success) {
        setUploadResult(result);
        toast({
          title: "Upload successful",
          description: result.message
        });
        onSuccess?.();
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    // Reset the file input
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Import Client Data</h3>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Upload a CSV or Excel file with client data. The file should contain columns like:
        Case Number, Client Name, Client Address, Properties Management, County, etc.
      </div>

      {!uploadResult && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file-input">Select File</Label>
            <Input
              id="csv-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              data-testid="file-input-csv"
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="w-full"
            data-testid="button-upload"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      )}

      {uploadResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800 dark:text-green-200">
                Upload Successful
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                {uploadResult.message}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {uploadResult.stats.clientsCreated}
              </div>
              <div className="text-sm text-muted-foreground">Clients Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {uploadResult.stats.propertiesCreated}
              </div>
              <div className="text-sm text-muted-foreground">Properties Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {uploadResult.stats.buildingsCreated}
              </div>
              <div className="text-sm text-muted-foreground">Buildings Created</div>
            </div>
          </div>

          <Button 
            onClick={resetUpload} 
            variant="outline" 
            className="w-full"
            data-testid="button-upload-another"
          >
            Upload Another File
          </Button>
        </div>
      )}
    </div>
  );
}