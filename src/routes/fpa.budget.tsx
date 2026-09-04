import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FpaShell, NumberCell, Panel, money } from "@/components/fpa/fpa-shell";
import { fpa, useFpa } from "@/lib/fpa/store";
import { BUDGET_LINES, CALENDAR, PLAN_MONTHS, budgetTotals, defaultBudget } from "@/lib/fpa/engine";

export const Route = createFileRoute("/fpa/budget")({
  head: () => ({
    meta: [
      { title: "Budget builder — Ledgerframe FP&A" },
      { name: "description", content: "Edit an annual operating budget line by line, spread totals across months and re-baseline in one click." },
      { property: "og:title", content: "Budget builder — Ledgerframe FP&A" },
      { property: "og:description", content: "Line-item budgeting with monthly spreads and instant totals." },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const state = useFpa();
  const [horizon, setHorizon] = useState<"plan" | "all">("plan");
  const months = horizon === "plan" ? PLAN_MONTHS : CALENDAR;
  const [spread, setSpread] = useState("");

  const groups = ["Revenue", "Cost of sales", "Operating expenses"] as const;

  function spreadRow(lineKey: string, annual: number, mode: "even" | "growth") {
    const values = { ...(state.budget[lineKey] ?? {}) };
    if (mode === "even") {
      const per = annual / months.length;
      for (const m of months) values[m.key] = Math.round(per);
    } else {
      // Ramp: each month 1.5% above the previous, summing to the annual total.
      const r = 1.015;
      const denom = months.reduce((a, _m, i) => a + Math.pow(r, i), 0);
      const first = annual / denom;
      months.forEach((m, i) => (values[m.key] = Math.round(first * Math.pow(r, i))));
    }
    fpa.setBudgetRow(lineKey, values);
  }

  return (
    <FpaShell
      title="Budget"
      description="The approved operating plan. Edit any cell — totals, margins and variance update instantly."
      showScenario={false}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setHorizon(horizon === "plan" ? "all" : "plan")}>
            {horizon === "plan" ? "Show 24 months" : "Show plan year"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const fresh = defaultBudget();
              for (const line of BUDGET_LINES) fpa.setBudgetRow(line.key, fresh[line.key] ?? {});
              toast.success("Budget re-baselined from the latest actuals");
            }}
          >
            Re-baseline from actuals
          </Button>
        </>
      }
    >
      <Panel
        title="Line-item budget"
        description="Type an annual amount in the spread box to distribute it evenly or as a ramp."
        right={
          <div className="flex items-center gap-2">
            <Input
              value={spread}
              onChange={(e) => setSpread(e.target.value)}
              placeholder="Annual amount"
              className="h-8 w-[140px]"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left">Line</th>
                <th className="px-2 py-2 text-left">Spread</th>
                {months.map((m) => (
                  <th key={m.key} className="px-2 py-2 text-right font-medium">
                    {m.short}
                    {m.isActual ? <span className="ml-1 text-[10px] text-muted-foreground">A</span> : null}
                  </th>
                ))}
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const lines = BUDGET_LINES.filter((l) => l.group === group);
                return (
                  <Fragment key={group}>
                    <tr className="bg-muted/50">
                      <td className="sticky left-0 z-10 bg-muted/50 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide" colSpan={2}>
                        {group}
                      </td>
                      <td colSpan={months.length + 1} />
                    </tr>
                    {lines.map((line) => {
                      const row = state.budget[line.key] ?? {};
                      const total = months.reduce((a, m) => a + (row[m.key] ?? 0), 0);
                      return (
                        <tr key={line.key} className="border-b border-border/60">
                          <td className="sticky left-0 z-10 bg-card px-2 py-1.5 whitespace-nowrap">{line.label}</td>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => spreadRow(line.key, Number(spread) || total, "even")}
                              >
                                Even
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => spreadRow(line.key, Number(spread) || total, "growth")}
                              >
                                Ramp
                              </Button>
                            </div>
                          </td>
                          {months.map((m) => (
                            <td key={m.key} className="px-1 py-1">
                              <NumberCell
                                value={row[m.key] ?? 0}
                                step={1000}
                                onChange={(v) => fpa.setBudgetCell(line.key, m.key, v)}
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right tabular-nums font-medium">{money(total, true)}</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
              <tr className="border-t-2 border-border font-semibold">
                <td className="sticky left-0 z-10 bg-card px-2 py-2" colSpan={2}>
                  EBITDA
                </td>
                {months.map((m) => {
                  const t = budgetTotals(state.budget, m.key);
                  return (
                    <td key={m.key} className={`px-2 py-2 text-right tabular-nums ${t.ebitda < 0 ? "text-negative" : "text-positive"}`}>
                      {money(t.ebitda, true)}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right tabular-nums">
                  {money(months.reduce((a, m) => a + budgetTotals(state.budget, m.key).ebitda, 0), true)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </FpaShell>
  );
}
