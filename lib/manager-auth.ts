// Manager passcode gate (CLAUDE.md no-auth note). The rest of the app is open;
// only /manager requires this shared passcode. Server-only — never import the
// passcode into a client component.

import { createHash } from "node:crypto";

export const MANAGER_COOKIE = "aurion_manager";
export const MANAGER_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

/**
 * Token stored in the unlock cookie. Derived from the passcode so a stale or
 * forged cookie can't pass once the passcode changes — but it never exposes the
 * passcode itself to the client.
 */
export function managerToken(): string {
  const passcode = process.env.MANAGER_PASSCODE ?? "";
  return createHash("sha256").update(`aurion-manager:${passcode}`).digest("hex");
}

export function isManagerConfigured(): boolean {
  return !!process.env.MANAGER_PASSCODE;
}

export function checkPasscode(input: string): boolean {
  const passcode = process.env.MANAGER_PASSCODE ?? "";
  // Constant-time-ish compare via hash equality.
  return (
    passcode.length > 0 &&
    createHash("sha256").update(input).digest("hex") ===
      createHash("sha256").update(passcode).digest("hex")
  );
}

export function cookieMatches(cookieValue: string | undefined): boolean {
  return !!cookieValue && cookieValue === managerToken();
}
