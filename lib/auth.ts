// Server-side auth helpers. Use in Server Components / route handlers.
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = "admin" | "receptionist";

export type SessionProfile = {
  userId: string;
  email: string;
  role: Role;
  profile: Profile;
};

/** The current authenticated user's profile, or null if not signed in. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    role: (profile.role as Role) ?? "receptionist",
    profile,
  };
}

export async function isAdmin(): Promise<boolean> {
  return (await getSessionProfile())?.role === "admin";
}
