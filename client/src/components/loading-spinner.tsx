import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-gray-500`} />
    </div>
  );
}

export function PageLoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4 animate-fade-in">
      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      <p className="text-gray-600 text-lg animate-pulse">{message}</p>
    </div>
  );
}

export function FullPageLoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
        <p className="text-gray-700 text-xl font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
}