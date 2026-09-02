import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricBuilder } from "@/components/metrics/metric-builder";
import { Button } from "@/components/ui/button";
import { deleteMetric, getMetricCatalogue, getMetricUsage } from "@/lib/metrics.functions";

export const Route = createFileRoute("/metrics/$key")({
  head: ({ params }) => {
    const title = `Edit ${params.key} — Ledgerframe`;
    return {
      meta: [
        { title },
        { name: "description", content: `Edit the formula, source entity, filters, targets and colour thresholds behind the ${params.key} KPI.` },
        { property: "og:title", content: title },
        { property: "og:description", content: "Full metric builder with live validation and preview." },
      ],
    };
  },
  component: EditMetricPage,
});

function EditMetricPage() {
  const { key } = Route.useParams();
  const navigate = useNavigate();
  const catalogue = useQuery({ queryKey: ["metric-catalogue"], queryFn: () => getMetricCatalogue() });
  const usage = useQuery({ queryKey: ["metric-usage", key], queryFn: () => getMetricUsage({ data: { key } }) });

  const metric = useMemo(() => catalogue.data?.metrics.find((m) => m.key === key), [catalogue.data, key]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteMetric({ data: { id } }),
    onSuccess: async () => {
      toast.success("Metric deleted");
      await catalogue.refetch();
      navigate({ to: "/metrics" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (catalogue.isLoading) {
    return (
      <AppShell title="Loading metric">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  if (!metric) {
    return (
      <AppShell title="Metric not found" description={`No metric with the key "${key}" exists.`}>
        <Button onClick={() => navigate({ to: "/metrics" })}>Back to library</Button>
      </AppShell>
    );
  }

  if (metric.is_system) {
    return (
      <AppShell
        title={metric.name}
        description="System metrics are read-only. Clone it to change the formula, source or thresholds."
        actions={
          <Button onClick={() => navigate({ to: "/metrics/new", search: { clone: metric.key } })}>
            <Lock className="size-4" /> Clone to edit
          </Button>
        }
      >
        <pre className="overflow-auto rounded-xl border border-border bg-card p-4 text-xs">
          {JSON.stringify(metric, null, 2)}
        </pre>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Edit ${metric.name}`} description="Every change is validated and previewed against live data before you save.">
      <MetricBuilder
        catalogue={catalogue.data!}
        initial={metric}
        usedBy={usage.data ?? []}
        onCancel={() => navigate({ to: "/metrics" })}
        onSaved={async (m) => {
          await catalogue.refetch();
          if (m.key !== key) navigate({ to: "/metrics/$key", params: { key: m.key } });
        }}
        {...(metric.id
          ? {
              onDelete: () => {
                if (confirm(`Delete "${metric.name}"? Widgets bound to it will show an error card.`)) {
                  remove.mutate(metric.id!);
                }
              },
            }
          : {})}
      />
    </AppShell>
  );
}
