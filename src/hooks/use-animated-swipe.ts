import { useState, useEffect, RefObject, useCallback } from "react";

interface AnimatedSwipeOptions {
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

  /**
   * Maximum translation for animation effect (in pixels)
   */
  maxTranslation?: number;
}

/**
 * Hook for handling swipe gestures with animations for navigation
 * Provides visual feedback during swipe for better UX
 *
 * @param ref - The ref for the element that should detect swipe gestures
 * @param options - Configuration options for animated swipe behavior
 */
export function useAnimatedSwipe<T extends HTMLElement>(
  ref: RefObject<T>,
  {
    threshold = 100,
    enabled = true,
    onSwipeLeft,
    onSwipeRight,
    maxTranslation = 100,
  }: AnimatedSwipeOptions,
) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState("");

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const clientX = e.targetTouches[0].clientX;
      setTouchStart(clientX);
      setTouchEnd(clientX);
      setIsSwiping(true);
      setSwipeDistance(0);
      setSwipeAnimation("");
    },
    [enabled],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isSwiping || touchStart === null) return;

      const currentX = e.targetTouches[0].clientX;
      setTouchEnd(currentX);

      // Calculate current swipe distance for animation
      const distance = touchStart - currentX;
      const boundedDistance = Math.max(
        -maxTranslation,
        Math.min(maxTranslation, -distance),
      );

      setSwipeDistance(boundedDistance);

      // If there's a significant horizontal swipe, prevent default scrolling
      // This helps with smooth navigation for deliberate swipes
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
    },
    [enabled, isSwiping, touchStart, maxTranslation],
  );

  // Handle touch end and determine swipe direction
  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isSwiping || touchStart === null || touchEnd === null) {
      setIsSwiping(false);
      setSwipeDistance(0);
      setSwipeAnimation("");
      return;
    }

    // Calculate the distance of the swipe
    const distance = touchStart - touchEnd;
    const isSignificantSwipe = Math.abs(distance) > threshold;

    if (isSignificantSwipe) {
      // Set the animation to finish the swipe transition
      if (distance > 0) {
        // Swipe left animation (next)
        setSwipeAnimation("slide-out-left");

        // After a short delay to allow the animation to play, call the handler
        setTimeout(() => {
          onSwipeLeft?.();
          setSwipeAnimation("");
          setSwipeDistance(0);
        }, 250);
      } else {
        // Swipe right animation (previous)
        setSwipeAnimation("slide-out-right");

        // After a short delay to allow the animation to play, call the handler
        setTimeout(() => {
          onSwipeRight?.();
          setSwipeAnimation("");
          setSwipeDistance(0);
        }, 250);
      }
    } else {
      // Reset swipe without triggering action - animate back to center
      setSwipeAnimation("slide-reset");
      setTimeout(() => {
        setSwipeAnimation("");
        setSwipeDistance(0);
      }, 150);
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

  // Return the swipe state for animation
  return {
    isSwiping,
    swipeDistance,
    swipeAnimation,
  };
}

export default useAnimatedSwipe;
