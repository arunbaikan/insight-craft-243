import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyControls } from "@/components/dashboard/currency-controls";
import { PlanDashboardLink, PublishPlanButton } from "@/components/fpa/publish-plan-button";
import { formatValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { activeScenario, fpa, useFpa } from "@/lib/fpa/store";
import { computePlan, summarise } from "@/lib/fpa/engine";

/**
 * The FP&A module is presented as one connected workflow rather than a flat
 * list of screens: four stages, each owning a small set of tabs, with a live
 * impact strip so every edit shows its effect on the model immediately.
 */
export const FPA_STAGES = [
  {
    id: "model",
    step: 1,
    label: "Build the model",
    hint: "Budget, drivers and hiring",
    tabs: [
      { to: "/fpa/budget", label: "Budget" },
      { to: "/fpa/forecast", label: "Forecast" },
      { to: "/fpa/workforce", label: "Workforce" },
    ],
  },
  {
    id: "outcome",
    step: 2,
    label: "See the outcome",
    hint: "Statements, cash and variance",
    tabs: [
      { to: "/fpa/statements", label: "Statements" },
      { to: "/fpa/cashflow", label: "Cash flow" },
      { to: "/fpa/variance", label: "Variance" },
      { to: "/fpa/unit-economics", label: "Unit economics" },
    ],
  },
  {
    id: "decide",
    step: 3,
    label: "Compare choices",
    hint: "Scenarios and sensitivity",
    tabs: [
      { to: "/fpa/scenarios", label: "Scenarios" },
      { to: "/fpa/sensitivity", label: "Sensitivity" },
    ],
  },
  {
    id: "share",
    step: 4,
    label: "Share the story",
    hint: "Board pack and exports",
    tabs: [
      { to: "/fpa/board", label: "Board pack" },
      { to: "/fpa/reports", label: "Reports" },
    ],
  },
] as const;

export const FPA_TABS = FPA_STAGES.flatMap((s) => s.tabs.map((t) => ({ ...t, group: s.label })));

export function money(value: number, compact = false) {
  return formatValue(value, "currency", 0, null, compact);
}

export function pct(value: number, dp = 1) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}%`;
}

function useStageId() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const stage = FPA_STAGES.find((s) => s.tabs.some((t) => pathname.startsWith(t.to)));
  return stage?.id ?? null;
}

function WorkflowBar({ activeId }: { activeId: string | null }) {
  const activeStep = FPA_STAGES.find((s) => s.id === activeId)?.step ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <div className="flex flex-wrap items-stretch gap-1">
        {FPA_STAGES.map((stage, i) => {
          const isActive = stage.id === activeId;
          const done = stage.step < activeStep;
          return (
            <div key={stage.id} className="flex flex-1 items-center gap-1">
              <Link
                to={stage.tabs[0].to}
                className={cn(
                  "flex min-w-[170px] flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  isActive ? "bg-brand-soft" : "hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isActive
                      ? "bg-brand text-primary-foreground"
                      : done
                        ? "bg-positive/15 text-positive"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : stage.step}
                </span>
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-medium", isActive ? "text-brand" : "text-foreground")}>
                    {stage.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{stage.hint}</span>
                </span>
              </Link>
              {i < FPA_STAGES.length - 1 ? (
                <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground/50 lg:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImpactStrip() {
  const state = useFpa();
  const scenario = activeScenario(state);
  const s = summarise(computePlan(scenario, state.headcount));

  const items = [
    { label: "Revenue (12m)", value: money(s.revenue, true) },
    { label: "EBITDA", value: money(s.ebitda, true), tone: s.ebitda >= 0 ? "good" : "bad" },
    { label: "Margin", value: pct(s.ebitdaMarginPct) },
    { label: "Ending cash", value: money(s.endingCash, true), tone: s.endingCash > 0 ? "good" : "bad" },
    { label: "Runway", value: s.runwayMonths ? `${s.runwayMonths.toFixed(1)} mo` : "Cash positive" },
    { label: "Headcount", value: `${s.endingHeadcount}` },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
        Live model · {scenario.name}
      </span>
      {items.map((it) => (
        <div key={it.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">{it.label}</p>
          <p
            className={cn(
              "font-display text-sm font-semibold tabular-nums",
              "tone" in it && it.tone === "good" && "text-positive",
              "tone" in it && it.tone === "bad" && "text-negative",
            )}
          >
            {it.value}
          </p>
        </div>
      ))}
      <span className="ml-auto text-xs text-muted-foreground">Every edit recalculates this instantly</span>
    </div>
  );
}

export function FpaShell({
  title,
  description,
  actions,
  children,
  showScenario = true,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  showScenario?: boolean;
}) {
  const state = useFpa();
  const stageId = useStageId();
  const stage = FPA_STAGES.find((s) => s.id === stageId);

  return (
    <AppShell
      title={title}
      description={description ?? ""}
      actions={
        <>
          {showScenario ? (
            <Select value={state.activeScenarioId} onValueChange={(v) => fpa.setActive(v)}>
              <SelectTrigger className="h-9 w-[190px]">
                <SelectValue placeholder="Scenario" />
              </SelectTrigger>
              <SelectContent>
                {state.scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <CurrencyControls />
          <PublishPlanButton />
          <PlanDashboardLink />
          {actions}
        </>
      }
    >
      <div className="mb-6 space-y-3">
        <WorkflowBar activeId={stageId} />
        {stage ? (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <Link
              to="/fpa"
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              ← Model map
            </Link>
            <span className="h-4 w-px bg-border" />
            {stage.tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-brand-soft text-brand font-medium" }}
              >
                {t.label}
              </Link>
            ))}
          </div>
        ) : null}
        <ImpactStrip />
      </div>

      {children}
    </AppShell>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-semibold tabular-nums",
          tone === "good" && "text-positive",
          tone === "bad" && "text-negative",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  right,
  children,
  className,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Numeric cell that only commits valid numbers back to the store. */
export function NumberCell({
  value,
  onChange,
  className,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: number;
}) {
  return (
    <Input
      type="number"
      step={step}
      value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      className={cn("h-8 w-full min-w-[92px] text-right tabular-nums", className)}
    />
  );
}
