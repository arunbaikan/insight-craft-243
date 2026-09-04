import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACTUALS,
  CALENDAR,
  OPEX_CATEGORIES,
  REVENUE_STREAMS,
  budgetTotals,
  computePlan,
  actualTotals,
} from "@/lib/fpa/engine";
import { activeScenario, useFpa } from "@/lib/fpa/store";
import { PLAN_DASHBOARD_SLUG, publishPlan, type PlanFactInput } from "@/lib/fpa/publish.functions";

/**
 * Flattens the in-browser planning workspace into one row per month, line and
 * series so the backend can serve the same figures to the dashboard viewer.
 */
function buildFacts(state: ReturnType<typeof useFpa>): { scenarioId: string; scenarioName: string; facts: PlanFactInput[] } {
  const scenario = activeScenario(state);
  const plan = computePlan(scenario, state.headcount);
  const facts: PlanFactInput[] = [];
  const base = { scenario_id: scenario.id, scenario_name: scenario.name };
  const push = (
    series: PlanFactInput["series"],
    month_key: string,
    line_key: string,
    line_label: string,
    category: string,
    amount_base: number,
  ) => {
    if (!Number.isFinite(amount_base)) return;
    facts.push({ ...base, series, month_key, line_key, line_label, category, amount_base });
  };

  for (const row of plan) {
    const m = row.month.key;
    for (const s of REVENUE_STREAMS) push("plan", m, `rev:${s}`, s, "Revenue", row.revenueByStream[s]);
    push("plan", m, "cogs", "Cost of sales", "Cost of sales", row.cogs);
    push("plan", m, "opex:Payroll", "Payroll", "Operating expenses", row.payroll);
    for (const c of OPEX_CATEGORIES) push("plan", m, `opex:${c}`, c, "Operating expenses", row.opexByCategory[c]);
    push("plan", m, "ebitda", "EBITDA", "Summary", row.ebitda);
    push("plan", m, "net_income", "Net income", "Summary", row.netIncome);
    push("plan", m, "free_cash_flow", "Free cash flow", "Cash", row.freeCashFlow);
    push("plan", m, "cash_balance", "Closing cash", "Cash", row.cashBalance);
    push("plan", m, "headcount", "Headcount", "People", row.headcount);
  }

  for (const month of CALENDAR) {
    const b = budgetTotals(state.budget, month.key);
    for (const s of REVENUE_STREAMS)
      push("budget", month.key, `rev:${s}`, s, "Revenue", state.budget[`rev:${s}`]?.[month.key] ?? 0);
    push("budget", month.key, "cogs", "Cost of sales", "Cost of sales", b.cogs);
    push("budget", month.key, "opex:Payroll", "Payroll", "Operating expenses", b.payroll);
    for (const c of OPEX_CATEGORIES)
      push("budget", month.key, `opex:${c}`, c, "Operating expenses", state.budget[`opex:${c}`]?.[month.key] ?? 0);
    push("budget", month.key, "ebitda", "EBITDA", "Summary", b.ebitda);
  }

  for (const row of ACTUALS) {
    const m = row.month.key;
    const t = actualTotals(row);
    for (const s of REVENUE_STREAMS) push("actual", m, `rev:${s}`, s, "Revenue", row.revenueByStream[s]);
    push("actual", m, "cogs", "Cost of sales", "Cost of sales", row.cogs);
    push("actual", m, "opex:Payroll", "Payroll", "Operating expenses", row.payroll);
    for (const c of OPEX_CATEGORIES) push("actual", m, `opex:${c}`, c, "Operating expenses", row.opexByCategory[c]);
    push("actual", m, "ebitda", "EBITDA", "Summary", t.ebitda);
  }

  return { scenarioId: scenario.id, scenarioName: scenario.name, facts };
}

export function PublishPlanButton() {
  const state = useFpa();
  const publish = useServerFn(publishPlan);
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const payload = buildFacts(state);
          const res = await publish({ data: payload });
          toast.success("Plan saved to your dashboards", {
            description: `${res.rows.toLocaleString()} figures published. Open “Financial plan” to view or export.`,
          });
        } catch (e) {
          toast.error("Could not save the plan", {
            description: e instanceof Error ? e.message : "Please try again.",
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Upload className="mr-2 h-4 w-4" />
      {busy ? "Saving…" : "Save to dashboard"}
    </Button>
  );
}

export function PlanDashboardLink() {
  return (
    <Link
      to="/dashboards/$slug"
      params={{ slug: PLAN_DASHBOARD_SLUG }}
      className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      Open plan dashboard
    </Link>
  );
}
