import { createServerFn } from "@tanstack/react-start";

export type ConnectionRecord = {
  id: string;
  source: string;
  display_name: string;
  org_identifier: string | null;
  status: string;
  last_success_at: string | null;
  last_error: string | null;
  records_pulled: number;
};

export const listConnections = createServerFn({ method: "GET" }).handler(async (): Promise<ConnectionRecord[]> => {
  const { getServerSupabase } = await import("@/lib/supabase-data.server");
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("connections")
    .select("id, source, display_name, org_identifier, status, last_success_at, last_error, records_pulled")
    .order("display_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ConnectionRecord[];
});
