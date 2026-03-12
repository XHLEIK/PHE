'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DEBOUNCE_MS = 500;

/**
 * Custom hook for persisting form state to localStorage.
 * Saves on every change (debounced), restores on mount, clears on demand.
 *
 * @param key - localStorage key
 * @param initialState - default form state
 * @returns [state, setState, clearSaved] — drop-in replacement for useState
 */
export function useFormAutosave<T extends Record<string, unknown>>(
  key: string,
  initialState: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        // Merge saved values into initial state to handle new fields gracefully
        return { ...initialState, ...parsed };
      }
    } catch {
      // Corrupt data — ignore
    }
    return initialState;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save to localStorage
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Storage full — ignore
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, state]);

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return [state, setState, clearSaved];
}
