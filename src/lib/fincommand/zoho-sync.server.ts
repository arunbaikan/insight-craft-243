import { normalizeZoho, ZOHO_RESOURCES, type ZohoRow } from "./zoho-normalize";
import type { Json } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/zoho_books";
const ORGANIZATION_ID = "60029248187";
async function zoho(path: string, params: Record<string, string> = {}) {
  const key = process.env['LOVABLE_API_KEY'];
  const connection = process.env['ZOHO_BOOKS_API_KEY'];
  if (!key || !connection) throw new Error("Zoho connection is not configured");
  const url = new URL(`${GATEWAY_URL}${path}`);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': connection }, signal: AbortSignal.timeout(25000) });
  const body = await response.text();
  if (!response.ok) {
    console.error(`Zoho failed [${response.status}]: ${body}`);
    throw new Error(`Zoho [${response.status}]: ${body}`);
  }
  const payload = JSON.parse(body);
  if (payload.code !== 0) throw new Error(`Zoho [${response.status}]: ${body}`);
  return payload;
}

// Caller verifies the server-held scheduler credential before entering this helper.
export async function syncZohoStep() {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  let companyResult = await db.from("fincommand_companies").select("id,currency").eq("zoho_organization_id", ORGANIZATION_ID).maybeSingle();
  if (companyResult.error) throw new Error(companyResult.error.message);
  if (!companyResult.data) {
    const orgs = await zoho("/organizations");
    const org = orgs.organizations.find((o: ZohoRow) => o["organization_id"] === ORGANIZATION_ID);
    if (!org) throw new Error("Configured Zoho organization is unavailable");
    // Zoho fiscal_year_start_month is zero-based (3 = April).
    const created = await db.from("fincommand_companies").insert({ name:org.name, currency:org.currency_code,
      fiscal_year_start:Number(org.fiscal_year_start_month) + 1, zoho_organization_id:ORGANIZATION_ID }).select("id,currency").single();
    if (created.error) throw new Error(created.error.message);
    companyResult = created;
  }
  const company = companyResult.data;
  if (!company) throw new Error("Company setup failed");
  const initialized = await db.from("fincommand_sync_resources").upsert(ZOHO_RESOURCES.map(([resource,path,response_key,id_key,detail_key]) => ({company_id:company.id,resource,path,response_key,id_key,detail_key})), {onConflict:"company_id,resource",ignoreDuplicates:true});
  if (initialized.error) throw new Error(initialized.error.message);
  const state = await db.from("fincommand_sync_resources").select("*").eq("company_id",company.id).in("status",["pending","running"]).order("phase",{ascending:false}).order("records_pulled").order("resource").limit(1).maybeSingle();
  if (state.error) throw new Error(state.error.message);
  const task = state.data;
  if (!task) {
    const summary = await db.from("fincommand_sync_resources").select("resource,status,records_pulled,last_error").eq("company_id",company.id);
    if (summary.error) throw new Error(summary.error.message);
    return {done:true,companyId:company.id,summary:summary.data};
  }
  try {
    let path = task.path;
    let rows: ZohoRow[];
    let snapshot;
    let nextPhase = task.phase;
    let nextStatus = "running";
    let nextPage = task.page;
    if (task.phase === "details") {
      const pending = await db.from("fincommand_source_records").select("source_id").eq("company_id",company.id).eq("resource",task.resource).eq("detail_complete",false).order("source_id").limit(6);
      if (pending.error) throw new Error(pending.error.message);
      if (!pending.data?.length) {
        const updated = await db.from("fincommand_sync_resources").update({status:"complete",updated_at:new Date().toISOString()}).eq("company_id",company.id).eq("resource",task.resource);
        if(updated.error) throw new Error(updated.error.message);
        return {done:false,resource:task.resource,status:"complete"};
      }
      const responses = await Promise.all(pending.data.map(async (record) => {
        const requestPath = `${task.path}/${encodeURIComponent(record.source_id)}`;
        return {path:requestPath,payload:await zoho(requestPath,{organization_id:ORGANIZATION_ID})};
      }));
      snapshot = {responses};
      rows = responses.map((response) => {
        const detail = task.detail_key ? response.payload[task.detail_key] : null;
        if (!detail || typeof detail !== "object") throw new Error("Zoho detail response is missing the expected record");
        return detail as ZohoRow;
      });
    } else {
      snapshot = await zoho(path,{organization_id:ORGANIZATION_ID,page:String(task.page),per_page:"200"});
      if (!Array.isArray(snapshot[task.response_key])) throw new Error("Zoho list response is missing its records");
      rows = snapshot[task.response_key];
      const more = snapshot.page_context?.has_more_page;
      if (more !== true && more !== false) throw new Error("Zoho pagination metadata is missing; completeness cannot be verified");
      nextPage = more ? task.page + 1 : task.page;
      if (!more) { nextPhase = "details"; }
    }
    const normalized = normalizeZoho(company.id,company.currency,task.resource,task.id_key,rows);
    const saved = await db.rpc("fincommand_store_zoho_batch",{p_company:company.id,p_resource:task.resource,
      p_records:normalized.records as Json,p_documents:normalized.documents as Json,p_masters:normalized.masters as Json,
      p_lines:normalized.lines as Json,p_snapshot:snapshot as Json,p_path:path,p_page:task.page,p_detail:task.phase === "details"});
    if(saved.error) throw new Error(saved.error.message);
    const count = await db.from("fincommand_source_records").select("source_id",{count:"exact",head:true}).eq("company_id",company.id).eq("resource",task.resource);
    if(count.error) throw new Error(count.error.message);
    const updated = await db.from("fincommand_sync_resources").update({page:nextPage,phase:nextPhase,status:nextStatus,
      records_pulled:count.count ?? 0,last_error:null,http_status:200,updated_at:new Date().toISOString()}).eq("company_id",company.id).eq("resource",task.resource);
    if(updated.error) throw new Error(updated.error.message);
    return {done:false,resource:task.resource,phase:task.phase,records:count.count ?? 0};
  } catch(error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = Number(message.match(/Zoho \[(\d+)\]/)?.[1]);
    const status = [401,403,404].includes(code) ? "blocked" : "error";
    const updated = await db.from("fincommand_sync_resources").update({status,last_error:message,http_status:code || null,updated_at:new Date().toISOString()}).eq("company_id",company.id).eq("resource",task.resource);
    if(updated.error) throw new Error(updated.error.message);
    return {done:false,resource:task.resource,status,error:message};
  }
}