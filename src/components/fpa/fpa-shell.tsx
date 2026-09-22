import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyControls } from "@/components/dashboard/currency-controls";
import { PlanDashboardLink, PublishPlanButton } from "@/components/fpa/publish-plan-button";
import { formatValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fpa, useFpa } from "@/lib/fpa/store";

export const FPA_TABS = [
  { to: "/fpa/budget", label: "Budget", group: "Plan & model" },
  { to: "/fpa/forecast", label: "Forecast", group: "Plan & model" },
  { to: "/fpa/workforce", label: "Workforce", group: "Plan & model" },
  { to: "/fpa/scenarios", label: "Scenarios", group: "Plan & model" },
  { to: "/fpa/statements", label: "Statements", group: "Financials" },
  { to: "/fpa/cashflow", label: "Cash flow", group: "Financials" },
  { to: "/fpa/variance", label: "Variance", group: "Financials" },
  { to: "/fpa", label: "Overview", group: "Executive" },
  { to: "/fpa/board", label: "Board pack", group: "Executive" },
  { to: "/fpa/unit-economics", label: "Unit economics", group: "Executive" },
  { to: "/fpa/sensitivity", label: "Sensitivity", group: "Executive" },
  { to: "/fpa/reports", label: "Reports", group: "Executive" },
] as const;

export const FPA_GROUPS = ["Plan & model", "Financials", "Executive"] as const;




export function money(value: number, compact = false) {
  return formatValue(value, "currency", 0, null, compact);
}

export function pct(value: number, dp = 1) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}%`;
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
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Working draft
          </span>
          <span className="text-sm font-medium">FY operating model</span>
          <span className="text-xs text-muted-foreground">
            Scenario: {state.scenarios.find((s) => s.id === state.activeScenarioId)?.name ?? "—"} · autosaved on this device
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card p-2">
          {FPA_GROUPS.map((group) => (
            <div key={group} className="flex items-center gap-1.5">
              <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group}</span>
              <div className="flex flex-wrap gap-1">
                {FPA_TABS.filter((t) => t.group === group).map((t) => (
                  <Link
                    key={t.to}
                    to={t.to}
                    activeOptions={{ exact: t.to === "/fpa" }}
                    className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "bg-brand-soft text-brand font-medium" }}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
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
