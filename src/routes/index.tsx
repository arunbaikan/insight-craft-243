import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, LayoutGrid, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { duplicateDashboard, listDashboards, saveDashboard } from "@/lib/dashboards.functions";
import { periodLabel } from "@/lib/metrics/period";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboards — Ledgerframe dashboard builder" },
      {
        name: "description",
        content:
          "Assemble finance and HR dashboards on a 12-column grid, bind your own KPI definitions, and share them with a role.",
      },
      { property: "og:title", content: "Dashboards — Ledgerframe dashboard builder" },
      {
        property: "og:description",
        content: "Self-service dashboards over normalised Zoho Books and QuickBooks data.",
      },
    ],
  }),
  component: DashboardGallery,
});

function DashboardGallery() {
  const router = useRouter();
  const dashboards = useQuery({ queryKey: ["dashboards"], queryFn: () => listDashboards() });

  const create = useMutation({
    mutationFn: async () => {
      const name = `Untitled dashboard ${new Date().toLocaleDateString("en-GB")}`;
      return saveDashboard({
        data: { dashboard: { name, slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}` }, widgets: [] },
      });
    },
    onSuccess: async () => {
      const list = await dashboards.refetch();
      const newest = list.data?.slice(-1)[0];
      await router.navigate({ to: "/dashboards/$slug/edit", params: { slug: newest?.slug ?? "" } });
    },
  });

  const clone = useMutation({
    mutationFn: (v: { slug: string; name: string }) => duplicateDashboard({ data: v }),
    onSuccess: (d) => {
      toast.success("Copied to your workspace");
      router.navigate({ to: "/dashboards/$slug/edit", params: { slug: d.slug } });
    },
  });

  const templates = (dashboards.data ?? []).filter((d) => d.is_template);
  const mine = (dashboards.data ?? []).filter((d) => !d.is_template);

  return (
    <AppShell
      title="Dashboards"
      description="Start from a reference template or build your own from a blank 12-column grid."
      actions={
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="size-4" /> New dashboard
        </Button>
      }
    >
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-4" /> Reference templates
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {templates.map((d) => (
            <article key={d.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
              <h3 className="font-display text-base font-semibold">{d.name}</h3>
              <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{d.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to="/dashboards/$slug" params={{ slug: d.slug }}>Open</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clone.mutate({ slug: d.slug, name: `${d.name} copy` })}
                  disabled={clone.isPending}
                >
                  <Copy className="size-3.5" /> Use as base
                </Button>
              </div>
            </article>
          ))}
          {dashboards.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)
            : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <LayoutGrid className="size-4" /> Workspace dashboards
        </h2>
        {mine.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing here yet. Create a dashboard or copy a template.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {mine.map((d) => (
              <article key={d.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold">{d.name}</h3>
                  <Badge variant="outline" className="text-[10px] capitalize">{d.visibility}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{d.description}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Default period: {periodLabel(d.default_period)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/dashboards/$slug" params={{ slug: d.slug }}>Open</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/dashboards/$slug/edit" params={{ slug: d.slug }}>Edit</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
