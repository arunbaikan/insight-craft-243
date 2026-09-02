import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WidgetFrame({
  title,
  subtitle,
  children,
  className,
  headerRight,
  bare,
}: {
  title?: string | null | undefined;
  subtitle?: string | null | undefined;
  children: ReactNode;
  className?: string | undefined;
  headerRight?: ReactNode;
  bare?: boolean | undefined;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        className,
      )}
    >
      {title || headerRight ? (
        <header className="flex items-start justify-between gap-2 px-4 pt-3">
          <div className="min-w-0">
            {title ? <h3 className="truncate font-display text-sm font-semibold">{title}</h3> : null}
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          {headerRight}
        </header>
      ) : null}
      <div className={cn("min-h-0 flex-1", bare ? "" : "px-4 pb-3 pt-2")}>{children}</div>
    </section>
  );
}

export function WidgetError({ title, message }: { title?: string | null | undefined; message: string }) {
  return (
    <WidgetFrame title={title} className="border-negative/40 bg-negative/5">
      <div className="flex h-full flex-col justify-center gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-negative">
          <AlertTriangle className="size-4" /> Metric failed
        </span>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </WidgetFrame>
  );
}

export function WidgetSkeleton({ title }: { title?: string | null | undefined }) {
  return (
    <WidgetFrame title={title}>
      <div className="h-full w-full animate-pulse rounded-md bg-muted" />
    </WidgetFrame>
  );
}
