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
  { to: "/fpa", label: "Overview" },
  { to: "/fpa/board", label: "Board pack" },
  { to: "/fpa/budget", label: "Budget" },
  { to: "/fpa/forecast", label: "Forecast" },
  { to: "/fpa/scenarios", label: "Scenarios" },
  { to: "/fpa/sensitivity", label: "Sensitivity" },
  { to: "/fpa/variance", label: "Variance" },
  { to: "/fpa/statements", label: "Statements" },
  { to: "/fpa/unit-economics", label: "Unit economics" },
  { to: "/fpa/workforce", label: "Workforce" },
  { to: "/fpa/cashflow", label: "Cash flow" },
  { to: "/fpa/reports", label: "Reports" },
] as const;

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
      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {FPA_TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.to === "/fpa" }}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-brand-soft text-brand font-medium" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
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
