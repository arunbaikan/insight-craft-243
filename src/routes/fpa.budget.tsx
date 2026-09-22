import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FpaShell, KpiCard, NumberCell, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { fpa, useFpa } from "@/lib/fpa/store";
import {
  BUDGET_LINES,
  CALENDAR,
  PLAN_MONTHS,
  budgetTotals,
  defaultBudget,
  type Budget,
  type MonthMeta,
} from "@/lib/fpa/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fpa/budget")({
  head: () => ({
    meta: [
      { title: "Budget builder — Ledgerframe FP&A" },
      { name: "description", content: "Edit an annual operating budget line by line, spread totals across months and re-baseline in one click." },
      { property: "og:title", content: "Budget builder — Ledgerframe FP&A" },
      { property: "og:description", content: "Line-item budgeting with quarterly rollups, live margins and instant totals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetPage,
});

type Bucket = { key: string; label: string; months: MonthMeta[]; isActual: boolean };

function quarterOf(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const q = Math.floor((Number(m) - 1) / 3) + 1;
  return { key: `${y}-Q${q}`, label: `Q${q} ${String(y).slice(2)}` };
}

function buildBuckets(months: MonthMeta[], grain: "month" | "quarter"): Bucket[] {
  if (grain === "month") {
    return months.map((m) => ({ key: m.key, label: m.short, months: [m], isActual: m.isActual }));
  }
  const map = new Map<string, Bucket>();
  for (const m of months) {
    const q = quarterOf(m.key);
    const existing = map.get(q.key);
    if (existing) {
      existing.months.push(m);
      existing.isActual = existing.isActual && m.isActual;
    } else {
      map.set(q.key, { key: q.key, label: q.label, months: [m], isActual: m.isActual });
    }
  }
  return [...map.values()];
}

function sumBucket(budget: Budget, lineKey: string, bucket: Bucket) {
  return bucket.months.reduce((a, m) => a + (budget[lineKey]?.[m.key] ?? 0), 0);
}

function bucketTotals(budget: Budget, bucket: Bucket) {
  return bucket.months.reduce(
    (acc, m) => {
      const t = budgetTotals(budget, m.key);
      return {
        revenue: acc.revenue + t.revenue,
        cogs: acc.cogs + t.cogs,
        totalOpex: acc.totalOpex + t.totalOpex,
        grossProfit: acc.grossProfit + t.grossProfit,
        ebitda: acc.ebitda + t.ebitda,
      };
    },
    { revenue: 0, cogs: 0, totalOpex: 0, grossProfit: 0, ebitda: 0 },
  );
}

const GROUPS = ["Revenue", "Cost of sales", "Operating expenses"] as const;

function BudgetPage() {
  const state = useFpa();
  const [horizon, setHorizon] = useState<"plan" | "all">("plan");
  const [grain, setGrain] = useState<"month" | "quarter">("quarter");

  const months = horizon === "plan" ? PLAN_MONTHS : CALENDAR;
  const buckets = useMemo(() => buildBuckets(months, grain), [months, grain]);

  const fy = useMemo(() => {
    return months.reduce(
      (acc, m) => {
        const t = budgetTotals(state.budget, m.key);
        return {
          revenue: acc.revenue + t.revenue,
          cogs: acc.cogs + t.cogs,
          payroll: acc.payroll + t.payroll,
          otherOpex: acc.otherOpex + t.otherOpex,
          totalOpex: acc.totalOpex + t.totalOpex,
          grossProfit: acc.grossProfit + t.grossProfit,
          ebitda: acc.ebitda + t.ebitda,
        };
      },
      { revenue: 0, cogs: 0, payroll: 0, otherOpex: 0, totalOpex: 0, grossProfit: 0, ebitda: 0 },
    );
  }, [state.budget, months]);

  const gmPct = fy.revenue ? (fy.grossProfit / fy.revenue) * 100 : 0;
  const ebitdaPct = fy.revenue ? (fy.ebitda / fy.revenue) * 100 : 0;
  const opexPct = fy.revenue ? (fy.totalOpex / fy.revenue) * 100 : 0;

  function applySpread(lineKey: string, annual: number, mode: "even" | "ramp" | "clear") {
    const values = { ...(state.budget[lineKey] ?? {}) };
    if (mode === "clear") {
      for (const m of months) values[m.key] = 0;
    } else if (mode === "even") {
      const per = annual / months.length;
      for (const m of months) values[m.key] = Math.round(per);
    } else {
      const r = 1.015;
      const denom = months.reduce((a, _m, i) => a + Math.pow(r, i), 0);
      const first = annual / denom;
      months.forEach((m, i) => (values[m.key] = Math.round(first * Math.pow(r, i))));
    }
    fpa.setBudgetRow(lineKey, values);
  }

  const editable = grain === "month";

  return (
    <FpaShell
      title="Budget"
      description="The approved operating plan. Edit any figure — margins, totals and variance update instantly."
      showScenario={false}
      actions={
        <>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {(["quarter", "month"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrain(g)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  grain === g ? "bg-brand-soft text-brand" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g === "quarter" ? "Quarterly" : "Monthly"}
              </button>
            ))}
          </div>
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
            Re-baseline
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Budgeted revenue" value={money(fy.revenue, true)} sub={`${months.length} months in view`} />
        <KpiCard label="Gross profit" value={money(fy.grossProfit, true)} sub={`${pct(gmPct)} gross margin`} tone={gmPct >= 60 ? "good" : "neutral"} />
        <KpiCard label="Operating expenses" value={money(fy.totalOpex, true)} sub={`${pct(opexPct)} of revenue · payroll ${money(fy.payroll, true)}`} />
        <KpiCard
          label="Projected EBITDA"
          value={money(fy.ebitda, true)}
          sub={`${pct(ebitdaPct)} margin`}
          tone={fy.ebitda >= 0 ? "good" : "bad"}
        />
      </div>

      <Panel
        title="Line-item budget"
        description={
          editable
            ? "Type directly into any month, or use the allocate menu to spread an annual amount."
            : "Quarterly review view. Switch to Monthly to edit individual figures."
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left">Line</th>
                <th className="px-2 py-2 text-left">Allocate</th>
                {buckets.map((b) => (
                  <th key={b.key} className="px-2 py-2 text-right font-medium">
                    <span className={cn(b.isActual && "text-muted-foreground/70")}>{b.label}</span>
                    {b.isActual ? (
                      <span className="ml-1 rounded bg-muted px-1 text-[9px] font-semibold uppercase">A</span>
                    ) : null}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => {
                const lines = BUDGET_LINES.filter((l) => l.group === group);
                const groupTotals = buckets.map((b) => lines.reduce((a, l) => a + sumBucket(state.budget, l.key, b), 0));
                return (
                  <Fragment key={group}>
                    <tr className="bg-muted/40">
                      <td className="sticky left-0 z-10 bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" colSpan={2}>
                        {group}
                      </td>
                      <td colSpan={buckets.length + 1} />
                    </tr>
                    {lines.map((line) => {
                      const total = buckets.reduce((a, b) => a + sumBucket(state.budget, line.key, b), 0);
                      return (
                        <tr key={line.key} className="border-b border-border/50 transition-colors hover:bg-accent/40">
                          <td className="sticky left-0 z-10 bg-card px-3 py-1.5 whitespace-nowrap">{line.label}</td>
                          <td className="px-2 py-1.5">
                            <AllocatePopover
                              lineLabel={line.label}
                              currentTotal={total}
                              monthCount={months.length}
                              onApply={(annual, mode) => applySpread(line.key, annual, mode)}
                            />
                          </td>
                          {buckets.map((b) =>
                            editable ? (
                              <td key={b.key} className="px-1 py-1">
                                <NumberCell
                                  value={state.budget[line.key]?.[b.key] ?? 0}
                                  step={1000}
                                  onChange={(v) => fpa.setBudgetCell(line.key, b.key, v)}
                                />
                              </td>
                            ) : (
                              <td key={b.key} className="px-2 py-1.5 text-right tabular-nums">
                                {money(sumBucket(state.budget, line.key, b), true)}
                              </td>
                            ),
                          )}
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium">{money(total, true)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-b border-border bg-card/60 text-sm font-semibold">
                      <td className="sticky left-0 z-10 bg-card px-3 py-1.5" colSpan={2}>
                        Total {group.toLowerCase()}
                      </td>
                      {groupTotals.map((v, i) => (
                        <td key={buckets[i]!.key} className="px-2 py-1.5 text-right tabular-nums">
                          {money(v, true)}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {money(groupTotals.reduce((a, v) => a + v, 0), true)}
                      </td>
                    </tr>
                    {group === "Cost of sales" ? (
                      <SummaryRow label="Gross profit" buckets={buckets} pick={(t) => t.grossProfit} budget={state.budget} />
                    ) : null}
                  </Fragment>
                );
              })}

              <SummaryRow label="EBITDA" buckets={buckets} pick={(t) => t.ebitda} budget={state.budget} emphasis />

            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs">
          <span className="text-muted-foreground">
            Gross margin <span className="ml-1 font-semibold tabular-nums text-foreground">{pct(gmPct)}</span>
          </span>
          <span className="text-muted-foreground">
            Opex ratio <span className="ml-1 font-semibold tabular-nums text-foreground">{pct(opexPct)}</span>
          </span>
          <span className="text-muted-foreground">
            EBITDA margin{" "}
            <span className={cn("ml-1 font-semibold tabular-nums", ebitdaPct >= 0 ? "text-positive" : "text-negative")}>
              {pct(ebitdaPct)}
            </span>
          </span>
          <span className="ml-auto text-muted-foreground/80">Months marked “A” are closed actuals.</span>
        </div>
      </Panel>
    </FpaShell>
  );
}

function SummaryRow({
  label,
  buckets,
  budget,
  pick,
  emphasis = false,
}: {
  label: string;
  buckets: Bucket[];
  budget: Budget;
  pick: (t: ReturnType<typeof bucketTotals>) => number;
  emphasis?: boolean;
}) {
  const values = buckets.map((b) => pick(bucketTotals(budget, b)));
  const total = values.reduce((a, v) => a + v, 0);
  return (
    <tr className={cn("border-t-2 border-border font-semibold", emphasis && "bg-brand-soft/40")}>
      <td className={cn("sticky left-0 z-10 px-3 py-2", emphasis ? "bg-brand-soft/40" : "bg-card")} colSpan={2}>
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={buckets[i]!.key}
          className={cn("px-2 py-2 text-right tabular-nums", v < 0 ? "text-negative" : emphasis ? "text-positive" : "")}
        >
          {money(v, true)}
        </td>
      ))}
      <td className={cn("px-3 py-2 text-right tabular-nums", total < 0 ? "text-negative" : emphasis ? "text-positive" : "")}>
        {money(total, true)}
      </td>
    </tr>
  );
}

function AllocatePopover({
  lineLabel,
  currentTotal,
  monthCount,
  onApply,
}: {
  lineLabel: string;
  currentTotal: number;
  monthCount: number;
  onApply: (annual: number, mode: "even" | "ramp" | "clear") => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  function run(mode: "even" | "ramp" | "clear") {
    const annual = Number(amount) || currentTotal;
    onApply(annual, mode);
    setOpen(false);
    setAmount("");
    toast.success(
      mode === "clear" ? `${lineLabel} cleared` : `${lineLabel} spread across ${monthCount} months`,
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
          Allocate
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div>
          <p className="text-sm font-medium">{lineLabel}</p>
          <p className="text-xs text-muted-foreground">Current total {money(currentTotal, true)}</p>
        </div>
        <Input
          autoFocus
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Annual amount"
          className="h-8"
        />
        <div className="grid gap-1.5">
          <Button size="sm" className="h-8 justify-start text-xs" variant="secondary" onClick={() => run("even")}>
            Spread evenly
          </Button>
          <Button size="sm" className="h-8 justify-start text-xs" variant="secondary" onClick={() => run("ramp")}>
            Ramp +1.5% per month
          </Button>
          <Button size="sm" className="h-8 justify-start text-xs" variant="ghost" onClick={() => run("clear")}>
            Clear this line
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
