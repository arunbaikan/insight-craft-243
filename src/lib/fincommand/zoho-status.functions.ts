import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getZohoImportStatus = createServerFn({method:"GET"})
  .middleware([requireSupabaseAuth])
  .handler(async ({context}) => {
    const result = await context.supabase.from("fincommand_sync_resources").select("company_id,resource,status,phase,records_pulled,last_error,updated_at").order("resource");
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });