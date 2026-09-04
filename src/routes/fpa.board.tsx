import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FpaShell, KpiCard, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activeScenario, useFpa } from "@/lib/fpa/store";
import { ACTUAL_MONTHS, computePlan, computeVariance, summarise } from "@/lib/fpa/engine";
import { BENCHMARK_NOTE, costStructure, revenueBridge, scorecard, varianceCommentary } from "@/lib/fpa/analytics";

export const Route = createFileRoute("/fpa/board")({
  head: () => ({
    meta: [
      { title: "Board pack — Ledgerframe FP&A" },
      {
        name: "description",
        content: "An executive KPI scorecard with red-amber-green status, a revenue bridge, cost structure and automatically written month-end variance commentary.",
      },
      { property: "og:title", content: "Board pack — Ledgerframe FP&A" },
      { property: "og:description", content: "KPI scorecard, revenue bridge and written variance commentary." },
    ],
  }),
  component: BoardPage,
});

const RANGES = [
  { id: "1", label: "Last month" },
  { id: "3", label: "Last quarter" },
  { id: "6", label: "Last six months" },
  { id: "12", label: "Last twelve months" },
] as const;

const TONE: Record<string, string> = {
  good: "text-positive",
  warn: "text-amber-500",
  bad: "text-negative",
};

const DOT: Record<string, string> = {
  good: "bg-positive",
  warn: "bg-amber-500",
  bad: "bg-negative",
};

function formatScore(v: number, format: string) {
  if (format === "money") return money(v, true);
  if (format === "pct") return pct(v);
  if (format === "x") return `${v.toFixed(1)}x`;
  if (format === "months") return `${v.toFixed(1)} mo`;
  return v.toFixed(1);
}

function BoardPage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const [range, setRange] = useState<string>("3");

  const plan = useMemo(() => computePlan(scenario, state.headcount), [scenario, state.headcount]);
  const s = summarise(plan);
  const cards = useMemo(() => scorecard(scenario, state.headcount), [scenario, state.headcount]);
  const bridge = useMemo(() => revenueBridge(scenario, state.headcount), [scenario, state.headcount]);
  const costs = useMemo(() => costStructure(plan), [plan]);

  const months = ACTUAL_MONTHS.slice(-Number(range)).map((m) => m.key);
  const variance = useMemo(() => computeVariance(state.budget, months), [state.budget, months.join(",")]);
  const notes = useMemo(() => varianceCommentary(variance, (v) => money(v, true)), [variance]);

  // Waterfall data: each step floats on the running total.
  let running = bridge.opening;
  const waterfall = [
    { name: "Opening ARR", base: 0, value: bridge.opening, kind: "total" as const },
    ...bridge.steps.map((step) => {
      const base = step.value >= 0 ? running : running + step.value;
      running += step.value;
      return { name: step.label, base, value: Math.abs(step.value), kind: step.value >= 0 ? ("up" as const) : ("down" as const) };
    }),
    { name: "Closing ARR", base: 0, value: running, kind: "total" as const },
  ];

  const copy = () => {
    const text = [
      `${scenario.name} — board commentary`,
      "",
      ...notes.map((n) => `• ${n.headline}\n  ${n.detail}`),
    ].join("\n");
    void navigator.clipboard?.writeText(text);
  };

  return (
    <FpaShell
      title="Board pack"
      description="The one page a CFO takes into the board meeting: status against targets, what moved revenue, and the written commentary."
      actions={
        <>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={copy}>
            Copy commentary
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue (12m plan)" value={money(s.revenue, true)} sub={`${pct(s.revenueGrowthPct)} exit growth`} />
        <KpiCard label="EBITDA" value={money(s.ebitda, true)} sub={pct(s.ebitdaMarginPct)} tone={s.ebitda >= 0 ? "good" : "bad"} />
        <KpiCard label="Rule of 40" value={s.ruleOf40.toFixed(1)} tone={s.ruleOf40 >= 40 ? "good" : "bad"} />
        <KpiCard
          label="Runway"
          value={s.runwayMonths ? `${s.runwayMonths.toFixed(1)} months` : "Cash generative"}
          tone={s.runwayMonths && s.runwayMonths < 12 ? "bad" : "good"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-1" title="KPI scorecard" description={BENCHMARK_NOTE}>
          <ul className="space-y-2.5">
            {cards.map((c) => (
              <li key={c.label} className="border-b border-border/60 pb-2 last:border-0">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${DOT[c.status]}`} />
                    <span className="text-muted-foreground">{c.label}</span>
                  </span>
                  <span className={`font-medium tabular-nums ${TONE[c.status]}`}>{formatScore(c.value, c.format)}</span>
                </div>
                <p className="mt-0.5 pl-4 text-xs text-muted-foreground">
                  Target {formatScore(c.target, c.format)} · {c.note}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Revenue bridge"
          description="How the annualised revenue run rate gets from where it is today to the plan exit."
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfall} margin={{ left: 8, right: 8, top: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <Tooltip formatter={(v, n) => (n === "value" ? money(Number(v)) : "")} />
                <Bar dataKey="base" stackId="w" fill="transparent" />
                <Bar dataKey="value" stackId="w" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="value" position="top" fontSize={10} formatter={(v: number) => money(v, true)} />
                  {waterfall.map((w, i) => (
                    <Cell
                      key={i}
                      fill={w.kind === "total" ? "var(--brand)" : w.kind === "up" ? "var(--positive)" : "var(--negative)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Month-end commentary" description="Written from the variance table for the selected period.">
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.headline} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className={`text-sm font-semibold ${TONE[n.severity] ?? ""}`}>{n.headline}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Cost structure" description="Plan spend as a share of revenue.">
          <ul className="space-y-2 text-sm">
            {costs.map((c) => (
              <li key={c.label}>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="tabular-nums">
                    {money(c.value, true)} · {pct(c.pctOfRevenue)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-brand"
                    style={{ width: `${Math.min(100, c.pctOfRevenue)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </FpaShell>
  );
}
