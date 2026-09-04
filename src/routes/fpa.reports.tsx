import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FpaShell, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { activeScenario, fpa, useFpa } from "@/lib/fpa/store";
import { actualsAsPlanRows, budgetTotals, computePlan, summarise, type PlanRow } from "@/lib/fpa/engine";

export const Route = createFileRoute("/fpa/reports")({
  head: () => ({
    meta: [
      { title: "Management reports — Ledgerframe FP&A" },
      { name: "description", content: "Monthly or quarterly management P&L combining actuals and forecast, with a one-click CSV export." },
      { property: "og:title", content: "Management reports — Ledgerframe FP&A" },
      { property: "og:description", content: "Board-ready P&L across actuals and forecast." },
    ],
  }),
  component: ReportsPage,
});

type Column = { key: string; label: string; rows: PlanRow[] };

function quarterOf(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return `${y} Q${Math.floor((m - 1) / 3) + 1}`;
}

function ReportsPage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const [grain, setGrain] = useState<"month" | "quarter">("quarter");

  const all = [...actualsAsPlanRows(), ...computePlan(scenario, state.headcount)];

  const columns: Column[] =
    grain === "month"
      ? all.map((r) => ({ key: r.month.key, label: `${r.month.short}${r.month.isActual ? " A" : " F"}`, rows: [r] }))
      : Object.entries(
          all.reduce<Record<string, PlanRow[]>>((acc, r) => {
            const q = quarterOf(r.month.key);
            (acc[q] ??= []).push(r);
            return acc;
          }, {}),
        ).map(([label, rows]) => ({ key: label, label, rows }));

  const LINES: { label: string; fn: (r: PlanRow) => number; bold?: boolean; percentOfRevenue?: boolean }[] = [
    { label: "Revenue", fn: (r) => r.revenue },
    { label: "Cost of sales", fn: (r) => -r.cogs },
    { label: "Gross profit", fn: (r) => r.grossProfit, bold: true },
    { label: "Payroll", fn: (r) => -r.payroll },
    { label: "Other operating expenses", fn: (r) => -r.otherOpex },
    { label: "EBITDA", fn: (r) => r.ebitda, bold: true },
    { label: "Depreciation & amortisation", fn: (r) => -r.da },
    { label: "Interest", fn: (r) => -r.interest },
    { label: "Tax", fn: (r) => -r.tax },
    { label: "Net income", fn: (r) => r.netIncome, bold: true },
    { label: "Free cash flow", fn: (r) => r.freeCashFlow },
    { label: "Closing cash", fn: (r) => r.cashBalance, bold: true },
  ];


  const total = (col: Column, fn: (r: PlanRow) => number) => col.rows.reduce((a, r) => a + fn(r), 0);
  const closing = (col: Column) => col.rows[col.rows.length - 1]!.cashBalance;
  const s = summarise(computePlan(scenario, state.headcount));

  function exportCsv() {
    const head = ["Line", ...columns.map((c) => c.label)];
    const body = LINES.map((l) => [
      l.label,
      ...columns.map((c) => Math.round(l.label === "Closing cash" ? closing(c) : total(c, l.fn))),
    ]);
    const csv = [head, ...body].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `management-report-${scenario.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  }

  return (
    <FpaShell
      title="Management reports"
      description={`${scenario.name} · actuals through the last close, forecast thereafter`}
      actions={
        <>
          <Select value={grain} onValueChange={(v) => setGrain(v as "month" | "quarter")}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1 size-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              fpa.resetAll();
              toast.success("Planning workspace reset to defaults");
            }}
          >
            <RotateCcw className="mr-1 size-4" /> Reset workspace
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Full-year forecast">
          <p className="font-display text-2xl font-semibold tabular-nums">{money(s.revenue, true)}</p>
          <p className="text-xs text-muted-foreground">Revenue · EBITDA {money(s.ebitda, true)} ({pct(s.ebitdaMarginPct)})</p>
        </Panel>
        <Panel title="Budgeted revenue (plan year)">
          <p className="font-display text-2xl font-semibold tabular-nums">
            {money(computePlan(scenario, state.headcount).reduce((a, r) => a + budgetTotals(state.budget, r.month.key).revenue, 0), true)}
          </p>
          <p className="text-xs text-muted-foreground">From the budget grid</p>
        </Panel>
        <Panel title="Ending cash">
          <p className="font-display text-2xl font-semibold tabular-nums">{money(s.endingCash, true)}</p>
          <p className="text-xs text-muted-foreground">{s.runwayMonths ? `${s.runwayMonths.toFixed(1)} months runway` : "Cash generative"}</p>
        </Panel>
      </div>

      <Panel className="mt-4" title="Management profit & loss" description="A = actual, F = forecast.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left">Line</th>
                {columns.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-right">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINES.map((l) => (
                <tr key={l.label} className={`border-b border-border/60 ${l.bold ? "font-semibold" : ""}`}>
                  <td className="sticky left-0 z-10 bg-card px-2 py-1.5 whitespace-nowrap">{l.label}</td>
                  {columns.map((c) => {
                    const v = l.label === "Closing cash" ? closing(c) : total(c, l.fn);
                    return (
                      <td key={c.key} className={`px-2 py-1.5 text-right tabular-nums ${v < 0 && l.bold ? "text-negative" : ""}`}>
                        {money(v, true)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </FpaShell>
  );
}
