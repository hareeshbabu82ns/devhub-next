"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook that returns whether a media query matches the current viewport
 * @param query The media query to check
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Default to false for SSR
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Create a media query list
    const mediaQuery = window.matchMedia(query);

    // Set the initial match state
    setMatches(mediaQuery.matches);

    // Define the handler to track changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add the event listener
    mediaQuery.addEventListener("change", handler);

    // Clean up the listener when the component is unmounted
    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}
