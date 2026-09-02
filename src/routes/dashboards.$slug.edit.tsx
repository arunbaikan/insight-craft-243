import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Eye, Loader2, Plus, Save, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { GridCanvas } from "@/components/dashboard/grid-canvas";
import { WIDGET_CATALOGUE, type WidgetKind } from "@/components/widgets/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  deleteDashboard,
  getDashboard,
  getDashboardData,
  listRoles,
  saveDashboard,
  setDashboardShares,
  type WidgetPayload,
  type WidgetRecord,
} from "@/lib/dashboards.functions";
import { getMetricCatalogue } from "@/lib/metrics.functions";
import { PERIOD_OPTIONS } from "@/lib/metrics/period";

export const Route = createFileRoute("/dashboards/$slug/edit")({
  loader: async ({ params }) => {
    const bundle = await getDashboard({ data: { slug: params.slug } });
    if (!bundle) throw notFound();
    return bundle;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.dashboard.name ?? "Dashboard";
    return {
      meta: [
        { title: `Editing ${name} — Ledgerframe` },
        { name: "description", content: `Drag, resize and bind KPIs on the ${name} dashboard.` },
        { property: "og:title", content: `Editing ${name} — Ledgerframe` },
        { property: "og:description", content: "Self-service dashboard builder on a 12-column grid." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: DashboardBuilder,
});

const uid = () => `w_${Math.random().toString(36).slice(2, 10)}`;

function DashboardBuilder() {
  const bundle = Route.useLoaderData();
  const router = useRouter();

  const [meta, setMeta] = useState({
    name: bundle.dashboard.name,
    description: bundle.dashboard.description ?? "",
    default_period: bundle.dashboard.default_period,
    visibility: bundle.dashboard.visibility,
  });
  const [widgets, setWidgets] = useState<WidgetRecord[]>(bundle.widgets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [period, setPeriod] = useState(bundle.dashboard.default_period);
  const [shares, setShares] = useState(bundle.shares.map((s) => s.role_id).filter(Boolean) as string[]);

  const catalogue = useQuery({ queryKey: ["metric-catalogue"], queryFn: () => getMetricCatalogue() });
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => listRoles() });
  const data = useQuery({
    queryKey: ["dashboard-data", bundle.dashboard.id, period],
    queryFn: () => getDashboardData({ data: { dashboardId: bundle.dashboard.id, period } }),
  });

  const byId: Record<string, WidgetPayload> = Object.fromEntries(
    (data.data?.widgets ?? []).map((w) => [w.widget_id, w]),
  );
  const selected = widgets.find((w) => w.id === selectedId) ?? null;
  const metrics = catalogue.data?.metrics ?? [];
  const metricByKey = useMemo(() => new Map(metrics.map((m) => [m.key, m])), [metrics]);

  const save = useMutation({
    mutationFn: async () => {
      await saveDashboard({
        data: {
          dashboard: {
            id: bundle.dashboard.id,
            name: meta.name,
            slug: bundle.dashboard.slug,
            description: meta.description,
            default_period: meta.default_period,
            visibility: meta.visibility,
            layout_cols: bundle.dashboard.layout_cols,
            row_height_px: bundle.dashboard.row_height_px,
            is_template: false,
          },
          widgets: widgets.map(({ dashboard_id: _d, ...w }) => w),
        },
      });
      await setDashboardShares({
        data: { dashboardId: bundle.dashboard.id, shares: shares.map((r) => ({ role_id: r, permission: "view" })) },
      });
    },
    onSuccess: async () => {
      toast.success("Dashboard saved");
      await router.invalidate();
      data.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDashboard = useMutation({
    mutationFn: () => deleteDashboard({ data: { id: bundle.dashboard.id } }),
    onSuccess: () => {
      toast.success("Dashboard deleted");
      router.navigate({ to: "/" });
    },
  });

  const addWidget = (type: WidgetKind) => {
    const spec = WIDGET_CATALOGUE.find((w) => w.type === type)!;
    const bottom = widgets.reduce((m, w) => Math.max(m, w.grid_y + w.grid_h), 0);
    const w: WidgetRecord = {
      id: uid(),
      dashboard_id: bundle.dashboard.id,
      widget_type: type,
      title: spec.label,
      subtitle: null,
      grid_x: 0,
      grid_y: bottom,
      grid_w: spec.defaultSize.w,
      grid_h: spec.defaultSize.h,
      metric_binding: { series: spec.minSeries ? [{ metric_key: metrics[0]?.key ?? "" }] : [] },
      viz_config: {},
      sort_order: widgets.length,
    };
    setWidgets((s) => [...s, w]);
    setSelectedId(w.id);
  };

  const patchWidget = (id: string, p: Partial<WidgetRecord>) =>
    setWidgets((s) => s.map((w) => (w.id === id ? { ...w, ...p } : w)));

  return (
    <AppShell
      title={meta.name}
      description="Drag widgets to move, pull the corner to resize, then bind each series to a metric."
      actions={
        <>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline"><Share2 className="size-4" /> Share</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Share with roles</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Everyone in a selected role can view this dashboard.</p>
              <ul className="space-y-2">
                {(roles.data ?? []).map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                    <Checkbox
                      id={`role-${r.id}`}
                      checked={shares.includes(r.id)}
                      onCheckedChange={(c) =>
                        setShares((s) => (c ? [...s, r.id] : s.filter((x) => x !== r.id)))
                      }
                    />
                    <Label htmlFor={`role-${r.id}`} className="flex-1 cursor-pointer">
                      {r.name}
                      <span className="ml-2 text-xs text-muted-foreground">{(r.permissions ?? []).join(", ")}</span>
                    </Label>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>

          <Button asChild variant="outline">
            <Link to="/dashboards/$slug" params={{ slug: bundle.dashboard.slug }}><Eye className="size-4" /> View</Link>
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        {/* palette */}
        <aside className="space-y-2 rounded-xl border border-border bg-card p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Widgets</h2>
          {WIDGET_CATALOGUE.map((w) => {
            const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[w.icon] ?? Icons.Square;
            return (
              <button
                key={w.type}
                onClick={() => addWidget(w.type)}
                className="flex w-full items-start gap-2 rounded-lg border border-border p-2 text-left transition-colors hover:border-brand hover:bg-brand-soft"
              >
                <Icon className="mt-0.5 size-4 text-brand" />
                <span>
                  <span className="block text-xs font-medium">{w.label}</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">{w.description}</span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* canvas */}
        <div className="min-w-0">
          <GridCanvas
            widgets={widgets}
            data={byId}
            loading={data.isLoading}
            cols={bundle.dashboard.layout_cols}
            rowHeight={bundle.dashboard.row_height_px}
            editable
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={setWidgets}
            onDelete={(id) => {
              setWidgets((s) => s.filter((w) => w.id !== id));
              setSelectedId(null);
            }}
            onDuplicate={(id) =>
              setWidgets((s) => {
                const src = s.find((w) => w.id === id);
                if (!src) return s;
                return [...s, { ...src, id: uid(), grid_y: src.grid_y + src.grid_h }];
              })
            }
          />
        </div>

        {/* inspector */}
        <aside className="rounded-xl border border-border bg-card p-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-auto">
          <Tabs defaultValue="widget">
            <TabsList className="w-full">
              <TabsTrigger value="widget" className="flex-1">Widget</TabsTrigger>
              <TabsTrigger value="dashboard" className="flex-1">Dashboard</TabsTrigger>
            </TabsList>

            <TabsContent value="widget" className="space-y-3 pt-3">
              {!selected ? (
                <p className="text-xs text-muted-foreground">Select a widget on the canvas to configure it.</p>
              ) : (
                <>
                  <div>
                    <Label>Title</Label>
                    <Input value={selected.title ?? ""} onChange={(e) => patchWidget(selected.id, { title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Input
                      value={selected.subtitle ?? ""}
                      onChange={(e) => patchWidget(selected.id, { subtitle: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label>Widget type</Label>
                    <Select
                      value={selected.widget_type}
                      onValueChange={(v) => patchWidget(selected.id, { widget_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WIDGET_CATALOGUE.map((w) => (
                          <SelectItem key={w.type} value={w.type}>{w.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selected.widget_type === "text_block" ? (
                    <div>
                      <Label>Text</Label>
                      <Textarea
                        rows={4}
                        value={String(selected.viz_config?.["text"] ?? "")}
                        onChange={(e) =>
                          patchWidget(selected.id, { viz_config: { ...selected.viz_config, text: e.target.value } })
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Metric series</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            patchWidget(selected.id, {
                              metric_binding: {
                                series: [...(selected.metric_binding?.series ?? []), { metric_key: metrics[0]?.key ?? "" }],
                              },
                            })
                          }
                        >
                          <Plus className="size-3.5" /> Series
                        </Button>
                      </div>
                      {(selected.metric_binding?.series ?? []).map((s, i) => (
                        <div key={i} className="space-y-2 rounded-lg border border-border p-2">
                          <div className="flex items-center gap-2">
                            <Select
                              value={s.metric_key}
                              onValueChange={(v) =>
                                patchWidget(selected.id, {
                                  metric_binding: {
                                    series: selected.metric_binding.series.map((x, xi) => (xi === i ? { ...x, metric_key: v } : x)),
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Metric" /></SelectTrigger>
                              <SelectContent className="max-h-72">
                                {metrics.map((m) => (
                                  <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              className="rounded p-1 text-muted-foreground hover:text-destructive"
                              aria-label="Remove series"
                              onClick={() =>
                                patchWidget(selected.id, {
                                  metric_binding: { series: selected.metric_binding.series.filter((_, xi) => xi !== i) },
                                })
                              }
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              className="h-8"
                              placeholder="Series label"
                              value={s.label ?? ""}
                              onChange={(e) =>
                                patchWidget(selected.id, {
                                  metric_binding: {
                                    series: selected.metric_binding.series.map((x, xi) =>
                                      xi === i ? { ...x, label: e.target.value } : x,
                                    ),
                                  },
                                })
                              }
                            />
                            <Select
                              value={s.render_as ?? "bar"}
                              onValueChange={(v) =>
                                patchWidget(selected.id, {
                                  metric_binding: {
                                    series: selected.metric_binding.series.map((x, xi) =>
                                      xi === i ? { ...x, render_as: v as "bar" | "line" } : x,
                                    ),
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bar">Bars</SelectItem>
                                <SelectItem value="line">Line</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {metricByKey.get(s.metric_key)?.description ? (
                            <p className="text-[11px] text-muted-foreground">{metricByKey.get(s.metric_key)?.description}</p>
                          ) : null}
                        </div>
                      ))}
                      <Button asChild variant="ghost" size="sm" className="w-full">
                        <Link to="/metrics">Manage metric definitions</Link>
                      </Button>
                    </div>
                  )}

                  {selected.widget_type === "gauge_donut" ? (
                    <div>
                      <Label>Donut mode</Label>
                      <Select
                        value={String(selected.viz_config?.["donut_mode"] ?? "target")}
                        onValueChange={(v) =>
                          patchWidget(selected.id, { viz_config: { ...selected.viz_config, donut_mode: v } })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="target">Against target</SelectItem>
                          <SelectItem value="breakdown">Share breakdown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-4 gap-2">
                    {(["grid_x", "grid_y", "grid_w", "grid_h"] as const).map((k) => (
                      <div key={k}>
                        <Label className="text-[10px] uppercase">{k.replace("grid_", "")}</Label>
                        <Input
                          className="h-8"
                          type="number"
                          value={selected[k]}
                          onChange={(e) => patchWidget(selected.id, { [k]: Number(e.target.value) } as Partial<WidgetRecord>)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-3 pt-3">
              <div>
                <Label>Name</Label>
                <Input value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} />
              </div>
              <div>
                <Label>Default period</Label>
                <Select value={meta.default_period} onValueChange={(v) => setMeta((m) => ({ ...m, default_period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibility</Label>
                <Select value={meta.visibility} onValueChange={(v) => setMeta((m) => ({ ...m, visibility: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Only me</SelectItem>
                    <SelectItem value="tenant">Everyone in the workspace</SelectItem>
                    <SelectItem value="roles">Shared roles only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full text-destructive" onClick={() => removeDashboard.mutate()}>
                <Trash2 className="size-4" /> Delete dashboard
              </Button>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </AppShell>
  );
}
