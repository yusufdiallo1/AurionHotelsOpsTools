"use client";

import { useEffect, useRef } from "react";

// Auto-lock the manager after `timeoutMs` of inactivity. Calls onLock() once the
// idle timer elapses; any user activity resets the timer. (Security — manager
// is a shared-device admin view.)
export function useIdleLock(onLock: () => void, timeoutMs = 5 * 60 * 1000) {
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onLockRef.current(), timeoutMs);
    };
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", reset);
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", reset);
    };
  }, [timeoutMs]);
}
