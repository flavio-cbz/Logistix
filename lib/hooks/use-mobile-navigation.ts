"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SwipeGesture {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  direction: "left" | "right" | "up" | "down" | null;
  isSwipe: boolean;
}

interface UseMobileNavigationOptions {
  swipeThreshold?: number;
  velocityThreshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enableSwipeGestures?: boolean;
}

export function useMobileNavigation({
  swipeThreshold = 50,
  velocityThreshold = 0.3,
  onSwipeLeft,
  onSwipeRight,
  enableSwipeGestures = true,
}: UseMobileNavigationOptions = {}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  // Detect device type
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDeviceType();
    window.addEventListener("resize", checkDeviceType);
    return () => window.removeEventListener("resize", checkDeviceType);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enableSwipeGestures || !isMobile) return;

      const touch = e.touches[0]!;
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setIsSwipeActive(true);
      startTimeRef.current = Date.now();
    },
    [enableSwipeGestures, isMobile],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enableSwipeGestures || !touchStart || !isSwipeActive) return;

      const touch = e.touches[0]!;
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;

      // Prevent vertical scrolling if horizontal swipe is detected
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    },
    [enableSwipeGestures, touchStart, isSwipeActive],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enableSwipeGestures || !touchStart || !isSwipeActive) return;

      const touch = e.changedTouches[0]!;
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const deltaTime = Date.now() - startTimeRef.current;
      const velocity = Math.abs(deltaX) / deltaTime;

      const gesture: SwipeGesture = {
        startX: touchStart.x,
        startY: touchStart.y,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX,
        deltaY,
        direction: null,
        isSwipe: false,
      };

      // Determine swipe direction and validity
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > swipeThreshold && velocity > velocityThreshold) {
          gesture.isSwipe = true;
          gesture.direction = deltaX > 0 ? "right" : "left";

          // Execute callbacks
          if (gesture.direction === "left" && onSwipeLeft) {
            onSwipeLeft();
          } else if (gesture.direction === "right" && onSwipeRight) {
            onSwipeRight();
          }
        }
      }

      setTouchStart(null);
      setIsSwipeActive(false);
    },
    [
      enableSwipeGestures,
      touchStart,
      isSwipeActive,
      swipeThreshold,
      velocityThreshold,
      onSwipeLeft,
      onSwipeRight,
    ],
  );

  // Attach touch event listeners
  useEffect(() => {
    const element = swipeRef.current;
    if (!element || !enableSwipeGestures) return;

    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enableSwipeGestures]);

  // Get touch-friendly button size
  const getTouchTargetSize = useCallback(() => {
    if (isMobile) return "h-12 w-12 min-h-[48px] min-w-[48px]";
    if (isTablet) return "h-10 w-10 min-h-[40px] min-w-[40px]";
    return "h-8 w-8";
  }, [isMobile, isTablet]);

  // Get touch-friendly spacing
  const getTouchSpacing = useCallback(() => {
    if (isMobile) return "gap-4 p-4";
    if (isTablet) return "gap-3 p-3";
    return "gap-2 p-2";
  }, [isMobile, isTablet]);

  return {
    isMobile,
    isTablet,
    isSwipeActive,
    swipeRef,
    getTouchTargetSize,
    getTouchSpacing,
    deviceType: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
  };
}
