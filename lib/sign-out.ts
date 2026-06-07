"use client";

import { createClient } from "@/lib/supabase/client";

/** Sign out and hard-redirect to /login so middleware + server layout reset. */
export async function signOut() {
  await createClient().auth.signOut();
  window.location.assign("/login");
}
