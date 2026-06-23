// Server Supabase clients. (CLAUDE.md §3, §7)
//
// - createServerClient(): anon key, cookie-aware — for Server Components / Route
//   Handlers that act as the current user once Auth lands.
// - createServiceClient(): service-role key, bypasses RLS — server-only, for
//   trusted operations (e.g. the Google Sheets sync route). NEVER import into a
//   client component.

import { createServerClient as createSSRClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";
import { publicSupabaseEnv, serviceSupabaseEnv } from "@/lib/supabase/env";

export async function createServerClient() {
  const { url, anonKey } = publicSupabaseEnv();
  const cookieStore = await cookies();

  return createSSRClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll called from a Server Component — safe to ignore when middleware
          // refreshes sessions.
        }
      },
    },
  });
}

/** Service-role client. Bypasses RLS. Server-only. */
export function createServiceClient() {
  const { url, serviceRoleKey } = serviceSupabaseEnv();
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
