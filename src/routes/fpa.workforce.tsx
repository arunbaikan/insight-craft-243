import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FpaShell, KpiCard, NumberCell, Panel, money } from "@/components/fpa/fpa-shell";
import { activeScenario, fpa, useFpa } from "@/lib/fpa/store";
import { CHART_COLORS } from "@/lib/format";
import { DEPARTMENTS, PLAN_MONTHS, computePlan, type Department } from "@/lib/fpa/engine";

export const Route = createFileRoute("/fpa/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce plan — Ledgerframe FP&A" },
      { name: "description", content: "Plan hires by department and start month and see loaded payroll cost flow straight into the forecast." },
      { property: "og:title", content: "Workforce plan — Ledgerframe FP&A" },
      { property: "og:description", content: "Headcount planning wired into the P&L." },
    ],
  }),
  component: WorkforcePage,
});

function WorkforcePage() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const plan = computePlan(scenario, state.headcount);
  const load = scenario.assumptions.payrollLoadPct;

  const totalHires = state.headcount.reduce((a, h) => a + h.count, 0);
  const annualCost = state.headcount.reduce((a, h) => a + h.count * h.annualSalary, 0) * (1 + load / 100);

  const byDept = DEPARTMENTS.map((d) => ({
    name: d,
    hires: state.headcount.filter((h) => h.department === d).reduce((a, h) => a + h.count, 0),
    cost: Math.round(
      state.headcount.filter((h) => h.department === d).reduce((a, h) => a + h.count * h.annualSalary, 0) * (1 + load / 100),
    ),
  })).filter((d) => d.hires > 0);

  const ramp = plan.map((r) => ({ name: r.month.short, headcount: r.headcount, payroll: Math.round(r.payroll) }));

  function update(id: string, patch: Partial<(typeof state.headcount)[number]>) {
    fpa.setHeadcount(state.headcount.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  return (
    <FpaShell
      title="Workforce plan"
      description="Hiring drives payroll, payroll drives EBITDA — change a row and the forecast follows."
      actions={
        <Button
          size="sm"
          onClick={() =>
            fpa.setHeadcount([
              ...state.headcount,
              {
                id: `hc-${Date.now().toString(36)}`,
                department: "Engineering",
                role: "New role",
                count: 1,
                startMonth: PLAN_MONTHS[0]!.key,
                annualSalary: 100_000,
              },
            ])
          }
        >
          <Plus className="mr-1 size-4" /> Add hire
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Planned hires" value={`${totalHires}`} sub={`${state.headcount.length} requisitions`} />
        <KpiCard label="Loaded annual cost" value={money(annualCost, true)} sub={`Payroll load ${load}%`} />
        <KpiCard label="Ending headcount" value={`${plan[plan.length - 1]?.headcount ?? 0}`} />
        <KpiCard label="Exit monthly payroll" value={money(plan[plan.length - 1]?.payroll ?? 0, true)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Headcount and payroll ramp">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ramp} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v), true)} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v, n) => (n === "Payroll" ? money(Number(v)) : v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="payroll" name="Payroll" fill="var(--brand)" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="r" dataKey="headcount" name="Headcount" fill="var(--accent-cyan)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Cost by department">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byDept} dataKey="cost" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {byDept.map((_d, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Hiring plan" description="Start month decides when the cost hits the P&L.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left">Department</th>
                <th className="py-2 text-left">Role</th>
                <th className="py-2 text-right">Headcount</th>
                <th className="py-2 text-left">Start month</th>
                <th className="py-2 text-right">Annual salary</th>
                <th className="py-2 text-right">Loaded monthly</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {state.headcount.map((h) => (
                <tr key={h.id} className="border-b border-border/60">
                  <td className="py-1.5 pr-2">
                    <Select value={h.department} onValueChange={(v) => update(h.id, { department: v as Department })}>
                      <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input value={h.role} onChange={(e) => update(h.id, { role: e.target.value })} className="h-8 w-[180px]" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumberCell value={h.count} onChange={(v) => update(h.id, { count: Math.max(0, Math.round(v)) })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Select value={h.startMonth} onValueChange={(v) => update(h.id, { startMonth: v })}>
                      <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLAN_MONTHS.map((m) => (
                          <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <NumberCell value={h.annualSalary} step={1000} onChange={(v) => update(h.id, { annualSalary: Math.max(0, v) })} />
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {money((h.count * h.annualSalary * (1 + load / 100)) / 12)}
                  </td>
                  <td className="py-1.5 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${h.role}`}
                      onClick={() => fpa.setHeadcount(state.headcount.filter((x) => x.id !== h.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </FpaShell>
  );
}
