import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const reportInput = z.object({
  companyId: z.string().uuid(),
  financialYearId: z.string().uuid(),
  periodType: z.enum(["annual", "quarterly", "halfyear"]).default("annual"),
  period: z.enum(["Q1", "Q2", "Q3", "Q4", "H1", "H2"]).nullable().default(null),
}).superRefine((data, ctx) => {
  if (data.period && (data.periodType === "annual" || (data.periodType === "quarterly" ? !data.period.startsWith("Q") : !data.period.startsWith("H")))) {
    ctx.addIssue({ code: "custom", message: "The selected period does not match the period type." });
  }
});

export const listFincommandCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("fincommand_companies")
      .select("id,name,currency,presentation_currency,fiscal_year_start").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getFincommandReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof reportInput>) => reportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: year, error: yearError } = await context.supabase.from("fincommand_financial_years")
      .select("id,label,year_type,start_date,end_date").eq("id", data.financialYearId).eq("company_id", data.companyId).maybeSingle();
    if (yearError) throw new Error(yearError.message);
    if (!year) throw new Error("Financial year not found or access denied.");
    const { data: upload, error: uploadError } = await context.supabase.from("fincommand_tb_uploads")
      .select("id,source,uploaded_at,ledger_count").eq("company_id", data.companyId)
      .eq("financial_year_id", year.id).eq("is_current", true).eq("status", "complete").maybeSingle();
    if (uploadError) throw new Error(uploadError.message);
    if (!upload) throw new Error("No completed trial balance has been imported for this financial year.");
    const rows: import("./tb-engine").TbLedgerRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: page, error } = await context.supabase.from("fincommand_tb_ledgers").select("*")
        .eq("company_id", data.companyId).eq("upload_id", upload.id).order("id").range(offset, offset + 999);
      if (error) throw new Error(error.message);
      rows.push(...(page ?? []) as unknown as import("./tb-engine").TbLedgerRow[]);
      if (!page || page.length < 1000) break;
    }
    if (!rows.length) throw new Error("The current trial balance contains no ledgers.");
    const engine = await import("./tb-engine");
    const params = { periodType: data.periodType, period: data.period, yearType: year.year_type === "CY" ? "CY" as const : "FY" as const };
    return {
      financialYear: year, upload,
      mis: engine.computeMIS(rows, params), bs: engine.computeBS(rows, params),
      pl: engine.computePL(rows, params), notes: engine.computeNotes(rows, params),
      treasury: engine.computeTreasury(rows, params), cashflow: engine.computeCashFlow(rows, params),
      ratios: engine.computeRatios(rows, params),
      assumptions: ["P&L current and deferred tax retain the source backend's modeled 25% and 1% estimates, not actual tax assessments.", "Cash tax paid, OCI, and EPS are unavailable from trial-balance data alone."],
    };
  });