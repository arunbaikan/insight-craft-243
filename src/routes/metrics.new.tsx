import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { EMPTY_METRIC, MetricBuilder } from "@/components/metrics/metric-builder";
import { getMetricCatalogue } from "@/lib/metrics.functions";
import type { MetricDefinition } from "@/lib/metrics/types";

export const Route = createFileRoute("/metrics/new")({
  validateSearch: (search: Record<string, unknown>): { clone?: string } =>
    typeof search["clone"] === "string" ? { clone: search["clone"] } : {},
  head: () => ({
    meta: [
      { title: "New metric — Ledgerframe" },
      { name: "description", content: "Create a KPI definition: choose a source or write a formula, then set targets and thresholds." },
      { property: "og:title", content: "New metric — Ledgerframe" },
      { property: "og:description", content: "Build a KPI from scratch with live validation and preview." },
    ],
  }),
  component: NewMetricPage,
});

function NewMetricPage() {
  const navigate = useNavigate();
  const { clone } = Route.useSearch();
  const catalogue = useQuery({ queryKey: ["metric-catalogue"], queryFn: () => getMetricCatalogue() });

  const initial: MetricDefinition | null = useMemo(() => {
    if (!clone) return { ...EMPTY_METRIC };
    const src = catalogue.data?.metrics.find((m) => m.key === clone);
    if (!src) return catalogue.data ? { ...EMPTY_METRIC } : null;
    return { ...src, id: undefined, key: `${src.key}_copy`, name: `${src.name} (copy)`, is_system: false, version: 1 };
  }, [clone, catalogue.data]);

  return (
    <AppShell
      title={clone ? `Clone of ${clone}` : "New metric"}
      description="Every change is validated and previewed against live data before you save."
    >
      {catalogue.data && initial ? (
        <MetricBuilder
          catalogue={catalogue.data}
          initial={initial}
          onCancel={() => navigate({ to: "/metrics" })}
          onSaved={(m) => navigate({ to: "/metrics/$key", params: { key: m.key } })}
        />
      ) : (
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      )}
    </AppShell>
  );
}
