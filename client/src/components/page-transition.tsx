import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PageLoadingSpinner } from "./loading-spinner";

interface PageTransitionProps {
  children: ReactNode;
  delay?: number;
}

export function PageTransition({ children, delay = 300 }: PageTransitionProps) {
  const [location] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(location);

  useEffect(() => {
    if (location !== currentLocation) {
      setIsLoading(true);
      
      // Simulate loading delay for smooth transition
      const timer = setTimeout(() => {
        setCurrentLocation(location);
        setIsLoading(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [location, currentLocation, delay]);

  if (isLoading) {
    return <PageLoadingSpinner message="Loading page..." />;
  }

  return <>{children}</>;
}