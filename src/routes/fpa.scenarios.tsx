import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FpaShell, NumberCell, Panel, money, pct } from "@/components/fpa/fpa-shell";
import { activeScenario, compareScenario, fpa, useFpa } from "@/lib/fpa/store";
import { ASSUMPTION_GROUPS, ASSUMPTION_LABELS, MONEY_KEYS, computePlan, driverBridge, summarise } from "@/lib/fpa/engine";

export const Route = createFileRoute("/fpa/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenario planning — Ledgerframe FP&A" },
      { name: "description", content: "Compare base, upside and downside plans side by side, clone scenarios and see which driver moves EBITDA the most." },
      { property: "og:title", content: "Scenario planning — Ledgerframe FP&A" },
      { property: "og:description", content: "Side-by-side scenario comparison with a driver bridge." },
    ],
  }),
  component: ScenariosPage,
});

function ScenariosPage() {
  const state = useFpa();
  const a = activeScenario(state);
  const b = compareScenario(state);
  const [name, setName] = useState("");

  const planA = computePlan(a, state.headcount);
  const planB = computePlan(b, state.headcount);
  const sa = summarise(planA);
  const sb = summarise(planB);

  const trend = planA.map((r, i) => ({
    name: r.month.short,
    [a.name]: Math.round(r.revenue),
    [b.name]: Math.round(planB[i]?.revenue ?? 0),
  }));

  const bridge = driverBridge(a, b, state.headcount);

  const metrics: { label: string; a: string; b: string; delta: number }[] = [
    { label: "Revenue (12m)", a: money(sa.revenue, true), b: money(sb.revenue, true), delta: sb.revenue - sa.revenue },
    { label: "Gross profit", a: money(sa.grossProfit, true), b: money(sb.grossProfit, true), delta: sb.grossProfit - sa.grossProfit },
    { label: "EBITDA", a: money(sa.ebitda, true), b: money(sb.ebitda, true), delta: sb.ebitda - sa.ebitda },
    { label: "EBITDA margin", a: pct(sa.ebitdaMarginPct), b: pct(sb.ebitdaMarginPct), delta: sb.ebitdaMarginPct - sa.ebitdaMarginPct },
    { label: "Net income", a: money(sa.netIncome, true), b: money(sb.netIncome, true), delta: sb.netIncome - sa.netIncome },
    { label: "Free cash flow", a: money(sa.fcf, true), b: money(sb.fcf, true), delta: sb.fcf - sa.fcf },
    { label: "Ending cash", a: money(sa.endingCash, true), b: money(sb.endingCash, true), delta: sb.endingCash - sa.endingCash },
    { label: "Rule of 40", a: pct(sa.ruleOf40), b: pct(sb.ruleOf40), delta: sb.ruleOf40 - sa.ruleOf40 },
  ];

  return (
    <FpaShell
      title="Scenarios"
      description="Model the plan under different assumptions and see exactly which driver caused the gap."
      actions={
        <div className="flex items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New scenario name" className="h-9 w-[190px]" />
          <Button
            size="sm"
            onClick={() => {
              const n = name.trim() || `${a.name} copy`;
              fpa.addScenario(a, n);
              setName("");
              toast.success(`${n} created from ${a.name}`);
            }}
          >
            <Copy className="mr-1 size-4" /> Clone active
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Side-by-side comparison"
          description="Active scenario against the comparison scenario."
          right={
            <Select value={state.compareScenarioId} onValueChange={(v) => fpa.setCompare(v)}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left">Metric</th>
                <th className="py-2 text-right">{a.name}</th>
                <th className="py-2 text-right">{b.name}</th>
                <th className="py-2 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.label} className="border-b border-border/60">
                  <td className="py-2">{m.label}</td>
                  <td className="py-2 text-right tabular-nums">{m.a}</td>
                  <td className="py-2 text-right tabular-nums">{m.b}</td>
                  <td className={`py-2 text-right tabular-nums ${m.delta >= 0 ? "text-positive" : "text-negative"}`}>
                    {m.delta >= 0 ? "+" : ""}
                    {Math.abs(m.delta) < 1000 ? m.delta.toFixed(1) : money(m.delta, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey={a.name} stroke={a.color} strokeWidth={2.5} dot={false} />
                <Line dataKey={b.name} stroke={b.color} strokeWidth={2.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Driver bridge" description={`Why EBITDA differs between ${a.name} and ${b.name}.`}>
          {bridge.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Both scenarios use identical drivers — change one to see the bridge.</p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bridge.steps.map((s) => ({ name: s.label, value: Math.round(s.value) }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => money(Number(v), true)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="value" name="EBITDA impact" fill="var(--accent-cyan)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {money(bridge.baseEbitda, true)} → {money(bridge.targetEbitda, true)}
          </p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {state.scenarios.map((s) => (
          <Panel
            key={s.id}
            title={s.name}
            description={s.description}
            right={
              <div className="flex items-center gap-1">
                <Button size="sm" variant={s.id === state.activeScenarioId ? "default" : "outline"} onClick={() => fpa.setActive(s.id)}>
                  {s.id === state.activeScenarioId ? "Active" : "Activate"}
                </Button>
                {s.locked ? null : (
                  <Button size="icon" variant="ghost" onClick={() => fpa.removeScenario(s.id)} aria-label={`Delete ${s.name}`}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            }
          >
            <div className="space-y-3">
              {ASSUMPTION_GROUPS.slice(0, 2).map((g) => (
                <div key={g.title}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
                  <div className="space-y-1.5">
                    {g.keys.map((k) => (
                      <label key={k} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{ASSUMPTION_LABELS[k]}</span>
                        <div className="w-[110px]">
                          <NumberCell
                            value={s.assumptions[k]}
                            step={MONEY_KEYS.has(k) ? 1000 : 0.1}
                            onChange={(v) => fpa.updateAssumption(s.id, k, v)}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </FpaShell>
  );
}
