import { useRef, useEffect, useCallback } from "react";

export function useDebounceCallback(fn, delay = 300) {
  const fnRef = useRef(fn);
  const timerRef = useRef(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const debouncedFn = useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]);

  // Add cancel method
  debouncedFn.cancel = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  return debouncedFn;
}