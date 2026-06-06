// Browser Supabase client — uses the anon key only. (CLAUDE.md §7)
// Use inside client components for queries, realtime subscriptions, storage reads.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { publicSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
