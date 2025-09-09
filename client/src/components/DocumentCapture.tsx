import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Check, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DocumentCaptureProps {
  onDocumentCaptured: (imageData: string) => void;
  isProcessing?: boolean;
}

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsStartingCamera(true);
    setCameraError(null);
    
    try {
      // Mobile-optimized constraints
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera for documents
          width: { ideal: 1920, min: 720 },
          height: { ideal: 1080, min: 480 },
        }
      };

      console.log('Requesting camera access with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted, setting stream');
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('Video element found, setting srcObject');
        
        // Force video to load and play on mobile
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, attempting play');
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => console.log('Video playing successfully'))
              .catch(e => {
                console.error('Play failed:', e);
                // Try to force play after a short delay
                setTimeout(() => {
                  videoRef.current?.play().catch(e2 => console.error('Retry play failed:', e2));
                }, 100);
              });
          }
        };
        
        // Also try to play immediately for some browsers
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            videoRef.current.play().catch(e => console.log('Immediate play attempt failed:', e));
          }
        }, 200);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      // Try fallback with simpler constraints
      try {
        console.log('Trying fallback camera access');
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error('Fallback play failed:', e));
          };
        }
      } catch (fallbackError: any) {
        console.error('Error accessing any camera:', fallbackError);
        setCameraError(
          error.name === 'NotAllowedError' 
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Camera not available. Please check your device settings.'
        );
      }
    }
    setIsStartingCamera(false);
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      setCapturedImage(null);
      stopCamera();
      onClose();
    }
  }, [capturedImage, onCapture, stopCamera, onClose]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  }, [stopCamera, onClose]);

  // Auto-start camera when modal opens
  useEffect(() => {
    if (isOpen && !stream && !capturedImage) {
      console.log('Modal opened, auto-starting camera');
      startCamera();
    }
  }, [isOpen, stream, capturedImage, startCamera]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
    }
  }, [isOpen, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh]" data-testid="camera-modal">
        <DialogHeader>
          <DialogTitle>Capture Payment Document</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 h-full">
          {/* Loading/Error States */}
          {(isStartingCamera || (!stream && !capturedImage && !cameraError)) && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Camera className="w-16 h-16 text-gray-400" />
              <p className="text-lg text-gray-600">
                {isStartingCamera ? 'Starting camera...' : 'Initializing camera...'}
              </p>
              {isStartingCamera && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              )}
            </div>
          )}

          {/* Camera Error State */}
          {cameraError && !stream && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Camera className="w-16 h-16 text-red-400" />
              <p className="text-lg text-red-600 text-center px-4">{cameraError}</p>
              <Button 
                onClick={startCamera} 
                disabled={isStartingCamera}
                data-testid="button-retry-camera"
                className="flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Try Again</span>
              </Button>
            </div>
          )}

          {stream && !capturedImage && (
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="relative w-full max-w-md">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  className="w-full h-auto max-h-96 rounded-lg shadow-lg bg-gray-900"
                  style={{ 
                    aspectRatio: '4/3',
                    objectFit: 'cover',
                    minHeight: '240px'
                  }}
                  onCanPlay={() => {
                    console.log('Video can play - attempting to start');
                    if (videoRef.current) {
                      videoRef.current.play().catch(e => console.log('onCanPlay play failed:', e));
                    }
                  }}
                  onLoadedData={() => {
                    console.log('Video data loaded');
                  }}
                  data-testid="camera-video"
                />
                <div className="absolute inset-0 border-2 border-dashed border-white opacity-50 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 right-4 text-white text-center">
                    <p className="bg-black bg-opacity-75 rounded px-3 py-2 text-sm font-medium">
                      Position document within frame
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  data-testid="button-cancel-capture"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={capturePhoto}
                  data-testid="button-capture-photo"
                  className="flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture</span>
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="flex flex-col items-center space-y-4">
              <img
                src={capturedImage}
                alt="Captured document"
                className="max-w-full max-h-96 rounded-lg shadow-lg"
                data-testid="captured-image"
              />
              
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  onClick={retakePhoto}
                  data-testid="button-retake-photo"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button 
                  onClick={confirmCapture}
                  data-testid="button-confirm-capture"
                  className="flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Image</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
}

export function DocumentCapture({ onDocumentCaptured, isProcessing = false }: DocumentCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        onDocumentCaptured(imageData);
      };
      reader.readAsDataURL(file);
    }
  }, [onDocumentCaptured]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium">Payment Document Capture</h3>
          <Badge variant="secondary">AI-Powered</Badge>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Capture or upload county payment documents for automatic processing. 
          The system will analyze the document and extract payment information for multiple clients.
        </p>

        <div className="flex space-x-3">
          <Button
            onClick={() => setShowCamera(true)}
            disabled={isProcessing}
            data-testid="button-open-camera"
            className="flex items-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : 'Capture Document'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            data-testid="button-upload-file"
            className="flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          data-testid="file-input"
        />
      </Card>

      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={onDocumentCaptured}
      />
    </div>
  );
}