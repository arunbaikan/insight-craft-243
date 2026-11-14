import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Request-scoped client. Forward verified-by-RLS user identity when supplied;
 * never reuse a session-bearing client across requests or companies.
 */
export function getServerSupabase(): SupabaseClient {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Database configuration is missing.");
  const authorization = getRequest().headers.get("authorization");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      ...(authorization ? { headers: { Authorization: authorization } } : {}),
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers: h });
      },
    },
  });
}
