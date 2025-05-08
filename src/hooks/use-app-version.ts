"use client";

import { useState, useEffect } from "react";
import { getAppVersion } from "@/app/actions/utils";

/**
 * Hook to fetch the application version from environment variables via a server action
 * @returns {object} Object containing the version string and loading state
 */
export function useAppVersion() {
  const [version, setVersion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        setIsLoading(true);
        const appVersion = await getAppVersion();
        setVersion(appVersion);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch app version"),
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return { version, isLoading, error };
}
