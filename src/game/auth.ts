import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let authClient: SupabaseClient | null = null;

export function getAuthClient() {
  if (authClient) return authClient;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
  if (!url || !key) return null;
  authClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return authClient;
}

export type { User };
