import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Copy, Lock, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getMetricCatalogue } from "@/lib/metrics.functions";

const KIND_FILTERS = ["all", "aggregate", "balance", "ratio", "formula", "ageing"] as const;

export const Route = createFileRoute("/metrics/")({
  head: () => ({
    meta: [
      { title: "Metric library — Ledgerframe" },
      {
        name: "description",
        content:
          "Define KPIs in plain language: pick a source, filter it, set a target, and watch the value update before you save.",
      },
      { property: "og:title", content: "Metric library — Ledgerframe" },
      { property: "og:description", content: "User-editable KPI definitions with live preview and validation." },
    ],
  }),
  component: MetricsPage,
});

function MetricsPage() {
  const navigate = useNavigate();
  const catalogue = useQuery({ queryKey: ["metric-catalogue"], queryFn: () => getMetricCatalogue() });
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]>("all");

  const metrics = catalogue.data?.metrics ?? [];
  const filtered = useMemo(
    () =>
      metrics.filter(
        (m) =>
          (kind === "all" || m.metric_kind === kind) &&
          `${m.name} ${m.key} ${m.description ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [metrics, q, kind],
  );

  return (
    <AppShell
      title="Metric library"
      description="System metrics are read-only; clone one to make it yours, or start from scratch."
      actions={
        <Button asChild>
          <Link to="/metrics/new">
            <Plus className="size-4" /> New metric
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Search metrics"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {KIND_FILTERS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                kind === k ? "border-brand bg-brand-soft text-brand" : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <article key={m.key} className="flex flex-col rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-sm font-semibold">{m.name}</h3>
              <Badge variant="outline" className="text-[10px] capitalize">{m.metric_kind}</Badge>
            </div>
            <code className="mt-1 text-[11px] text-muted-foreground">{m.key}</code>
            <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">{m.description}</p>
            <div className="mt-3 flex items-center gap-2">
              {m.is_system ? (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock className="size-3" /> System
                </span>
              ) : null}
              <Button
                size="sm"
                variant={m.is_system ? "outline" : "secondary"}
                className="ml-auto"
                onClick={() =>
                  m.is_system
                    ? navigate({ to: "/metrics/new", search: { clone: m.key } })
                    : navigate({ to: "/metrics/$key", params: { key: m.key } })
                }
              >
                {m.is_system ? <><Copy className="size-3.5" /> Clone</> : "Edit"}
              </Button>
            </div>
          </article>
        ))}
        {catalogue.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)
          : null}
      </div>
      {!catalogue.isLoading && filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No metric matches that search.</p>
      ) : null}
    </AppShell>
  );
}
