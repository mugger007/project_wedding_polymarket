import "server-only";

/*
 * Server-only Supabase client factory using the service-role key for privileged operations.
 */

import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

// Creates a non-persisted admin client for secure server actions and data loaders.
export function createSupabaseAdmin() {
  const env = getEnv();

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
