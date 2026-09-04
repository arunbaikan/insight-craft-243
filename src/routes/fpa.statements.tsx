import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FpaShell, KpiCard, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activeScenario, useFpa } from "@/lib/fpa/store";
import { buildStatements, type StatementRow } from "@/lib/fpa/analytics";

export const Route = createFileRoute("/fpa/statements")({
  head: () => ({
    meta: [
      { title: "Three-statement model — Ledgerframe FP&A" },
      {
        name: "description",
        content: "A linked profit & loss, balance sheet and indirect cash flow statement that ties out every month, driven by your scenario assumptions.",
      },
      { property: "og:title", content: "Three-statement model — Ledgerframe FP&A" },
      { property: "og:description", content: "Linked P&L, balance sheet and cash flow with an automatic balance check." },
    ],
  }),
  component: StatementsPage,
});

type Tab = "pnl" | "bs" | "cf";

const LINES: Record<Tab, { label: string; get: (r: StatementRow) => number; bold?: boolean; negate?: boolean }[]> = {
  pnl: [
    { label: "Revenue", get: (r) => r.revenue },
    { label: "Gross profit", get: (r) => r.grossProfit, bold: true },
    { label: "EBITDA", get: (r) => r.ebitda, bold: true },
    { label: "Depreciation & amortisation", get: (r) => -r.da },
    { label: "EBIT", get: (r) => r.ebit, bold: true },
    { label: "Interest", get: (r) => -r.interest },
    { label: "Tax", get: (r) => -r.tax },
    { label: "Net income", get: (r) => r.netIncome, bold: true },
  ],
  bs: [
    { label: "Cash", get: (r) => r.cash },
    { label: "Accounts receivable", get: (r) => r.ar },
    { label: "Property, plant & equipment", get: (r) => r.ppe },
    { label: "Other assets", get: (r) => r.otherAssets },
    { label: "Total assets", get: (r) => r.totalAssets, bold: true },
    { label: "Accounts payable", get: (r) => r.ap },
    { label: "Accruals", get: (r) => r.accruals },
    { label: "Debt", get: (r) => r.debt },
    { label: "Equity", get: (r) => r.equity },
    { label: "Total liabilities & equity", get: (r) => r.totalLiabilitiesEquity, bold: true },
    { label: "Balance check", get: (r) => r.balanceCheck, bold: true },
  ],
  cf: [
    { label: "Net income", get: (r) => r.cfoNetIncome },
    { label: "Add back D&A", get: (r) => r.cfoDa },
    { label: "Working capital movement", get: (r) => r.cfoWorkingCapital },
    { label: "Cash from operations", get: (r) => r.cfo, bold: true },
    { label: "Capital expenditure", get: (r) => r.cfi },
    { label: "Financing", get: (r) => r.cff },
    { label: "Net movement in cash", get: (r) => r.netCashMovement, bold: true },
    { label: "Closing cash", get: (r) => r.cash, bold: true },
  ],
};

function StatementsPage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const rows = useMemo(() => buildStatements(scenario, state.headcount), [scenario, state.headcount]);
  const [tab, setTab] = useState<Tab>("pnl");

  const last = rows[rows.length - 1]!;
  const worstCheck = rows.reduce((m, r) => Math.max(m, Math.abs(r.balanceCheck)), 0);
  const netIncome = rows.reduce((a, r) => a + r.netIncome, 0);
  const cfo = rows.reduce((a, r) => a + r.cfo, 0);

  const chart = rows.map((r) => ({
    name: r.month.short,
    assets: Math.round(r.totalAssets),
    equity: Math.round(r.equity),
    cash: Math.round(r.cash),
  }));

  const totals = (get: (r: StatementRow) => number) => rows.reduce((a, r) => a + get(r), 0);

  return (
    <FpaShell
      title="Three-statement model"
      description="Profit & loss, balance sheet and cash flow, fully linked and re-derived from the active scenario."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Net income (12m)" value={money(netIncome, true)} tone={netIncome >= 0 ? "good" : "bad"} />
        <KpiCard label="Cash from operations" value={money(cfo, true)} tone={cfo >= 0 ? "good" : "bad"} />
        <KpiCard label="Closing equity" value={money(last.equity, true)} sub={`Assets ${money(last.totalAssets, true)}`} />
        <KpiCard
          label="Balance check"
          value={worstCheck < 1 ? "Balances every month" : money(worstCheck, true)}
          tone={worstCheck < 1 ? "good" : "bad"}
          sub="Largest assets vs liabilities gap"
        />
      </div>

      <Panel className="mt-4" title="Balance sheet trajectory" description="Total assets, equity and cash across the plan.">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Area dataKey="assets" name="Total assets" stroke="var(--brand)" fill="var(--brand-soft)" />
              <Area dataKey="cash" name="Cash" stroke="var(--accent-cyan)" fillOpacity={0.15} fill="var(--accent-cyan)" />
              <Area dataKey="equity" name="Equity" stroke="var(--accent-teal)" fillOpacity={0.1} fill="var(--accent-teal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        className="mt-4"
        title="Statements"
        description="Every column is a forecast month; the final column totals the plan."
        right={
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="pnl">Profit & loss</TabsTrigger>
              <TabsTrigger value="bs">Balance sheet</TabsTrigger>
              <TabsTrigger value="cf">Cash flow</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left">Line</th>
                {rows.map((r) => (
                  <th key={r.month.key} className="px-2 py-2 text-right">
                    {r.month.short}
                  </th>
                ))}
                {tab !== "bs" ? <th className="px-2 py-2 text-right">Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {LINES[tab].map((l) => (
                <tr key={l.label} className={`border-b border-border/60 ${l.bold ? "font-semibold" : ""}`}>
                  <td className="sticky left-0 z-10 bg-card whitespace-nowrap px-2 py-1.5">{l.label}</td>
                  {rows.map((r) => (
                    <td key={r.month.key} className="px-2 py-1.5 text-right tabular-nums">
                      {l.label === "Balance check" && Math.abs(l.get(r)) < 1 ? "OK" : money(l.get(r), true)}
                    </td>
                  ))}
                  {tab !== "bs" ? (
                    <td className="px-2 py-1.5 text-right tabular-nums">{money(totals(l.get), true)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Closing net margin {pct(last.revenue ? (last.netIncome / last.revenue) * 100 : 0)} · receivables and payables move
          with the DSO and DPO you set on the cash flow tab.
        </p>
      </Panel>
    </FpaShell>
  );
}
