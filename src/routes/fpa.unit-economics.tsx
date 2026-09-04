import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FpaShell, KpiCard, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { activeScenario, useFpa } from "@/lib/fpa/store";
import { UE_ASSUMPTIONS, unitEconomics } from "@/lib/fpa/analytics";

export const Route = createFileRoute("/fpa/unit-economics")({
  head: () => ({
    meta: [
      { title: "Unit economics & SaaS metrics — Ledgerframe FP&A" },
      {
        name: "description",
        content: "ARR, customers, CAC, LTV, payback, net and gross retention, magic number, burn multiple and Rule of 40 across history and plan.",
      },
      { property: "og:title", content: "Unit economics — Ledgerframe FP&A" },
      { property: "og:description", content: "CAC, LTV, payback, retention and Rule of 40 on the live plan." },
    ],
  }),
  component: UnitEconomicsPage,
});

function UnitEconomicsPage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const rows = useMemo(() => unitEconomics(scenario, state.headcount), [scenario, state.headcount]);
  const last = rows[rows.length - 1]!;
  const planRows = rows.filter((r) => !r.isActual);
  const avg = (fn: (r: (typeof rows)[number]) => number) => planRows.reduce((a, r) => a + fn(r), 0) / (planRows.length || 1);

  const chart = rows.map((r) => ({
    name: r.month.short,
    arr: Math.round(r.arr),
    customers: Math.round(r.customers),
    newCustomers: Math.round(r.newCustomers),
    churned: -Math.round(r.churnedCustomers),
    cac: Math.round(r.cac),
    nrr: Number(r.nrrPct.toFixed(1)),
  }));

  return (
    <FpaShell
      title="Unit economics"
      description="What one customer is worth, what one costs, and how fast the acquisition spend comes back."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Exit ARR" value={money(last.arr, true)} sub={`${Math.round(last.customers)} customers`} />
        <KpiCard
          label="LTV : CAC"
          value={`${avg((r) => r.ltvToCac).toFixed(1)}x`}
          sub="Target 3x or better"
          tone={avg((r) => r.ltvToCac) >= 3 ? "good" : avg((r) => r.ltvToCac) >= 2 ? "neutral" : "bad"}
        />
        <KpiCard
          label="CAC payback"
          value={`${avg((r) => r.paybackMonths).toFixed(1)} months`}
          sub="Target under 18 months"
          tone={avg((r) => r.paybackMonths) <= 18 ? "good" : "bad"}
        />
        <KpiCard
          label="Net revenue retention"
          value={pct(avg((r) => r.nrrPct))}
          sub={`Gross retention ${pct(avg((r) => r.grrPct))}`}
          tone={avg((r) => r.nrrPct) >= 100 ? "good" : "bad"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="ARR and customer movement" description="History then plan, on one timeline.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v, n) => (n === "ARR" ? money(Number(v)) : Number(v).toLocaleString())} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="r" dataKey="newCustomers" name="New customers" fill="var(--positive)" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="r" dataKey="churned" name="Churned customers" fill="var(--negative)" radius={[3, 3, 0, 0]} />
                <Line yAxisId="l" dataKey="arr" name="ARR" stroke="var(--brand)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Efficiency benchmarks" description="Plan averages against the levels investors look for.">
          <ul className="space-y-3 text-sm">
            {(
              [
                ["Magic number", avg((r) => r.magicNumber).toFixed(2), avg((r) => r.magicNumber) >= 0.75],
                ["Burn multiple", avg((r) => r.burnMultiple).toFixed(2), avg((r) => r.burnMultiple) < 1.5],
                ["Rule of 40", avg((r) => r.ruleOf40).toFixed(1), avg((r) => r.ruleOf40) >= 40],
                ["Blended CAC", money(avg((r) => r.cac)), avg((r) => r.cac) < last.ltv / 3],
                ["Customer lifetime value", money(last.ltv), true],
                ["Average revenue per account", `${money(last.arpa)} / month`, true],
              ] as const
            ).map(([label, value, ok]) => (
              <li key={label} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-medium tabular-nums ${ok ? "text-positive" : "text-negative"}`}>{value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Customer counts are derived from subscription revenue at an average contract value of{" "}
            {money(UE_ASSUMPTIONS.avgContractValue)} a year.
          </p>
        </Panel>
      </div>

      <Panel className="mt-4" title="Monthly detail">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                {["Month", "ARR", "Customers", "New", "Churned", "S&M spend", "CAC", "Payback", "NRR", "GRR"].map((h) => (
                  <th key={h} className={`px-2 py-2 ${h === "Month" ? "text-left" : "text-right"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month.key} className={`border-b border-border/60 ${r.isActual ? "text-muted-foreground" : ""}`}>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    {r.month.short} {r.isActual ? <span className="text-xs">actual</span> : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(r.arr, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{Math.round(r.customers)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{Math.round(r.newCustomers)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{Math.round(r.churnedCustomers)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(r.smSpend, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(r.cac)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.paybackMonths.toFixed(1)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pct(r.nrrPct)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pct(r.grrPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </FpaShell>
  );
}
