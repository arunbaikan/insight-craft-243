import { createServerFn } from "@tanstack/react-start";

/** One published planning figure. */
export type PlanFactInput = {
  scenario_id: string;
  scenario_name: string;
  series: "plan" | "budget" | "actual";
  month_key: string;
  line_key: string;
  line_label: string;
  category: string;
  amount_base: number;
};

export const PLAN_DASHBOARD_SLUG = "financial-plan";

type MetricSeed = {
  key: string;
  name: string;
  description: string;
  metric_kind: "aggregate" | "formula";
  source_entity?: string | null;
  aggregation?: string | null;
  value_field?: string | null;
  filters?: unknown;
  formula?: unknown;
  value_type: "currency" | "percent" | "number";
  decimals?: number;
};

const f = (conds: { field: string; operator: string; value: unknown }[]) => ({ op: "and", conditions: conds });
const sum = (
  key: string,
  name: string,
  description: string,
  conds: { field: string; operator: string; value: unknown }[],
  extra: Partial<MetricSeed> = {},
): MetricSeed => ({
  key,
  name,
  description,
  metric_kind: "aggregate",
  source_entity: "plan_facts",
  aggregation: "sum",
  value_field: "amount_base",
  filters: f(conds),
  value_type: "currency",
  decimals: 0,
  ...extra,
});

const METRIC_SEEDS: MetricSeed[] = [
  sum("plan_revenue", "Plan revenue", "Forecast revenue from the planning workspace.", [
    { field: "series", operator: "=", value: "plan" },
    { field: "category", operator: "=", value: "Revenue" },
  ]),
  sum("plan_cogs", "Plan cost of sales", "Forecast cost of sales.", [
    { field: "series", operator: "=", value: "plan" },
    { field: "category", operator: "=", value: "Cost of sales" },
  ]),
  sum("plan_opex", "Plan operating expenses", "Forecast operating expenses including payroll.", [
    { field: "series", operator: "=", value: "plan" },
    { field: "category", operator: "=", value: "Operating expenses" },
  ]),
  sum("plan_ebitda", "Plan EBITDA", "Forecast EBITDA.", [
    { field: "series", operator: "=", value: "plan" },
    { field: "line_key", operator: "=", value: "ebitda" },
  ]),
  sum("plan_free_cash_flow", "Plan free cash flow", "Forecast free cash flow.", [
    { field: "series", operator: "=", value: "plan" },
    { field: "line_key", operator: "=", value: "free_cash_flow" },
  ]),
  sum("plan_cash_balance", "Plan average cash balance", "Average closing cash across the period.", [
    { field: "series", operator: "=", value: "plan" },
    { field: "line_key", operator: "=", value: "cash_balance" },
  ], { aggregation: "avg" }),
  sum("plan_headcount", "Plan headcount", "Average planned headcount.", [
    { field: "series", operator: "=", value: "plan" },
    { field: "line_key", operator: "=", value: "headcount" },
  ], { aggregation: "avg", value_type: "number" }),
  sum("budget_revenue", "Budget revenue", "Approved budget revenue.", [
    { field: "series", operator: "=", value: "budget" },
    { field: "category", operator: "=", value: "Revenue" },
  ]),
  sum("budget_opex", "Budget operating expenses", "Approved budget operating expenses.", [
    { field: "series", operator: "=", value: "budget" },
    { field: "category", operator: "=", value: "Operating expenses" },
  ]),
  sum("budget_ebitda", "Budget EBITDA", "Approved budget EBITDA.", [
    { field: "series", operator: "=", value: "budget" },
    { field: "line_key", operator: "=", value: "ebitda" },
  ]),
  sum("plan_actual_revenue", "Actual revenue (planning)", "Actual revenue as used in the planning workspace.", [
    { field: "series", operator: "=", value: "actual" },
    { field: "category", operator: "=", value: "Revenue" },
  ]),
  sum("plan_actual_ebitda", "Actual EBITDA (planning)", "Actual EBITDA as used in the planning workspace.", [
    { field: "series", operator: "=", value: "actual" },
    { field: "line_key", operator: "=", value: "ebitda" },
  ]),
  {
    key: "plan_gross_profit",
    name: "Plan gross profit",
    description: "Plan revenue less plan cost of sales.",
    metric_kind: "formula",
    value_type: "currency",
    decimals: 0,
    formula: {
      type: "binary",
      op: "-",
      left: { type: "metric", key: "plan_revenue" },
      right: { type: "metric", key: "plan_cogs" },
    },
  },
  {
    key: "plan_ebitda_margin",
    name: "Plan EBITDA margin",
    description: "Plan EBITDA as a share of plan revenue.",
    metric_kind: "formula",
    value_type: "percent",
    decimals: 1,
    formula: {
      type: "binary",
      op: "*",
      left: {
        type: "call",
        fn: "safe_divide",
        args: [{ type: "metric", key: "plan_ebitda" }, { type: "metric", key: "plan_revenue" }],
      },
      right: { type: "number", value: 100 },
    },
  },
  {
    key: "plan_revenue_vs_budget",
    name: "Plan vs budget revenue",
    description: "Forecast revenue less budget revenue.",
    metric_kind: "formula",
    value_type: "currency",
    decimals: 0,
    formula: {
      type: "binary",
      op: "-",
      left: { type: "metric", key: "plan_revenue" },
      right: { type: "metric", key: "budget_revenue" },
    },
  },
];

type WidgetSeed = {
  widget_type: string;
  title: string;
  subtitle?: string | null;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  series: { metric_key: string; label?: string; render_as?: "bar" | "line" }[];
  viz_config?: Record<string, unknown>;
};

const WIDGET_SEEDS: WidgetSeed[] = [
  { widget_type: "stat_card", title: "Plan revenue", grid_x: 0, grid_y: 0, grid_w: 3, grid_h: 4, series: [{ metric_key: "plan_revenue" }] },
  { widget_type: "stat_card", title: "Plan EBITDA", grid_x: 3, grid_y: 0, grid_w: 3, grid_h: 4, series: [{ metric_key: "plan_ebitda" }] },
  { widget_type: "stat_card", title: "Plan EBITDA margin", grid_x: 6, grid_y: 0, grid_w: 3, grid_h: 4, series: [{ metric_key: "plan_ebitda_margin" }] },
  { widget_type: "stat_card", title: "Average cash balance", grid_x: 9, grid_y: 0, grid_w: 3, grid_h: 4, series: [{ metric_key: "plan_cash_balance" }] },
  {
    widget_type: "line_chart",
    title: "Revenue: plan vs budget",
    subtitle: "Monthly, published from the planning workspace",
    grid_x: 0,
    grid_y: 4,
    grid_w: 7,
    grid_h: 8,
    series: [
      { metric_key: "plan_revenue", label: "Plan" },
      { metric_key: "budget_revenue", label: "Budget" },
      { metric_key: "plan_actual_revenue", label: "Actual" },
    ],
  },
  {
    widget_type: "bar_chart",
    title: "EBITDA: plan vs budget",
    grid_x: 7,
    grid_y: 4,
    grid_w: 5,
    grid_h: 8,
    series: [
      { metric_key: "plan_ebitda", label: "Plan" },
      { metric_key: "budget_ebitda", label: "Budget" },
    ],
  },
  {
    widget_type: "bar_chart",
    title: "Operating expenses",
    grid_x: 0,
    grid_y: 12,
    grid_w: 5,
    grid_h: 8,
    series: [
      { metric_key: "plan_opex", label: "Plan" },
      { metric_key: "budget_opex", label: "Budget" },
    ],
  },
  {
    widget_type: "data_table",
    title: "Plan summary",
    grid_x: 5,
    grid_y: 12,
    grid_w: 7,
    grid_h: 8,
    series: [
      { metric_key: "plan_revenue", label: "Revenue" },
      { metric_key: "plan_gross_profit", label: "Gross profit" },
      { metric_key: "plan_ebitda", label: "EBITDA" },
      { metric_key: "plan_free_cash_flow", label: "Free cash flow" },
    ],
  },
  {
    widget_type: "stat_card",
    title: "Plan vs budget revenue",
    grid_x: 0,
    grid_y: 20,
    grid_w: 4,
    grid_h: 4,
    series: [{ metric_key: "plan_revenue_vs_budget" }],
  },
  {
    widget_type: "stat_card",
    title: "Planned headcount",
    grid_x: 4,
    grid_y: 20,
    grid_w: 4,
    grid_h: 4,
    series: [{ metric_key: "plan_headcount" }],
  },
  {
    widget_type: "stat_card",
    title: "Plan free cash flow",
    grid_x: 8,
    grid_y: 20,
    grid_w: 4,
    grid_h: 4,
    series: [{ metric_key: "plan_free_cash_flow" }],
  },
];

/**
 * Publishes the browser-side planning workspace into the backend so the saved
 * figures behave exactly like ledger metrics in the viewer and every export.
 */
export const publishPlan = createServerFn({ method: "POST" })
  .inputValidator((input: { scenarioId: string; scenarioName: string; facts: PlanFactInput[] }) => input)
  .handler(async ({ data }) => {
    const { getServerSupabase } = await import("@/lib/supabase-data.server");
    const supabase = getServerSupabase();

    // 1. Replace the published facts for this scenario.
    await supabase.from("plan_facts").delete().eq("scenario_id", data.scenarioId);
    const rows = data.facts.map((x) => ({
      scenario_id: x.scenario_id,
      scenario_name: x.scenario_name,
      series: x.series,
      month_key: x.month_key,
      month_date: `${x.month_key}-01`,
      line_key: x.line_key,
      line_label: x.line_label,
      category: x.category,
      amount_base: Math.round(x.amount_base * 100) / 100,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("plan_facts").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }

    // 2. Upsert the metric definitions the plan dashboard binds to.
    const { data: existing } = await supabase
      .from("metric_definitions")
      .select("id, key")
      .in("key", METRIC_SEEDS.map((m) => m.key));
    const byKey = new Map(((existing ?? []) as { id: string; key: string }[]).map((r) => [r.key, r.id]));

    for (const m of METRIC_SEEDS) {
      const payload = {
        key: m.key,
        name: m.name,
        description: m.description,
        metric_kind: m.metric_kind,
        source_entity: m.source_entity ?? null,
        aggregation: m.aggregation ?? null,
        value_field: m.value_field ?? null,
        filters: m.filters ?? { op: "and", conditions: [] },
        formula: m.formula ?? null,
        time_grain: "month",
        comparison: "prior_period",
        sign_convention: "natural",
        value_type: m.value_type,
        decimals: m.decimals ?? 0,
        scale: 1,
        is_system: false,
        updated_at: new Date().toISOString(),
      };
      const id = byKey.get(m.key);
      const { error } = id
        ? await supabase.from("metric_definitions").update(payload).eq("id", id)
        : await supabase.from("metric_definitions").insert(payload);
      if (error) throw new Error(error.message);
    }

    // 3. Upsert the dashboard and rebuild its widgets.
    const { data: dash } = await supabase.from("dashboards").select("id").eq("slug", PLAN_DASHBOARD_SLUG).maybeSingle();
    let dashboardId = (dash as { id: string } | null)?.id;
    const dashPayload = {
      name: "Financial plan",
      slug: PLAN_DASHBOARD_SLUG,
      description: `Published from the planning workspace — scenario "${data.scenarioName}".`,
      default_period: "next_12m",
      layout_cols: 12,
      row_height_px: 40,
      visibility: "tenant",
      is_template: false,
      updated_at: new Date().toISOString(),
    };
    if (dashboardId) {
      const { error } = await supabase.from("dashboards").update(dashPayload).eq("id", dashboardId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabase.from("dashboards").insert(dashPayload).select("id").single();
      if (error) throw new Error(error.message);
      dashboardId = (created as { id: string }).id;
    }

    await supabase.from("widgets").delete().eq("dashboard_id", dashboardId);
    const { error: wErr } = await supabase.from("widgets").insert(
      WIDGET_SEEDS.map((w, i) => ({
        dashboard_id: dashboardId!,
        widget_type: w.widget_type,
        title: w.title,
        subtitle: w.subtitle ?? null,
        grid_x: w.grid_x,
        grid_y: w.grid_y,
        grid_w: w.grid_w,
        grid_h: w.grid_h,
        metric_binding: { series: w.series },
        viz_config: w.viz_config ?? {},
        sort_order: i,
      })),
    );
    if (wErr) throw new Error(wErr.message);

    return { slug: PLAN_DASHBOARD_SLUG, rows: rows.length, publishedAt: new Date().toISOString() };
  });
