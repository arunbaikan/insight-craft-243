import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FpaShell, KpiCard, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { useFpa } from "@/lib/fpa/store";
import { ACTUAL_MONTHS, computeVariance } from "@/lib/fpa/engine";
import { varianceCommentary } from "@/lib/fpa/analytics";

export const Route = createFileRoute("/fpa/variance")({
  head: () => ({
    meta: [
      { title: "Budget vs actual variance — Ledgerframe FP&A" },
      { name: "description", content: "Month, quarter or year-to-date variance analysis with favourable and unfavourable flags on every line." },
      { property: "og:title", content: "Budget vs actual variance — Ledgerframe FP&A" },
      { property: "og:description", content: "Line-level variance with commentary-ready flags." },
    ],
  }),
  component: VariancePage,
});

const RANGES = [
  { value: "1", label: "Last closed month" },
  { value: "3", label: "Last quarter" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Year to date" },
];

function VariancePage() {
  const state = useFpa();
  const [range, setRange] = useState("3");
  const months = ACTUAL_MONTHS.slice(-Number(range)).map((m) => m.key);
  const rows = computeVariance(state.budget, months);

  const revenue = rows.filter((r) => r.group === "Revenue");
  const costs = rows.filter((r) => r.group !== "Revenue");
  const revActual = revenue.reduce((a, r) => a + r.actual, 0);
  const revBudget = revenue.reduce((a, r) => a + r.budget, 0);
  const costActual = costs.reduce((a, r) => a + r.actual, 0);
  const costBudget = costs.reduce((a, r) => a + r.budget, 0);
  const ebitdaVar = revActual - costActual - (revBudget - costBudget);

  return (
    <FpaShell
      title="Variance analysis"
      description="Closed months compared with the approved budget."
      showScenario={false}
      actions={
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue actual" value={money(revActual, true)} sub={`Budget ${money(revBudget, true)}`} />
        <KpiCard
          label="Revenue variance"
          value={money(revActual - revBudget, true)}
          sub={revBudget ? pct(((revActual - revBudget) / revBudget) * 100) : "—"}
          tone={revActual >= revBudget ? "good" : "bad"}
        />
        <KpiCard
          label="Cost variance"
          value={money(costActual - costBudget, true)}
          sub={costBudget ? pct(((costActual - costBudget) / costBudget) * 100) : "—"}
          tone={costActual <= costBudget ? "good" : "bad"}
        />
        <KpiCard label="EBITDA variance" value={money(ebitdaVar, true)} tone={ebitdaVar >= 0 ? "good" : "bad"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Variance by line" description="Green bars help EBITDA, red bars hurt it.">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows.map((r) => ({ name: r.label, value: Math.round(r.variance), favorable: r.favorable }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => money(Number(v), true)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="value" name="Variance" radius={[0, 3, 3, 0]}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill={r.favorable ? "var(--positive)" : "var(--negative)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Detail" description="Actual, budget, variance and percentage for every budgeted line.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left">Line</th>
                  <th className="py-2 text-right">Actual</th>
                  <th className="py-2 text-right">Budget</th>
                  <th className="py-2 text-right">Variance</th>
                  <th className="py-2 text-right">%</th>
                  <th className="py-2 text-right">Flag</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-border/60">
                    <td className="py-2">
                      <span className="text-muted-foreground">{r.group}</span> · {r.label}
                    </td>
                    <td className="py-2 text-right tabular-nums">{money(r.actual, true)}</td>
                    <td className="py-2 text-right tabular-nums">{money(r.budget, true)}</td>
                    <td className={`py-2 text-right tabular-nums ${r.favorable ? "text-positive" : "text-negative"}`}>
                      {money(r.variance, true)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.variancePct === null ? "—" : pct(r.variancePct)}</td>
                    <td className="py-2 text-right">
                      <Badge variant={r.favorable ? "secondary" : "destructive"}>{r.favorable ? "Fav" : "Unfav"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Automatic commentary" description="Draft narrative for the month-end pack, written from the variances above.">
          <div className="space-y-3">
            {varianceCommentary(rows, (v) => money(v, true)).map((n) => (
              <div key={n.headline} className="rounded-lg border border-border bg-muted/30 p-3">
                <p
                  className={`text-sm font-semibold ${
                    n.severity === "good" ? "text-positive" : n.severity === "bad" ? "text-negative" : ""
                  }`}
                >
                  {n.headline}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{n.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </FpaShell>
  );
}
