import { useEffect, useRef } from "react";

interface UseDebounceOptions {
  delay?: number;
}

const useDebounceCallback = <T extends (...args: any[]) => any>(
  callback: T,
  options?: UseDebounceOptions,
) => {
  const timeoutRef = useRef<null | any>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount or re-render
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const debouncedCallback = (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, options?.delay || 500); // default delay of 500ms
  };

  return debouncedCallback;
};

export default useDebounceCallback;
