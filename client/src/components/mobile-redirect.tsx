import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMobileDetection } from '@/hooks/use-mobile-detection';

export default function MobileRedirect() {
  const [location, setLocation] = useLocation();
  const { shouldUseMobileInterface, isMobile, isMobileViewport } = useMobileDetection();

  useEffect(() => {
    // Don't redirect if already on mobile page or login page
    if (location === '/mobile' || location === '/login') {
      return;
    }

    // Redirect to mobile interface for mobile devices
    if (shouldUseMobileInterface) {
      console.log('Mobile device detected, redirecting to mobile interface');
      setLocation('/mobile');
    }
  }, [location, setLocation, shouldUseMobileInterface]);

  useEffect(() => {
    // Add mobile class to body for styling
    if (shouldUseMobileInterface) {
      document.body.classList.add('mobile-device');
      document.body.classList.add('touch-device');
    } else {
      document.body.classList.remove('mobile-device');
      document.body.classList.remove('touch-device');
    }

    // Add specific device classes
    if (isMobile) {
      document.body.classList.add('mobile-phone');
    } else {
      document.body.classList.remove('mobile-phone');
    }

    if (isMobileViewport) {
      document.body.classList.add('mobile-viewport');
    } else {
      document.body.classList.remove('mobile-viewport');
    }
  }, [shouldUseMobileInterface, isMobile, isMobileViewport]);

  return null; // This component doesn't render anything
}