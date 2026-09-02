import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as Icons from "lucide-react";
import type React from "react";
import type { WidgetPayload, WidgetRecord } from "@/lib/dashboards.functions";
import type { MetricResult } from "@/lib/metrics/types";
import { CHART_COLORS, formatDelta, formatValue, seriesColor, STATE_TEXT, thresholdState } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WidgetFrame } from "./widget-frame";

export type WidgetProps = {
  widget: WidgetRecord;
  payload: WidgetPayload | undefined;
};

export type WidgetKind =
  | "stat_card"
  | "stat_card_sparkline"
  | "gauge_donut"
  | "progress_donut"
  | "bar_chart"
  | "stacked_bar_chart"
  | "hbar_chart"
  | "line_chart"
  | "ratio_card"
  | "kpi_group"
  | "data_table"
  | "text_block";

export const WIDGET_CATALOGUE: {
  type: WidgetKind;
  label: string;
  description: string;
  icon: keyof typeof Icons;
  minSeries: number;
  maxSeries: number;
  defaultSize: { w: number; h: number };
  needsBreakdown?: boolean;
}[] = [
  { type: "stat_card", label: "Stat card", description: "One number with a comparison.", icon: "Square", minSeries: 1, maxSeries: 1, defaultSize: { w: 3, h: 4 } },
  { type: "stat_card_sparkline", label: "Stat + sparkline", description: "Number with a trend strip.", icon: "TrendingUp", minSeries: 1, maxSeries: 2, defaultSize: { w: 4, h: 6 } },
  { type: "gauge_donut", label: "Gauge donut", description: "Value against a target, or a share breakdown.", icon: "Gauge", minSeries: 1, maxSeries: 1, defaultSize: { w: 4, h: 7 } },
  { type: "progress_donut", label: "Progress donut", description: "Actual against budget.", icon: "CircleDot", minSeries: 1, maxSeries: 2, defaultSize: { w: 3, h: 7 } },
  { type: "bar_chart", label: "Bar chart", description: "Grouped bars over time.", icon: "BarChart3", minSeries: 1, maxSeries: 5, defaultSize: { w: 8, h: 8 } },
  { type: "stacked_bar_chart", label: "Stacked bars", description: "Composition over time.", icon: "BarChart4", minSeries: 2, maxSeries: 6, defaultSize: { w: 8, h: 8 } },
  { type: "hbar_chart", label: "Horizontal bars", description: "Ranked breakdown by dimension.", icon: "AlignLeft", minSeries: 1, maxSeries: 1, defaultSize: { w: 4, h: 8 }, needsBreakdown: true },
  { type: "line_chart", label: "Line chart", description: "Trend lines over time.", icon: "LineChart", minSeries: 1, maxSeries: 5, defaultSize: { w: 6, h: 7 } },
  { type: "ratio_card", label: "Ratio card", description: "Two values compared side by side.", icon: "Scale", minSeries: 1, maxSeries: 2, defaultSize: { w: 3, h: 5 } },
  { type: "kpi_group", label: "KPI group", description: "A stack of related figures.", icon: "ListChecks", minSeries: 2, maxSeries: 6, defaultSize: { w: 4, h: 6 } },
  { type: "data_table", label: "Data table", description: "Metric values by period.", icon: "Table", minSeries: 1, maxSeries: 4, defaultSize: { w: 6, h: 7 } },
  { type: "text_block", label: "Text block", description: "Narrative or commentary.", icon: "Type", minSeries: 0, maxSeries: 0, defaultSize: { w: 4, h: 4 } },
];

function DynIcon({ name, className }: { name?: string | undefined; className?: string | undefined }) {
  if (!name) return null;
  const pascal = name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascal];
  if (!Cmp) return null;
  const props = className === undefined ? {} : { className };
  return <Cmp {...props} />;
}

function firstResult(payload: WidgetPayload | undefined): MetricResult | null {
  return payload?.series?.[0] ?? null;
}

function chartData(payload: WidgetPayload | undefined) {
  const results = (payload?.series ?? []).filter(Boolean) as MetricResult[];
  const labels = results[0]?.series.map((p) => p.label) ?? [];
  return labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    results.forEach((r, ri) => {
      row[`s${ri}`] = r.series[i]?.value ?? 0;
    });
    return row;
  });
}

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({ results }: { results: MetricResult[] }) {
  return (
    <Tooltip
      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
      contentStyle={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontSize: 12,
      }}
      formatter={(value: number, name: string) => {
        const idx = Number(String(name).replace("s", ""));
        const r = results[idx];
        return [formatValue(value, r?.value_type ?? "number", r?.decimals ?? 0, r?.unit, true), r?.name ?? name];
      }}
    />
  );
}

function Delta({ result }: { result: MetricResult | null }) {
  const delta = formatDelta(result?.delta_pct);
  if (!delta || !result) return null;
  const positive = (result.delta_pct ?? 0) >= 0;
  return (
    <span className={cn("text-xs font-medium tabular", positive ? "text-positive" : "text-negative")}>{delta}</span>
  );
}

/* ---------------- renderers ---------------- */

function StatCard({ widget, payload }: WidgetProps) {
  const r = firstResult(payload);
  const cfg = widget.viz_config ?? {};
  return (
    <WidgetFrame>
      <div className="flex h-full flex-col justify-center gap-1 px-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {widget.title}
          </span>
          <DynIcon name={cfg["icon"] as string | undefined} className="size-4 text-brand" />
        </div>
        <span className="font-display text-2xl font-semibold tabular text-brand">{formatValue(r?.value ?? null, r?.value_type ?? "number", r?.decimals ?? 0, r?.unit)}</span>
        <div className="flex items-center gap-2">
          <Delta result={r} />
          {widget.subtitle ? <span className="truncate text-[11px] text-muted-foreground">{widget.subtitle}</span> : null}
        </div>
      </div>
    </WidgetFrame>
  );
}

function StatCardSparkline({ widget, payload }: WidgetProps) {
  const r = firstResult(payload);
  const data = chartData(payload);
  const results = (payload?.series ?? []).filter(Boolean) as MetricResult[];
  const type = (widget.viz_config?.["spark_type"] as string) ?? "bar";
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <div className="flex h-full flex-col">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tabular text-brand">
            {formatValue(r?.value ?? null, r?.value_type ?? "number", r?.decimals ?? 0, r?.unit, true)}
          </span>
          <Delta result={r} />
        </div>
        <div className="mt-2 min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatValue(v, r?.value_type ?? "number", 0, null, true)} />
                <ChartTooltip results={results} />
                {results.map((res, i) => (
                  <Line key={res.key} type="monotone" dataKey={`s${i}`} stroke={seriesColor(undefined, i)} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatValue(v, r?.value_type ?? "number", 0, null, true)} />
                <ChartTooltip results={results} />
                {results.map((res, i) => (
                  <Bar key={res.key} dataKey={`s${i}`} fill={seriesColor(undefined, i)} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </WidgetFrame>
  );
}

function GaugeDonut({ widget, payload }: WidgetProps) {
  const r = firstResult(payload);
  const mode = (widget.viz_config?.["donut_mode"] as string) ?? "target";
  const breakdown = r?.breakdown ?? [];

  if (mode === "breakdown" && breakdown.length) {
    const total = breakdown.reduce((a, b) => a + b.value, 0);
    return (
      <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
        <div className="flex h-full items-center gap-3">
          <div className="h-full min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdown} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={1}>
                  {breakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number, n: string) => [`${v.toLocaleString()} (${total ? Math.round((v / total) * 100) : 0}%)`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-28 shrink-0 space-y-1 text-xs">
            {breakdown.slice(0, 6).map((b, i) => (
              <li key={b.label} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="truncate text-muted-foreground">{b.label}</span>
                <span className="ml-auto tabular font-medium">{total ? Math.round((b.value / total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      </WidgetFrame>
    );
  }

  const value = r?.value ?? 0;
  const target = r?.target_value ?? 100;
  const pct = Math.max(0, Math.min(100, target ? (value / target) * 100 : 0));
  const state = thresholdState(r?.value ?? null, r?.thresholds);
  const data = [
    { name: "value", value: pct },
    { name: "rest", value: 100 - pct },
  ];
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <div className="relative h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="70%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none">
              <Cell fill="var(--accent-cyan)" />
              <Cell fill="var(--brand-strong)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-muted-foreground">{(widget.viz_config?.["center_label"] as string) ?? r?.name}</span>
          <span className={cn("font-display text-2xl font-semibold tabular", STATE_TEXT[state])}>
            {formatValue(r?.value ?? null, r?.value_type ?? "number", r?.decimals ?? 1, r?.unit)}
          </span>
          {r?.target_value != null ? (
            <span className="text-[10px] text-muted-foreground">
              Target {formatValue(r.target_value, r.value_type, r.decimals, r.unit)}
            </span>
          ) : null}
        </div>
      </div>
    </WidgetFrame>
  );
}

function ProgressDonut({ widget, payload }: WidgetProps) {
  const actual = payload?.series?.[0] ?? null;
  const budget = payload?.series?.[1] ?? null;
  const override = widget.viz_config?.["target_override"] as number | undefined;
  const target = budget?.value ?? override ?? actual?.target_value ?? 100;
  const value = actual?.value ?? 0;
  const pct = target ? Math.round((value / target) * 100) : 0;
  const data = [
    { name: "done", value: Math.max(0, Math.min(100, pct)) },
    { name: "rest", value: Math.max(0, 100 - Math.max(0, Math.min(100, pct))) },
  ];
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="none">
                <Cell fill="var(--accent-cyan)" />
                <Cell fill="var(--brand-strong)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl font-semibold tabular">{pct}%</span>
          </div>
        </div>
        {budget ? (
          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Budget</dt>
              <dd className="tabular font-medium">{formatValue(target, budget.value_type, budget.decimals, budget.unit)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Balance</dt>
              <dd className="tabular font-medium">{formatValue(target - value, budget.value_type, budget.decimals, budget.unit)}</dd>
            </div>
          </dl>
        ) : widget.viz_config?.["footer"] ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">{String(widget.viz_config["footer"])}</p>
        ) : null}
      </div>
    </WidgetFrame>
  );
}

function TimeChart({ widget, payload, stacked }: WidgetProps & { stacked?: boolean }) {
  const results = (payload?.series ?? []).filter(Boolean) as MetricResult[];
  const bindings = widget.metric_binding?.series ?? [];
  const data = chartData(payload);
  const showLegend = widget.viz_config?.["legend"] !== false;
  const hasRightAxis = bindings.some((b) => b.axis === "right");
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--grid-line)" />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={52} tickFormatter={(v: number) => formatValue(v, results[0]?.value_type ?? "number", 0, null, true)} />
          {hasRightAxis ? <YAxis yAxisId="right" orientation="right" {...axisProps} width={44} /> : null}
          <ChartTooltip results={results} />
          {showLegend ? (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
              formatter={(v: string) => results[Number(String(v).replace("s", ""))]?.name ?? v}
            />
          ) : null}
          {results.map((res, i) => {
            const b = bindings[i];
            const color = seriesColor(b?.color, i);
            if (b?.render_as === "line")
              return (
                <Line
                  key={res.key + i}
                  type="monotone"
                  dataKey={`s${i}`}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  {...(b.axis === "right" ? { yAxisId: "right" } : {})}
                />
              );
            return (
              <Bar
                key={res.key + i}
                dataKey={`s${i}`}
                fill={color}
                radius={[3, 3, 0, 0]}
                {...(stacked ? { stackId: "a" } : {})}
                {...(b?.axis === "right" ? { yAxisId: "right" } : {})}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </WidgetFrame>
  );
}

function HBarChart({ widget, payload }: WidgetProps) {
  const r = firstResult(payload);
  const limit = Number(widget.viz_config?.["limit"] ?? 8);
  const data = (r?.breakdown ?? []).slice(0, limit).map((b) => ({ label: b.label, value: b.value })).reverse();
  const color = seriesColor(widget.metric_binding?.series?.[0]?.color, 0);
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      {data.length === 0 ? (
        <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
          This metric has no breakdown dimension.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
            <XAxis type="number" {...axisProps} tickFormatter={(v: number) => formatValue(v, r?.value_type ?? "number", 0, null, true)} />
            <YAxis type="category" dataKey="label" {...axisProps} width={96} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
              formatter={(v: number) => formatValue(v, r?.value_type ?? "number", r?.decimals ?? 0, r?.unit)}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetFrame>
  );
}

function LineTrend({ widget, payload }: WidgetProps) {
  const results = (payload?.series ?? []).filter(Boolean) as MetricResult[];
  const bindings = widget.metric_binding?.series ?? [];
  const data = chartData(payload);
  const smooth = widget.viz_config?.["smooth"] !== false;
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--grid-line)" />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={52} tickFormatter={(v: number) => formatValue(v, results[0]?.value_type ?? "number", 0, null, true)} />
          <ChartTooltip results={results} />
          {widget.viz_config?.["legend"] !== false ? (
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => results[Number(String(v).replace("s", ""))]?.name ?? v} />
          ) : null}
          {results.map((res, i) => (
            <Line
              key={res.key + i}
              type={smooth ? "monotone" : "linear"}
              dataKey={`s${i}`}
              stroke={seriesColor(bindings[i]?.color, i)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </WidgetFrame>
  );
}

function RatioCard({ widget, payload }: WidgetProps) {
  const results = (payload?.series ?? []).filter(Boolean) as MetricResult[];
  const a = results[0];
  const b = results[1];
  if (!b) {
    const state = thresholdState(a?.value ?? null, a?.thresholds);
    return (
      <WidgetFrame>
        <div className="flex h-full flex-col justify-center gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{widget.title}</span>
          <span className={cn("font-display text-2xl font-semibold tabular", STATE_TEXT[state])}>
            {formatValue(a?.value ?? null, a?.value_type ?? "ratio", a?.decimals ?? 2, a?.unit)}
          </span>
          {widget.viz_config?.["caption"] ? (
            <span className="text-xs text-muted-foreground">{String(widget.viz_config["caption"])}</span>
          ) : null}
          {widget.subtitle ? <span className="text-[11px] font-medium text-brand">{widget.subtitle}</span> : null}
        </div>
      </WidgetFrame>
    );
  }
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <div className="flex h-full flex-col justify-center gap-2">
        {[a, b].map((res, i) =>
          res ? (
            <div key={res.key + i} className="rounded-lg bg-muted/60 px-3 py-2 text-center">
              <div className="font-display text-xl font-semibold tabular text-brand">
                {formatValue(res.value, res.value_type, res.decimals, res.unit, true)}
              </div>
              <div className="text-[11px] text-muted-foreground">{res.name}</div>
            </div>
          ) : null,
        )}
      </div>
    </WidgetFrame>
  );
}

function KpiGroup({ widget, payload }: WidgetProps) {
  const results = (payload?.series ?? []).filter(Boolean) as MetricResult[];
  const headlineIndex = Number(widget.viz_config?.["headline_index"] ?? -1);
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <ul className="flex h-full flex-col justify-center gap-2">
        {results.map((r, i) => (
          <li
            key={r.key + i}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2",
              i === headlineIndex ? "bg-brand text-primary-foreground" : "bg-muted/60",
            )}
          >
            <span className={cn("truncate text-xs", i === headlineIndex ? "opacity-80" : "text-muted-foreground")}>
              {r.name}
            </span>
            <span className={cn("font-display text-base font-semibold tabular", i === headlineIndex ? "" : "text-brand")}>
              {formatValue(r.value, r.value_type, r.decimals, r.unit, true)}
            </span>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}

function DataTable({ widget, payload }: WidgetProps) {
  const results = (payload?.series ?? []).filter(Boolean) as MetricResult[];
  const labels = results[0]?.series.map((p) => p.label) ?? [];
  return (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle}>
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card text-left text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-2 font-medium">Period</th>
              {results.map((r, i) => (
                <th key={r.key + i} className="py-1.5 pl-2 text-right font-medium">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={label + i} className="border-t border-border">
                <td className="py-1.5 pr-2">{label}</td>
                {results.map((r, ri) => (
                  <td key={r.key + ri} className="py-1.5 pl-2 text-right tabular">
                    {formatValue(r.series[i]?.value ?? 0, r.value_type, r.decimals, r.unit, true)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetFrame>
  );
}

function TextBlock({ widget }: WidgetProps) {
  const accent = widget.viz_config?.["variant"] === "accent";
  return (
    <WidgetFrame className={accent ? "border-transparent bg-brand text-primary-foreground" : undefined}>
      <div className="flex h-full flex-col justify-center gap-2 px-1">
        {widget.title ? <h3 className="font-display text-lg font-semibold">{widget.title}</h3> : null}
        <p className={cn("text-sm", accent ? "opacity-85" : "text-muted-foreground")}>
          {String(widget.viz_config?.["text"] ?? "")}
        </p>
      </div>
    </WidgetFrame>
  );
}

export const WIDGET_RENDERERS: Record<WidgetKind, (props: WidgetProps) => React.ReactElement> = {
  stat_card: StatCard,
  stat_card_sparkline: StatCardSparkline,
  gauge_donut: GaugeDonut,
  progress_donut: ProgressDonut,
  bar_chart: (p) => <TimeChart {...p} />,
  stacked_bar_chart: (p) => <TimeChart {...p} stacked />,
  hbar_chart: HBarChart,
  line_chart: LineTrend,
  ratio_card: RatioCard,
  kpi_group: KpiGroup,
  data_table: DataTable,
  text_block: TextBlock,
};

export function renderWidget(widget: WidgetRecord, payload: WidgetPayload | undefined) {
  const Renderer = WIDGET_RENDERERS[widget.widget_type as WidgetKind];
  if (!Renderer)
    return (
      <WidgetFrame title={widget.title}>
        <p className="text-xs text-muted-foreground">Unknown widget type “{widget.widget_type}”.</p>
      </WidgetFrame>
    );
  return <Renderer widget={widget} payload={payload} />;
}
