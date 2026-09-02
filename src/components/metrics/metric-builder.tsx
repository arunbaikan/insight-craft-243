import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  previewMetric,
  saveMetric,
  validateMetric,
  type FormulaRefValue,
  type MetricCatalogue,
} from "@/lib/metrics.functions";
import { FormulaEditor } from "@/components/metrics/formula-editor";
import type {
  FilterCondition,
  FilterOperator,
  MetricDefinition,
  MetricKind,
  MetricResult,
  ValidationIssue,
} from "@/lib/metrics/types";
import { formulaToText, parseFormula } from "@/lib/metrics/formula-text";
import { PERIOD_OPTIONS } from "@/lib/metrics/period";
import { formatValue, keyify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const KINDS: { value: MetricKind; label: string; hint: string }[] = [
  { value: "aggregate", label: "Aggregate", hint: "Total, average or count over a period." },
  { value: "balance", label: "Balance", hint: "Closing position as at the period end." },
  { value: "ratio", label: "Ratio", hint: "One metric divided by another." },
  { value: "formula", label: "Formula", hint: "Free expression over other metrics." },
  { value: "ageing", label: "Ageing", hint: "Outstanding balances by age band." },
];

const OPERATORS: { value: FilterOperator; label: string; valueless?: boolean; list?: boolean }[] = [
  { value: "=", label: "is" },
  { value: "!=", label: "is not" },
  { value: ">", label: "greater than" },
  { value: ">=", label: "at least" },
  { value: "<", label: "less than" },
  { value: "<=", label: "at most" },
  { value: "in", label: "is any of", list: true },
  { value: "not_in", label: "is none of", list: true },
  { value: "contains", label: "contains" },
  { value: "is_null", label: "is empty", valueless: true },
  { value: "is_not_null", label: "is not empty", valueless: true },
];

export const EMPTY_METRIC: MetricDefinition = {
  key: "",
  name: "",
  description: "",
  metric_kind: "aggregate",
  source_entity: "journal_lines",
  aggregation: "sum",
  value_field: "amount_base",
  filters: { op: "and", conditions: [] },
  group_by: null,
  time_grain: "month",
  formula: null,
  comparison: "prior_period",
  sign_convention: "natural",
  value_type: "currency",
  unit: null,
  decimals: 0,
  scale: 1,
  target_value: null,
  thresholds: null,
  is_system: false,
  version: 1,
};

export function MetricBuilder({
  catalogue,
  initial,
  onSaved,
  onCancel,
}: {
  catalogue: MetricCatalogue;
  initial: MetricDefinition;
  onSaved: (m: MetricDefinition) => void;
  onCancel: () => void;
}) {
  const [def, setDef] = useState<MetricDefinition>(initial);
  const [formulaText, setFormulaText] = useState(formulaToText(initial.formula));
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [period, setPeriod] = useState("last_6m");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [preview, setPreview] = useState<MetricResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [refs, setRefs] = useState<FormulaRefValue[]>([]);

  useEffect(() => {
    setDef(initial);
    setFormulaText(formulaToText(initial.formula));
  }, [initial]);

  const entity = useMemo(
    () => catalogue.entities.find((e) => e.entity === def.source_entity),
    [catalogue.entities, def.source_entity],
  );
  const isExpression = def.metric_kind === "formula" || def.metric_kind === "ratio";
  const patch = (p: Partial<MetricDefinition>) => setDef((d) => ({ ...d, ...p }));

  const validate = useMutation({
    mutationFn: (d: MetricDefinition) => validateMetric({ data: { definition: d } }),
    onSuccess: (r) => setIssues(r.issues),
  });

  const runPreview = useMutation({
    mutationFn: (d: MetricDefinition) => previewMetric({ data: { definition: d, period } }),
    onSuccess: (r) => {
      setPreview(r.result ?? null);
      setPreviewError(r.error ?? null);
      setRefs(r.refs ?? []);
    },
    onError: (e: Error) => setPreviewError(e.message),
  });

  const save = useMutation({
    mutationFn: (d: MetricDefinition) => saveMetric({ data: { definition: d } }),
    onSuccess: (m) => {
      toast.success("Metric saved");
      onSaved(m);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Live validate + preview whenever the definition settles.
  useEffect(() => {
    const t = setTimeout(() => {
      validate.mutate(def);
      runPreview.mutate(def);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(def), period]);


  const conditions = (def.filters?.conditions ?? []) as FilterCondition[];
  const setConditions = (next: FilterCondition[]) =>
    patch({ filters: { op: def.filters?.op ?? "and", conditions: next } });

  const issueFor = (path: string) => issues.find((i) => i.path === path)?.message;
  const blocking = issues.length > 0 || !!formulaError;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-semibold">1. Identity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="m-name">Display name</Label>
              <Input
                id="m-name"
                value={def.name}
                placeholder="Salary as % of Revenue"
                onChange={(e) =>
                  setDef((d) => ({
                    ...d,
                    name: e.target.value,
                    key: d.id || d.key ? d.key : keyify(e.target.value),
                  }))
                }
              />
              {issueFor("name") ? <p className="mt-1 text-xs text-negative">{issueFor("name")}</p> : null}
            </div>
            <div>
              <Label htmlFor="m-key">Key</Label>
              <Input id="m-key" value={def.key} onChange={(e) => patch({ key: keyify(e.target.value) })} />
              {issueFor("key") ? <p className="mt-1 text-xs text-negative">{issueFor("key")}</p> : null}
            </div>
          </div>
          <div>
            <Label htmlFor="m-desc">Description</Label>
            <Textarea
              id="m-desc"
              rows={2}
              value={def.description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="What this number means, in plain language."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => patch({ metric_kind: k.value })}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  def.metric_kind === k.value ? "border-brand bg-brand-soft text-brand" : "border-border hover:bg-accent"
                }`}
              >
                <span className="block font-medium">{k.label}</span>
                <span className="block text-[11px] text-muted-foreground">{k.hint}</span>
              </button>
            ))}
          </div>
        </section>

        {isExpression ? (
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-sm font-semibold">2. Formula</h2>
            <p className="text-xs text-muted-foreground">
              Reference other metrics by key. Errors are flagged as you type and the preview on the right updates live.
            </p>
            <FormulaEditor
              value={formulaText}
              onChange={(text, node, error) => {
                setFormulaText(text);
                setFormulaError(error);
                if (!error) patch({ formula: node });
              }}
              metrics={catalogue.metrics}
              selfKey={def.key}
              refValues={refs}
              serverIssues={issues.filter((i) => i.path === "formula").map((i) => i.message)}
            />
          </section>
        ) : (
          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-sm font-semibold">2. Source and calculation</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Data source</Label>
                <Select value={def.source_entity ?? ""} onValueChange={(v) => patch({ source_entity: v, value_field: null, group_by: null })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {catalogue.entities.map((e) => (
                      <SelectItem key={e.entity} value={e.entity}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aggregation</Label>
                <Select value={def.aggregation ?? "sum"} onValueChange={(v) => patch({ aggregation: v as NonNullable<MetricDefinition["aggregation"]> })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["sum", "avg", "count", "count_distinct", "min", "max"].map((a) => (
                      <SelectItem key={a} value={a}>{a.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Field</Label>
                <Select value={def.value_field ?? ""} onValueChange={(v) => patch({ value_field: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {(entity?.fields ?? []).filter((f) => f.measure || def.aggregation !== "sum").map((f) => (
                      <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {issueFor("value_field") ? <p className="mt-1 text-xs text-negative">{issueFor("value_field")}</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Filters</Label>
                <div className="flex items-center gap-2">
                  <Select value={def.filters?.op ?? "and"} onValueChange={(v) => patch({ filters: { op: v as "and" | "or", conditions } })}>
                    <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="and">Match all</SelectItem>
                      <SelectItem value="or">Match any</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConditions([...conditions, { field: entity?.fields[0]?.name ?? "", operator: "=", value: "" }])}
                  >
                    <Plus className="size-3.5" /> Condition
                  </Button>
                </div>
              </div>
              {conditions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No filters — every row in the source counts.</p>
              ) : null}
              {conditions.map((c, idx) => {
                const op = OPERATORS.find((o) => o.value === c.operator);
                const field = entity?.fields.find((f) => f.name === c.field);
                return (
                  <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                    <Select
                      value={c.field}
                      onValueChange={(v) => setConditions(conditions.map((x, i) => (i === idx ? { ...x, field: v } : x)))}
                    >
                      <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>
                        {(entity?.fields ?? []).map((f) => (
                          <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={c.operator}
                      onValueChange={(v) => setConditions(conditions.map((x, i) => (i === idx ? { ...x, operator: v as FilterOperator } : x)))}
                    >
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {op?.valueless ? null : field?.values?.length && !op?.list ? (
                      <Select
                        value={String(c.value ?? "")}
                        onValueChange={(v) => setConditions(conditions.map((x, i) => (i === idx ? { ...x, value: v } : x)))}
                      >
                        <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Value" /></SelectTrigger>
                        <SelectContent>
                          {field.values.map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 w-52"
                        placeholder={op?.list ? "comma, separated, values" : "value"}
                        value={Array.isArray(c.value) ? c.value.join(", ") : String(c.value ?? "")}
                        onChange={(e) =>
                          setConditions(
                            conditions.map((x, i) =>
                              i === idx
                                ? { ...x, value: op?.list ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    )}
                    <button
                      type="button"
                      className="ml-auto rounded p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                      aria-label="Remove condition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Break down by</Label>
                <Select value={def.group_by ?? "__none"} onValueChange={(v) => patch({ group_by: v === "__none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No breakdown</SelectItem>
                    {(entity?.fields ?? []).filter((f) => f.dimension).map((f) => (
                      <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sign</Label>
                <Select value={def.sign_convention} onValueChange={(v) => patch({ sign_convention: v as "natural" | "invert" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="invert">Invert (show as positive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-semibold">3. Presentation and targets</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Format</Label>
              <Select value={def.value_type} onValueChange={(v) => patch({ value_type: v as MetricDefinition["value_type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["currency", "percent", "number", "ratio", "months", "days"].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Decimals</Label>
              <Input type="number" min={0} max={4} value={def.decimals} onChange={(e) => patch({ decimals: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Compare with</Label>
              <Select value={def.comparison} onValueChange={(v) => patch({ comparison: v as MetricDefinition["comparison"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No comparison</SelectItem>
                  <SelectItem value="prior_period">Prior period</SelectItem>
                  <SelectItem value="prior_year">Prior year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target</Label>
              <Input
                type="number"
                value={def.target_value ?? ""}
                onChange={(e) => patch({ target_value: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Good at or beyond</Label>
              <Input
                type="number"
                value={def.thresholds?.good ?? ""}
                onChange={(e) =>
                  patch({ thresholds: { ...def.thresholds, good: e.target.value === "" ? undefined : Number(e.target.value) } })
                }
              />
            </div>
            <div>
              <Label>Warn at</Label>
              <Input
                type="number"
                value={def.thresholds?.warn ?? ""}
                onChange={(e) =>
                  patch({ thresholds: { ...def.thresholds, warn: e.target.value === "" ? undefined : Number(e.target.value) } })
                }
              />
            </div>
            <div>
              <Label>Direction</Label>
              <Select
                value={def.thresholds?.direction ?? "higher_is_better"}
                onValueChange={(v) => patch({ thresholds: { ...def.thresholds, direction: v as "higher_is_better" | "lower_is_better" } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher_is_better">Higher is better</SelectItem>
                  <SelectItem value="lower_is_better">Lower is better</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      </div>

      {/* live preview rail */}
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold">
              <Sparkles className="size-4 text-accent-cyan" /> Live preview
            </h2>
            {runPreview.isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <div className="mt-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewError ? (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-negative">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {previewError}
            </p>
          ) : preview ? (
            <div className="mt-3 space-y-3">
              <div>
                <div className="font-display text-3xl font-semibold tabular text-brand">
                  {formatValue(preview.value, preview.value_type, preview.decimals, preview.unit)}
                </div>
                {preview.delta_pct !== null ? (
                  <div className={`text-xs ${preview.delta_pct >= 0 ? "text-positive" : "text-negative"}`}>
                    {preview.delta_pct >= 0 ? "+" : ""}
                    {preview.delta_pct.toFixed(1)}% vs {preview.comparison === "prior_year" ? "last year" : "prior period"}
                  </div>
                ) : null}
              </div>
              <ul className="max-h-56 space-y-1 overflow-auto text-xs">
                {preview.series.map((p) => (
                  <li key={p.label} className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="tabular">{formatValue(p.value, preview.value_type, preview.decimals, preview.unit, true)}</span>
                  </li>
                ))}
              </ul>
              {preview.breakdown.length ? (
                <div>
                  <p className="text-xs font-medium">Breakdown</p>
                  <ul className="mt-1 max-h-40 space-y-1 overflow-auto text-xs">
                    {preview.breakdown.slice(0, 10).map((b) => (
                      <li key={b.label} className="flex justify-between">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="tabular">{formatValue(b.value, preview.value_type, preview.decimals, preview.unit, true)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Fill in the definition to see a value.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checks</h3>
          {issues.length === 0 && !formulaError ? (
            <p className="mt-2 text-xs text-positive">All checks pass.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-negative">
              {formulaError ? <li>{formulaError}</li> : null}
              {issues.map((i) => (
                <li key={i.path + i.message}>
                  <Badge variant="outline" className="mr-1 text-[10px]">{i.path}</Badge>
                  {i.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" disabled={blocking || save.isPending} onClick={() => save.mutate(def)}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Save metric
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </aside>
    </div>
  );
}
