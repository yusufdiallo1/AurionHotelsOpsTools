// Server-side auth helpers. Use in Server Components / route handlers.
import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = "admin" | "receptionist";

export type SessionProfile = {
  userId: string;
  email: string;
  role: Role;
  profile: Profile;
  /** The receptionist's assigned hotel slug (properties.code), or null. */
  propertyCode: string | null;
};

/**
 * The current authenticated user's profile, or null if not signed in.
 * Wrapped in React cache() so the layout + the page in the same render share a
 * SINGLE auth + profile lookup instead of each doing their own round-trip.
 */
export const getSessionProfile = cache(async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, properties(code)")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const propertyCode =
    (profile as { properties?: { code?: string } | null }).properties?.code ?? null;

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    role: (profile.role as Role) ?? "receptionist",
    profile: profile as Profile,
    propertyCode,
  };
});

export async function isAdmin(): Promise<boolean> {
  return (await getSessionProfile())?.role === "admin";
}
