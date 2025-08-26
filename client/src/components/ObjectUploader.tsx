import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, File, X, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number; // in bytes
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string; name: string }> }) => void;
  buttonClassName?: string;
  children: React.ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName = "",
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file count
    if (files.length > maxNumberOfFiles) {
      setError(`Maximum ${maxNumberOfFiles} file(s) allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      const maxSizeMB = Math.round(maxFileSize / 1024 / 1024);
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setSelectedFiles(files);
    setError("");
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select files to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      const successful = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Get upload parameters
        const { url: uploadURL } = await onGetUploadParameters();
        
        // Upload the file
        const response = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}: ${response.statusText}`);
        }

        successful.push({
          uploadURL,
          name: file.name,
        });

        // Update progress
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      // Call completion callback
      if (onComplete) {
        onComplete({ successful });
      }

      setUploadResult(`Successfully uploaded ${successful.length} file(s)`);
      toast({
        title: "Upload successful",
        description: `${successful.length} file(s) uploaded successfully`,
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || "Upload failed");
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
    setError("");
    setUploadResult("");
    setIsUploading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    resetModal();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        disabled={isUploading}
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={(open) => !isUploading && (!open ? closeModal() : setShowModal(true))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </DialogTitle>
            <DialogDescription>
              Select files to upload. Maximum {maxNumberOfFiles} file(s), each up to {Math.round(maxFileSize / 1024 / 1024)}MB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <div>
              <Label htmlFor="file-upload">Choose Files</Label>
              <Input
                id="file-upload"
                type="file"
                multiple={maxNumberOfFiles > 1}
                onChange={handleFileSelect}
                className="mt-1"
                disabled={isUploading}
              />
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files:</Label>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      <div>
                        <div className="text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="w-full" />
                <div className="text-sm text-muted-foreground">
                  {Math.round(uploadProgress)}% complete
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {uploadResult && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{uploadResult}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={closeModal}
                disabled={isUploading}
              >
                {uploadResult ? "Close" : "Cancel"}
              </Button>
              {!uploadResult && (
                <Button 
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}