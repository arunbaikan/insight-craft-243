import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FpaShell, KpiCard, NumberCell, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { activeScenario, fpa, useFpa } from "@/lib/fpa/store";
import {
  ASSUMPTION_GROUPS,
  ASSUMPTION_LABELS,
  MONEY_KEYS,
  budgetTotals,
  computePlan,
  summarise,
} from "@/lib/fpa/engine";

export const Route = createFileRoute("/fpa/forecast")({
  head: () => ({
    meta: [
      { title: "Rolling forecast — Ledgerframe FP&A" },
      { name: "description", content: "Driver-based rolling forecast: change growth, churn, pricing or cost drivers and watch the 12-month plan rebuild instantly." },
      { property: "og:title", content: "Rolling forecast — Ledgerframe FP&A" },
      { property: "og:description", content: "What-if driver modelling with an instant 12-month P&L." },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const rows = computePlan(scenario, state.headcount);
  const s = summarise(rows);

  const chart = rows.map((r) => ({
    name: r.month.short,
    revenue: Math.round(r.revenue),
    ebitda: Math.round(r.ebitda),
    budget: Math.round(budgetTotals(state.budget, r.month.key).revenue),
    margin: Number(((r.ebitda / (r.revenue || 1)) * 100).toFixed(1)),
  }));

  return (
    <FpaShell
      title="Rolling forecast"
      description="Every number below is recomputed in the browser from the drivers on the right."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue (12m)" value={money(s.revenue, true)} sub={`${pct(s.revenueGrowthPct)} exit growth`} />
        <KpiCard label="EBITDA (12m)" value={money(s.ebitda, true)} sub={pct(s.ebitdaMarginPct)} tone={s.ebitda >= 0 ? "good" : "bad"} />
        <KpiCard label="Gross margin" value={pct(s.grossMarginPct)} />
        <KpiCard label="Ending cash" value={money(s.endingCash, true)} tone={s.endingCash > 0 ? "neutral" : "bad"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Forecast P&L shape" description="Revenue and EBITDA against budget.">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="var(--brand)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="budget" name="Budget" fill="var(--brand-soft)" radius={[3, 3, 0, 0]} />
                <Line dataKey="ebitda" name="EBITDA" stroke="var(--accent-teal)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Drivers" description={scenario.locked ? "Base plan is locked — clone it on the Scenarios tab to edit." : "Edit any driver to reforecast."}>
          <div className="space-y-4">
            {ASSUMPTION_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
                <div className="space-y-2">
                  {g.keys.map((k) => (
                    <label key={k} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{ASSUMPTION_LABELS[k]}</span>
                      <div className="w-[120px]">
                        <NumberCell
                          value={scenario.assumptions[k]}
                          step={MONEY_KEYS.has(k) ? 1000 : 0.1}
                          onChange={(v) => fpa.updateAssumption(scenario.id, k, v)}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Forecast detail" description="Monthly profit & loss for the next twelve months.">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left">Line</th>
                {rows.map((r) => (
                  <th key={r.month.key} className="px-2 py-2 text-right">{r.month.short}</th>
                ))}
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Revenue", (r: (typeof rows)[number]) => r.revenue, false],
                  ["Cost of sales", (r: (typeof rows)[number]) => -r.cogs, false],
                  ["Gross profit", (r: (typeof rows)[number]) => r.grossProfit, true],
                  ["Payroll", (r: (typeof rows)[number]) => -r.payroll, false],
                  ["Other opex", (r: (typeof rows)[number]) => -r.otherOpex, false],
                  ["EBITDA", (r: (typeof rows)[number]) => r.ebitda, true],
                  ["D&A", (r: (typeof rows)[number]) => -r.da, false],
                  ["Interest", (r: (typeof rows)[number]) => -r.interest, false],
                  ["Tax", (r: (typeof rows)[number]) => -r.tax, false],
                  ["Net income", (r: (typeof rows)[number]) => r.netIncome, true],
                ] as const
              ).map(([label, fn, bold]) => (
                <tr key={label} className={`border-b border-border/60 ${bold ? "font-semibold" : ""}`}>
                  <td className="sticky left-0 z-10 bg-card px-2 py-1.5 whitespace-nowrap">{label}</td>
                  {rows.map((r) => (
                    <td key={r.month.key} className="px-2 py-1.5 text-right tabular-nums">{money(fn(r), true)}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(rows.reduce((a, r) => a + fn(r), 0), true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4" title="EBITDA margin trend">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={50} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="margin" name="EBITDA margin" fill="var(--accent-cyan)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </FpaShell>
  );
}
