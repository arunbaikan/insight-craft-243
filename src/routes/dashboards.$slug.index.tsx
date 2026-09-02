import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GridCanvas } from "@/components/dashboard/grid-canvas";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDashboard, getDashboardData, type WidgetPayload } from "@/lib/dashboards.functions";
import { PERIOD_OPTIONS } from "@/lib/metrics/period";

export const Route = createFileRoute("/dashboards/$slug/")({
  loader: async ({ params }) => {
    const bundle = await getDashboard({ data: { slug: params.slug } });
    if (!bundle) throw notFound();
    return bundle;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.dashboard.name ?? "Dashboard";
    const description = loaderData?.dashboard.description ?? "Live KPI dashboard built from your own metric definitions.";
    return {
      meta: [
        { title: `${name} — Ledgerframe` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} — Ledgerframe` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: DashboardView,
});

function DashboardView() {
  const bundle = Route.useLoaderData();
  const [period, setPeriod] = useState(bundle.dashboard.default_period);
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(bundle.filters.filter((f) => f.default_value).map((f) => [f.key, f.default_value!])),
  );

  const data = useQuery({
    queryKey: ["dashboard-data", bundle.dashboard.id, period, filters],
    queryFn: () =>
      getDashboardData({ data: { dashboardId: bundle.dashboard.id, period, filters } }),
  });

  const byId: Record<string, WidgetPayload> = Object.fromEntries(
    (data.data?.widgets ?? []).map((w) => [w.widget_id, w]),
  );

  return (
    <AppShell
      title={bundle.dashboard.name}
      {...(bundle.dashboard.description ? { description: bundle.dashboard.description } : {})}
      actions={
        <>
          {bundle.filters.map((f) => (
            <Select
              key={f.id}
              value={filters[f.key] ?? "__all"}
              onValueChange={(v) =>
                setFilters((s) => {
                  const next = { ...s };
                  if (v === "__all") delete next[f.key];
                  else next[f.key] = v;
                  return next;
                })
              }
            >
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder={f.label} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All {f.label.toLowerCase()}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => data.refetch()} aria-label="Refresh data">
            <RefreshCw className={data.isFetching ? "size-4 animate-spin" : "size-4"} />
          </Button>
          <Button asChild variant="secondary">
            <Link to="/dashboards/$slug/edit" params={{ slug: bundle.dashboard.slug }}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
        </>
      }
    >
      <GridCanvas
        widgets={bundle.widgets}
        data={byId}
        loading={data.isLoading}
        cols={bundle.dashboard.layout_cols}
        rowHeight={bundle.dashboard.row_height_px}
      />
    </AppShell>
  );
}
