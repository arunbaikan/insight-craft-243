import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FpaShell, KpiCard, NumberCell, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { activeScenario, fpa, useFpa } from "@/lib/fpa/store";
import { ASSUMPTION_LABELS, type Assumptions } from "@/lib/fpa/engine";
import {
  DEFAULT_MC_DRIVERS,
  MEASURE_LABELS,
  SENSITIVITY_DRIVERS,
  goalSeek,
  monteCarlo,
  sensitivityGrid,
  tornado,
  type Measure,
} from "@/lib/fpa/analytics";

export const Route = createFileRoute("/fpa/sensitivity")({
  head: () => ({
    meta: [
      { title: "Sensitivity, simulation & goal seek — Ledgerframe FP&A" },
      {
        name: "description",
        content: "Tornado sensitivity, a two-driver data table, Monte Carlo risk ranges and goal seek to solve any driver back from a target.",
      },
      { property: "og:title", content: "Sensitivity & risk analysis — Ledgerframe FP&A" },
      { property: "og:description", content: "Tornado charts, Monte Carlo simulation and goal seek on the live plan." },
    ],
  }),
  component: SensitivityPage,
});

const MEASURES: Measure[] = ["ebitda", "revenue", "endingCash", "fcf"];

function SensitivityPage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const [measure, setMeasure] = useState<Measure>("ebitda");
  const [swing, setSwing] = useState(100);
  const [runs, setRuns] = useState(400);
  const [rowKey, setRowKey] = useState<keyof Assumptions>("revenueGrowthPct");
  const [colKey, setColKey] = useState<keyof Assumptions>("cogsPct");
  const [seekDriver, setSeekDriver] = useState<keyof Assumptions>("revenueGrowthPct");
  const [target, setTarget] = useState(2_000_000);

  const bars = useMemo(
    () => tornado(scenario, state.headcount, measure, swing / 100),
    [scenario, state.headcount, measure, swing],
  );
  const grid = useMemo(
    () => sensitivityGrid(scenario, state.headcount, measure, rowKey, colKey),
    [scenario, state.headcount, measure, rowKey, colKey],
  );
  const sim = useMemo(
    () => monteCarlo(scenario, state.headcount, measure, DEFAULT_MC_DRIVERS, runs),
    [scenario, state.headcount, measure, runs],
  );
  const seek = useMemo(
    () => goalSeek(scenario, state.headcount, measure, seekDriver, target),
    [scenario, state.headcount, measure, seekDriver, target],
  );

  const tornadoData = bars.map((b) => ({ label: b.label, low: Math.round(b.low), high: Math.round(b.high) }));
  const driverKeys = SENSITIVITY_DRIVERS.map((d) => d.key);
  const cells = grid.cells.flat();
  const min = Math.min(...cells);
  const max = Math.max(...cells);

  return (
    <FpaShell
      title="Sensitivity & risk"
      description="Which drivers actually move the number, how wide the range of outcomes is, and what it takes to hit a target."
      actions={
        <Select value={measure} onValueChange={(v) => setMeasure(v as Measure)}>
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEASURES.map((m) => (
              <SelectItem key={m} value={m}>
                {MEASURE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Downside (P10)" value={money(sim.p10, true)} tone={sim.p10 >= 0 ? "neutral" : "bad"} />
        <KpiCard label="Expected (P50)" value={money(sim.p50, true)} />
        <KpiCard label="Upside (P90)" value={money(sim.p90, true)} tone="good" />
        <KpiCard
          label="Chance of a positive result"
          value={pct(sim.probPositive * 100, 0)}
          sub={`${runs} simulated plans`}
          tone={sim.probPositive > 0.7 ? "good" : sim.probPositive < 0.4 ? "bad" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Tornado — driver impact ranked"
          description={`Each bar shows ${MEASURE_LABELS[measure]} if that single driver moves either way, everything else held flat.`}
          right={
            <div className="flex w-[220px] items-center gap-2">
              <span className="text-xs text-muted-foreground">Swing</span>
              <Slider value={[swing]} min={25} max={200} step={25} onValueChange={([v]) => setSwing(v ?? 100)} />
              <span className="w-10 text-right text-xs tabular-nums">{swing}%</span>
            </div>
          }
        >
          <div style={{ height: tornadoData.length * 40 + 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tornadoData} layout="vertical" stackOffset="sign" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => money(Number(v), true)} />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <ReferenceLine x={0} stroke="var(--border)" />
                <Bar dataKey="low" name="Driver down" fill="var(--negative)" stackId="t" radius={[3, 0, 0, 3]} />
                <Bar dataKey="high" name="Driver up" fill="var(--positive)" stackId="t" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Monte Carlo distribution" description="Growth, churn, cost of sales and marketing sampled together.">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Runs</span>
            <Slider value={[runs]} min={100} max={1200} step={100} onValueChange={([v]) => setRuns(v ?? 400)} />
            <span className="w-10 text-right text-xs tabular-nums">{runs}</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sim.histogram} margin={{ left: 4, right: 4 }}>
                <XAxis dataKey="mid" tick={{ fontSize: 10 }} tickFormatter={(v) => money(Number(v), true)} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip
                  labelFormatter={(v) => money(Number(v), true)}
                  formatter={(v) => [`${v} plans`, "Frequency"]}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {sim.histogram.map((h, i) => (
                    <Cell key={i} fill={h.mid < 0 ? "var(--negative)" : "var(--brand)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Mean {money(sim.mean, true)} · 80% of outcomes fall between {money(sim.p10, true)} and {money(sim.p90, true)}.
          </p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Two-driver data table"
          description={`${MEASURE_LABELS[measure]} across a ±30% range on both drivers.`}
          right={
            <div className="flex gap-2">
              <Select value={rowKey} onValueChange={(v) => setRowKey(v as keyof Assumptions)}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {driverKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ASSUMPTION_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={colKey} onValueChange={(v) => setColKey(v as keyof Assumptions)}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {driverKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ASSUMPTION_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 text-left">
                    {ASSUMPTION_LABELS[rowKey]} ↓ / {ASSUMPTION_LABELS[colKey]} →
                  </th>
                  {grid.colVals.map((c) => (
                    <th key={c} className="px-2 py-2 text-right tabular-nums">
                      {c.toFixed(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.rowVals.map((r, ri) => (
                  <tr key={r} className="border-b border-border/60">
                    <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{r.toFixed(1)}</td>
                    {grid.cells[ri]!.map((v, ci) => {
                      const t = max === min ? 0.5 : (v - min) / (max - min);
                      return (
                        <td
                          key={ci}
                          className="px-2 py-1.5 text-right tabular-nums"
                          style={{ background: `color-mix(in srgb, var(--brand) ${Math.round(t * 42)}%, transparent)` }}
                        >
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

        <Panel title="Goal seek" description="Solve one driver backwards from the result you need.">
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Target {MEASURE_LABELS[measure]}</span>
              <NumberCell value={target} step={100_000} onChange={setTarget} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Solve for</span>
              <Select value={seekDriver} onValueChange={(v) => setSeekDriver(v as keyof Assumptions)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {driverKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ASSUMPTION_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              {seek.ok ? (
                <>
                  <p className="text-xs text-muted-foreground">{ASSUMPTION_LABELS[seekDriver]} must be</p>
                  <p className="font-display text-2xl font-semibold tabular-nums text-brand">{seek.value.toFixed(2)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Today {scenario.assumptions[seekDriver].toFixed(2)} · reaches {money(seek.achieved, true)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No value of {ASSUMPTION_LABELS[seekDriver]} reaches that target on its own — try a different driver or a
                  softer target.
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={!seek.ok || scenario.locked}
              onClick={() => {
                if (!seek.ok) return;
                fpa.updateAssumption(scenario.id, seekDriver, Number(seek.value.toFixed(2)));
                toast.success(`${ASSUMPTION_LABELS[seekDriver]} set to ${seek.value.toFixed(2)}`);
              }}
              title={scenario.locked ? "The base plan is locked" : undefined}
            >
              {scenario.locked ? "Base plan is locked — clone it to apply" : "Apply to this scenario"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Nothing changes until you apply it, and only this scenario is affected.
            </p>
          </div>
        </Panel>
      </div>
    </FpaShell>
  );
}
