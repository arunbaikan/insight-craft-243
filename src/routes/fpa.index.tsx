import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FpaShell, KpiCard, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { activeScenario, useFpa } from "@/lib/fpa/store";
import {
  ACTUAL_MONTHS,
  actualsAsPlanRows,
  budgetTotals,
  computePlan,
  computeVariance,
  summarise,
} from "@/lib/fpa/engine";

export const Route = createFileRoute("/fpa/")({
  head: () => ({
    meta: [
      { title: "FP&A Overview — Ledgerframe planning" },
      {
        name: "description",
        content:
          "Driver-based planning workspace: budget vs actual, rolling forecast, scenarios, workforce plan and cash runway in one place.",
      },
      { property: "og:title", content: "FP&A Overview — Ledgerframe planning" },
      { property: "og:description", content: "Rolling forecast, variance and runway for the demo workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FpaOverview,
});

function FpaOverview() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const actuals = actualsAsPlanRows();
  const plan = computePlan(scenario, state.headcount);
  const s = summarise(plan);
  const ytdVariance = computeVariance(
    state.budget,
    ACTUAL_MONTHS.slice(-3).map((m) => m.key),
  );

  const chart = [
    ...actuals.map((r) => ({
      name: r.month.short,
      actual: Math.round(r.revenue),
      plan: null as number | null,
      budget: Math.round(budgetTotals(state.budget, r.month.key).revenue),
      ebitda: Math.round(r.ebitda),
    })),
    ...plan.map((r) => ({
      name: r.month.short,
      actual: null as number | null,
      plan: Math.round(r.revenue),
      budget: Math.round(budgetTotals(state.budget, r.month.key).revenue),
      ebitda: Math.round(r.ebitda),
    })),
  ];

  const cash = [...actuals, ...plan].map((r) => ({
    name: r.month.short,
    cash: Math.round(r.cashBalance),
    fcf: Math.round(r.freeCashFlow),
  }));

  const worst = [...ytdVariance].sort((a, b) => Number(a.favorable) - Number(b.favorable) || Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 5);

  return (
    <FpaShell
      title="Financial planning & analysis"
      description={`${scenario.name} · next 12 months modelled from your drivers`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Forecast revenue (12m)" value={money(s.revenue, true)} sub={`${pct(s.revenueGrowthPct)} growth over the window`} />
        <KpiCard
          label="EBITDA (12m)"
          value={money(s.ebitda, true)}
          sub={`${pct(s.ebitdaMarginPct)} margin`}
          tone={s.ebitda >= 0 ? "good" : "bad"}
        />
        <KpiCard label="Gross margin" value={pct(s.grossMarginPct)} sub={`Gross profit ${money(s.grossProfit, true)}`} />
        <KpiCard
          label="Ending cash"
          value={money(s.endingCash, true)}
          sub={s.runwayMonths ? `${s.runwayMonths.toFixed(1)} months runway at current burn` : "Cash generative — no burn"}
          tone={s.endingCash > 0 ? "neutral" : "bad"}
        />
        <KpiCard label="Free cash flow (12m)" value={money(s.fcf, true)} tone={s.fcf >= 0 ? "good" : "bad"} />
        <KpiCard label="Net income (12m)" value={money(s.netIncome, true)} tone={s.netIncome >= 0 ? "good" : "bad"} />
        <KpiCard label="Rule of 40" value={pct(s.ruleOf40)} sub="Growth + EBITDA margin" tone={s.ruleOf40 >= 40 ? "good" : "bad"} />
        <KpiCard label="Ending headcount" value={`${s.endingHeadcount}`} sub={`${state.headcount.reduce((a, h) => a + h.count, 0)} planned hires`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Revenue: actual, budget and rolling forecast"
          description="Solid line stops at the last close; the dashed line is the live scenario."
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={1} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="budget" name="Budget" fill="var(--brand-soft)" radius={[3, 3, 0, 0]} />
                <Line dataKey="actual" name="Actual" stroke="var(--brand)" strokeWidth={2.5} dot={false} connectNulls />
                <Line
                  dataKey="plan"
                  name="Forecast"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Cash trajectory" description="Closing balance and monthly free cash flow.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cash} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area dataKey="cash" name="Cash" stroke="var(--brand)" fill="var(--brand-soft)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Biggest variances (last 3 closed months)" description="Actual against the approved budget.">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={worst.map((v) => ({ name: v.label, variance: Math.round(v.variance) }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => money(Number(v), true)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="variance" name="Variance" fill="var(--accent-amber)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Scenario spread" description="Full-year EBITDA under every saved scenario.">
          <div className="space-y-3">
            {state.scenarios.map((sc) => {
              const sum = summarise(computePlan(sc, state.headcount));
              const width = Math.min(100, Math.max(4, (sum.revenue / Math.max(...state.scenarios.map((x) => summarise(computePlan(x, state.headcount)).revenue))) * 100));
              return (
                <div key={sc.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sc.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      Rev {money(sum.revenue, true)} · EBITDA {money(sum.ebitda, true)} · {pct(sum.ebitdaMarginPct)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${width}%`, background: sc.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </FpaShell>
  );
}
