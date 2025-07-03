import { useState, useEffect } from 'react';

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    const checkDeviceType = () => {
      const ua = navigator.userAgent;
      setUserAgent(ua);

      // Check for mobile devices
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const tabletRegex = /iPad|Android(?=.*Mobile)|PlayBook|Kindle/i;
      
      // More comprehensive mobile detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      const hasPointerCoarse = window.matchMedia('(pointer: coarse)').matches;
      const hasHoverNone = window.matchMedia('(hover: none)').matches;
      
      // Mobile device detection
      const mobileUA = mobileRegex.test(ua);
      const mobileFeatures = isTouchDevice && (isSmallScreen || hasPointerCoarse || hasHoverNone);
      
      // Tablet detection
      const tabletUA = tabletRegex.test(ua);
      const tabletFeatures = isTouchDevice && window.innerWidth >= 768 && window.innerWidth <= 1024;
      
      setIsMobile(mobileUA || (mobileFeatures && !tabletUA && !tabletFeatures));
      setIsTablet(tabletUA || tabletFeatures);
    };

    checkDeviceType();
    
    // Re-check on window resize
    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);
    
    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  // Additional mobile detection methods
  const isMobileViewport = window.innerWidth <= 768;
  const isTouchScreen = 'ontouchstart' in window;
  const isPortrait = window.innerHeight > window.innerWidth;
  
  // Check if user is on a mobile browser
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isMobileBrowser = isAndroid || isIOS;
  
  // Check if running as PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
               (window.navigator as any).standalone === true;

  return {
    isMobile,
    isTablet,
    isMobileViewport,
    isTouchScreen,
    isPortrait,
    isAndroid,
    isIOS,
    isMobileBrowser,
    isPWA,
    userAgent,
    // Combined mobile check
    shouldUseMobileInterface: isMobile || isMobileViewport || (isTouchScreen && isPortrait)
  };
}