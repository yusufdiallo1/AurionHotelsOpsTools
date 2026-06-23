"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Handover } from "@/lib/handover";

export type RealtimeStatus = "connecting" | "live" | "reconnecting";

type Handlers = {
  /** A handover row was inserted or updated. */
  onUpsert: (row: Handover) => void;
  /**
   * Called once whenever the channel (re)subscribes — refetch to reconcile any
   * events missed while disconnected. Skipped on the very first subscribe if
   * `reconcileOnFirstConnect` is false (initial load handles that case).
   */
  onReconcile?: () => void;
};

/**
 * Subscribe to INSERT + UPDATE on public.handovers for the lifetime of the
 * component. One channel per view; unsubscribed on unmount. (CLAUDE.md realtime)
 *
 * Handlers are read through a ref so the subscription itself never needs to be
 * torn down when a callback identity changes (avoids leaked channels).
 */
export function useHandoverRealtime(
  handlers: Handlers,
  options?: { channelName?: string; reconcileOnFirstConnect?: boolean },
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const handlersRef = useRef(handlers);
  // Keep the latest handlers without re-subscribing the channel. Updating the ref
  // in an effect (not during render) satisfies the react-hooks rules.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const channelName = options?.channelName ?? "handovers-realtime";
  const reconcileOnFirstConnect = options?.reconcileOnFirstConnect ?? false;

  useEffect(() => {
    const supabase = createClient();
    let hasConnectedOnce = false;

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "handovers" },
        (payload) => handlersRef.current.onUpsert(payload.new as Handover),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "handovers" },
        (payload) => handlersRef.current.onUpsert(payload.new as Handover),
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          setStatus("live");
          // On the first connect the caller's initial fetch already has fresh
          // data; on every later (re)connect, reconcile to catch missed events.
          if (hasConnectedOnce || reconcileOnFirstConnect) {
            handlersRef.current.onReconcile?.();
          }
          hasConnectedOnce = true;
        } else if (
          state === "CHANNEL_ERROR" ||
          state === "TIMED_OUT" ||
          state === "CLOSED"
        ) {
          setStatus("reconnecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, reconcileOnFirstConnect]);

  return status;
}
