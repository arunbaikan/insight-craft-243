import { createServerFn } from "@tanstack/react-start";
import type { MetricResult } from "@/lib/metrics/types";

export type WidgetSeriesBinding = {
  metric_key: string;
  label?: string;
  color?: string;
  render_as?: "bar" | "line";
  axis?: "left" | "right";
};

export type WidgetRecord = {
  id: string;
  dashboard_id: string;
  widget_type: string;
  title: string | null;
  subtitle: string | null;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  metric_binding: { series: WidgetSeriesBinding[] };
  viz_config: Record<string, string | number | boolean | string[]>;
  sort_order: number;
};

export type DashboardFilterRecord = {
  id: string;
  dashboard_id: string;
  key: string;
  label: string;
  filter_type: string;
  source_field: string | null;
  options: { value: string; label: string }[];
  default_value: string | null;
  sort_order: number;
};

export type DashboardRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_template: boolean;
  layout_cols: number;
  row_height_px: number;
  default_period: string;
  visibility: string;
  created_by: string;
  updated_at: string;
};

export type DashboardBundle = {
  dashboard: DashboardRecord;
  filters: DashboardFilterRecord[];
  widgets: WidgetRecord[];
  shares: { id: string; role_id: string | null; permission: string; role_name: string | null }[];
};

export type WidgetPayload = {
  widget_id: string;
  status: "ok" | "error";
  error?: string;
  series: (MetricResult | null)[];
};

export const listDashboards = createServerFn({ method: "GET" }).handler(async () => {
  const { getServerSupabase } = await import("@/lib/supabase-data.server");
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("dashboards")
    .select("id, name, slug, description, is_template, default_period, visibility, updated_at")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as (Pick<
    DashboardRecord,
    "id" | "name" | "slug" | "description" | "is_template" | "default_period" | "visibility" | "updated_at"
  >)[];
});

export const getDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<DashboardBundle | null> => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const { data: dash, error } = await supabase.from("dashboards").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!dash) return null;
    const id = (dash as { id: string }).id;
    const [filters, widgets, shares] = await Promise.all([
      supabase.from("dashboard_filters").select("*").eq("dashboard_id", id).order("sort_order"),
      supabase.from("widgets").select("*").eq("dashboard_id", id).order("sort_order"),
      supabase.from("dashboard_shares").select("id, role_id, permission, roles(name)").eq("dashboard_id", id),
    ]);
    return {
      dashboard: dash as unknown as DashboardRecord,
      filters: (filters.data ?? []) as unknown as DashboardFilterRecord[],
      widgets: (widgets.data ?? []) as unknown as WidgetRecord[],
      shares: ((shares.data ?? []) as unknown as { id: string; role_id: string | null; permission: string; roles: { name: string } | null }[]).map(
        (s) => ({ id: s.id, role_id: s.role_id, permission: s.permission, role_name: s.roles?.name ?? null }),
      ),
    };
  });

/** ONE batch call resolving every widget; each widget is isolated. */
export const getDashboardData = createServerFn({ method: "POST" })
  .inputValidator((input: { dashboardId: string; period: string; filters?: Record<string, string> }) => input)
  .handler(async ({ data }): Promise<{ period: string; widgets: WidgetPayload[] }> => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const { MetricEngine, loadDefinitions } = await import("@/lib/metrics/engine.server");
    const { resolvePeriod } = await import("@/lib/metrics/period");
    const supabase = getServerSupabase();

    const { data: widgets, error } = await supabase
      .from("widgets")
      .select("id, metric_binding")
      .eq("dashboard_id", data.dashboardId)
      .order("sort_order");
    if (error) throw new Error(error.message);

    const defs = await loadDefinitions();
    const engine = new MetricEngine(defs, resolvePeriod(data.period), data.filters ?? {});

    const payloads: WidgetPayload[] = [];
    for (const w of (widgets ?? []) as unknown as { id: string; metric_binding: { series?: WidgetSeriesBinding[] } }[]) {
      const bindings = w.metric_binding?.series ?? [];
      const series: (MetricResult | null)[] = [];
      let status: "ok" | "error" = "ok";
      let firstError: string | undefined;
      for (const b of bindings) {
        try {
          const res = await engine.result(b.metric_key);
          series.push({ ...res, name: b.label ?? res.name });
        } catch (e) {
          status = "error";
          firstError = firstError ?? (e instanceof Error ? e.message : "Metric failed to resolve.");
          series.push(null);
        }
      }
      payloads.push(firstError ? { widget_id: w.id, status, error: firstError, series } : { widget_id: w.id, status, series });
    }
    return { period: data.period, widgets: payloads };
  });

export const saveDashboard = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      dashboard: Partial<DashboardRecord> & { id?: string; name: string; slug: string };
      widgets?: Omit<WidgetRecord, "dashboard_id">[];
    }) => input,
  )
  .handler(async ({ data }) => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const d = data.dashboard;
    let id = d.id;

    const payload = {
      name: d.name,
      slug: d.slug,
      description: d.description ?? null,
      layout_cols: d.layout_cols ?? 12,
      row_height_px: d.row_height_px ?? 40,
      default_period: d.default_period ?? "last_6m",
      visibility: d.visibility ?? "tenant",
      is_template: d.is_template ?? false,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabase.from("dashboards").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabase.from("dashboards").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      id = (created as { id: string }).id;
    }

    if (data.widgets) {
      await supabase.from("widgets").delete().eq("dashboard_id", id);
      if (data.widgets.length) {
        const rows = data.widgets.map((w, i) => ({
          dashboard_id: id!,
          widget_type: w.widget_type,
          title: w.title,
          subtitle: w.subtitle,
          grid_x: w.grid_x,
          grid_y: w.grid_y,
          grid_w: w.grid_w,
          grid_h: w.grid_h,
          metric_binding: w.metric_binding,
          viz_config: w.viz_config,
          sort_order: i,
        }));
        const { error } = await supabase.from("widgets").insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    return { id: id! };
  });

export const duplicateDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string; name: string }) => input)
  .handler(async ({ data }) => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    const { data: src } = await supabase.from("dashboards").select("*").eq("slug", data.slug).single();
    if (!src) throw new Error("Dashboard not found.");
    const s = src as unknown as DashboardRecord;
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36).slice(-4)}`;
    const { data: created, error } = await supabase
      .from("dashboards")
      .insert({
        name: data.name,
        slug,
        description: s.description,
        layout_cols: s.layout_cols,
        row_height_px: s.row_height_px,
        default_period: s.default_period,
        visibility: "private",
        is_template: false,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    const newId = (created as { id: string; slug: string }).id;

    const [{ data: widgets }, { data: filters }] = await Promise.all([
      supabase.from("widgets").select("*").eq("dashboard_id", s.id),
      supabase.from("dashboard_filters").select("*").eq("dashboard_id", s.id),
    ]);
    if (widgets?.length)
      await supabase.from("widgets").insert(
        (widgets as unknown as WidgetRecord[]).map(({ id: _id, dashboard_id: _d, ...w }) => ({ ...w, dashboard_id: newId })),
      );
    if (filters?.length)
      await supabase.from("dashboard_filters").insert(
        (filters as unknown as DashboardFilterRecord[]).map(({ id: _id, dashboard_id: _d, ...f }) => ({ ...f, dashboard_id: newId })),
      );
    return created as unknown as { id: string; slug: string };
  });

export const deleteDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    await supabase.from("widgets").delete().eq("dashboard_id", data.id);
    await supabase.from("dashboard_filters").delete().eq("dashboard_id", data.id);
    await supabase.from("dashboard_shares").delete().eq("dashboard_id", data.id);
    const { error } = await supabase.from("dashboards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRoles = createServerFn({ method: "GET" }).handler(async () => {
  const { getServerSupabase } = await import("@/lib/supabase-data.server");
  const supabase = getServerSupabase();
  const { data } = await supabase.from("roles").select("id, name, permissions").order("name");
  return (data ?? []) as unknown as { id: string; name: string; permissions: string[] }[];
});

export const setDashboardShares = createServerFn({ method: "POST" })
  .inputValidator((input: { dashboardId: string; shares: { role_id: string; permission: string }[] }) => input)
  .handler(async ({ data }) => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();
    await supabase.from("dashboard_shares").delete().eq("dashboard_id", data.dashboardId);
    if (data.shares.length) {
      const { error } = await supabase
        .from("dashboard_shares")
        .insert(data.shares.map((s) => ({ dashboard_id: data.dashboardId, role_id: s.role_id, permission: s.permission })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
