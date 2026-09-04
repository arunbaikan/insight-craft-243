import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FpaShell, KpiCard, NumberCell, Panel, money } from "@/components/fpa/fpa-shell";
import { activeScenario, fpa, useFpa } from "@/lib/fpa/store";
import { ASSUMPTION_LABELS, MONEY_KEYS, actualsAsPlanRows, computePlan, summarise } from "@/lib/fpa/engine";

export const Route = createFileRoute("/fpa/cashflow")({
  head: () => ({
    meta: [
      { title: "Cash flow & runway — Ledgerframe FP&A" },
      { name: "description", content: "Direct-method cash forecast with DSO/DPO working-capital timing, burn rate and runway under any scenario." },
      { property: "og:title", content: "Cash flow & runway — Ledgerframe FP&A" },
      { property: "og:description", content: "13-month cash forecast, burn and runway." },
    ],
  }),
  component: CashFlowPage,
});

function CashFlowPage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const plan = computePlan(scenario, state.headcount);
  const history = actualsAsPlanRows();
  const s = summarise(plan);

  const chart = [...history.slice(-6), ...plan].map((r) => ({
    name: r.month.short,
    cash: Math.round(r.cashBalance),
    inflow: Math.round(r.collections),
    outflow: -Math.round(r.disbursements + r.capex),
    fcf: Math.round(r.freeCashFlow),
  }));

  const wcKeys = ["dso", "dpo", "capexPerMonth", "openingCash", "debt", "interestRatePct"] as const;
  const lowest = plan.reduce((m, r) => (r.cashBalance < m.cashBalance ? r : m), plan[0]!);

  return (
    <FpaShell title="Cash flow & runway" description="Direct-method forecast with working-capital timing from DSO and DPO.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ending cash" value={money(s.endingCash, true)} tone={s.endingCash > 0 ? "good" : "bad"} />
        <KpiCard label="Free cash flow (12m)" value={money(s.fcf, true)} tone={s.fcf >= 0 ? "good" : "bad"} />
        <KpiCard label="Average burn" value={s.avgBurn ? money(s.avgBurn, true) : "Cash generative"} />
        <KpiCard
          label="Runway"
          value={s.runwayMonths ? `${s.runwayMonths.toFixed(1)} months` : "No burn"}
          sub={`Low point ${money(lowest.cashBalance, true)} in ${lowest.month.label}`}
          tone={s.runwayMonths && s.runwayMonths < 12 ? "bad" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Cash in, cash out and closing balance">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="inflow" name="Collections" fill="var(--positive)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outflow" name="Disbursements" fill="var(--negative)" radius={[3, 3, 0, 0]} />
                <Line dataKey="cash" name="Closing cash" stroke="var(--brand)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Working capital drivers" description="Timing assumptions used by the cash model.">
          <div className="space-y-2">
            {wcKeys.map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{ASSUMPTION_LABELS[k]}</span>
                <div className="w-[130px]">
                  <NumberCell
                    value={scenario.assumptions[k]}
                    step={MONEY_KEYS.has(k) ? 1000 : 1}
                    onChange={(v) => fpa.updateAssumption(scenario.id, k, v)}
                  />
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: 4, right: 4 }}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area dataKey="fcf" name="Free cash flow" stroke="var(--accent-cyan)" fill="var(--brand-soft)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Monthly cash forecast">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left">Line</th>
                {plan.map((r) => (
                  <th key={r.month.key} className="px-2 py-2 text-right">{r.month.short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Collections", (r: (typeof plan)[number]) => r.collections],
                  ["Operating payments", (r: (typeof plan)[number]) => -r.disbursements],
                  ["Capex", (r: (typeof plan)[number]) => -r.capex],
                  ["Interest", (r: (typeof plan)[number]) => -r.interest],
                  ["Tax", (r: (typeof plan)[number]) => -r.tax],
                  ["Free cash flow", (r: (typeof plan)[number]) => r.freeCashFlow],
                  ["Closing cash", (r: (typeof plan)[number]) => r.cashBalance],
                  ["Accounts receivable", (r: (typeof plan)[number]) => r.ar],
                  ["Accounts payable", (r: (typeof plan)[number]) => r.ap],
                ] as const
              ).map(([label, fn]) => (
                <tr key={label} className={`border-b border-border/60 ${label.includes("cash") ? "font-semibold" : ""}`}>
                  <td className="sticky left-0 z-10 bg-card px-2 py-1.5 whitespace-nowrap">{label}</td>
                  {plan.map((r) => (
                    <td key={r.month.key} className="px-2 py-1.5 text-right tabular-nums">{money(fn(r), true)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </FpaShell>
  );
}
