"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";

/** Shared timing defaults (see PERFORMANCE.md). */
export const AUTOSAVE_DEBOUNCE_MS = 400;
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Returns a value that updates after `delayMs` of stability.
 * Use for client-side search/filter inputs.
 */
export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Returns a debounced version of `callback` (trailing edge).
 * Use for autosave and other fire-on-pause actions.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number
): T {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  ) as T;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced;
}

/**
 * Runs `effect` after dependencies settle for `delayMs`.
 * Set `skipFirst` to avoid firing on mount (typical for autosave).
 * Set `enabled: false` to pause scheduling (e.g. when form is not dirty).
 *
 * The effect callback is read from a ref so save handlers do not need to be
 * listed in `deps` (avoids loops when callbacks close over changing props).
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: DependencyList,
  delayMs: number,
  options?: { skipFirst?: boolean; enabled?: boolean }
) {
  const effectRef = useRef(effect);
  const skipRef = useRef(options?.skipFirst ?? false);
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    if (!enabled) return;

    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    const timer = setTimeout(() => effectRef.current(), delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  }, [...deps, delayMs, enabled]);
}
