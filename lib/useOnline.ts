"use client";

import { useSyncExternalStore } from "react";

// Track online/offline status via useSyncExternalStore — no setState-in-effect.
// Server snapshot is `true` (optimistic); the client reads the live value.
// (CLAUDE.md reliability)
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // client snapshot
    () => true, // server snapshot (optimistic)
  );
}
