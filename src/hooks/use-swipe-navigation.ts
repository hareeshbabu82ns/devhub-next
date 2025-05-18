import { useState, useEffect, RefObject, useCallback } from "react";

interface SwipeNavigationOptions {
  /**
   * The minimum distance in pixels that must be swiped to trigger a navigation action
   */
  threshold?: number;

  /**
   * Whether swipe navigation should be enabled
   */
  enabled?: boolean;

  /**
   * Callback when user swipes right-to-left (next)
   */
  onSwipeLeft?: () => void;

  /**
   * Callback when user swipes left-to-right (previous)
   */
  onSwipeRight?: () => void;
}

/**
 * Hook for handling swipe gestures for navigation, particularly useful on mobile/touch devices
 *
 * @param ref - The ref for the element that should detect swipe gestures
 * @param options - Configuration options for swipe behavior
 */
export function useSwipeNavigation<T extends HTMLElement>(
  ref: RefObject<T>,
  {
    threshold = 100,
    enabled = true,
    onSwipeLeft,
    onSwipeRight,
  }: SwipeNavigationOptions,
) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      setTouchStart(e.targetTouches[0].clientX);
      setTouchEnd(e.targetTouches[0].clientX);
      setIsSwiping(true);
    },
    [enabled],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isSwiping) return;
      const currentX = e.targetTouches[0].clientX;
      setTouchEnd(currentX);

      // If there's a significant horizontal swipe, prevent default scrolling
      // This helps with smooth navigation for deliberate swipes
      if (touchStart !== null) {
        const horizontalDistance = Math.abs(touchStart - currentX);
        const verticalDistance = Math.abs(
          e.targetTouches[0].clientY - e.targetTouches[0].clientY,
        );

        // Only prevent default if the gesture is more horizontal than vertical
        // and beyond a small threshold (to allow regular scrolling for non-swipe gestures)
        if (
          horizontalDistance > 30 &&
          horizontalDistance > verticalDistance * 1.5
        ) {
          e.preventDefault();
        }
      }
    },
    [enabled, isSwiping, touchStart],
  );

  // Handle touch end and determine swipe direction
  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isSwiping || touchStart === null || touchEnd === null) {
      setIsSwiping(false);
      return;
    }

    // Calculate the distance of the swipe
    const distance = touchStart - touchEnd;
    const isSignificantSwipe = Math.abs(distance) > threshold;

    if (isSignificantSwipe) {
      if (distance > 0) {
        // Swipe left (next)
        onSwipeLeft?.();
      } else {
        // Swipe right (previous)
        onSwipeRight?.();
      }
    }

    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
  }, [
    enabled,
    isSwiping,
    onSwipeLeft,
    onSwipeRight,
    touchEnd,
    touchStart,
    threshold,
  ]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    // Add event listeners
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    // Use passive: false to allow preventDefault for preventing scroll during swipe
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);

    // Cleanup function to remove event listeners
    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isSwiping,
  };
}

export default useSwipeNavigation;
