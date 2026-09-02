export type FilterOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "in"
  | "not_in"
  | "contains"
  | "between"
  | "is_null"
  | "is_not_null";

export type FilterValue = string | number | boolean | null | Array<string | number | boolean>;

export type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value?: FilterValue | undefined;
};


export type FilterGroup = {
  op?: "and" | "or" | undefined;
  conditions?: Array<FilterCondition | FilterGroup> | undefined;
};

export type FormulaNode =
  | { type: "number"; value: number }
  | { type: "metric"; key: string }
  | { type: "binary"; op: "+" | "-" | "*" | "/"; left: FormulaNode; right: FormulaNode }
  | { type: "call"; fn: FormulaFn; args: FormulaNode[] };

export const FORMULA_FUNCTIONS = [
  "safe_divide",
  "percent_change",
  "abs",
  "min",
  "max",
  "coalesce",
  "round",
] as const;

export type FormulaFn = (typeof FORMULA_FUNCTIONS)[number];

export type MetricKind = "aggregate" | "balance" | "ratio" | "formula" | "ageing";
export type Aggregation = "sum" | "avg" | "count" | "count_distinct" | "min" | "max";
export type ValueType = "currency" | "percent" | "number" | "ratio" | "months" | "days";
export type Comparison = "none" | "prior_period" | "prior_year";

export type Thresholds = {
  good?: number | undefined;
  warn?: number | undefined;
  direction?: "higher_is_better" | "lower_is_better" | undefined;
};

export type MetricDefinition = {
  id?: string | undefined;
  key: string;
  name: string;
  description?: string | null | undefined;
  metric_kind: MetricKind;
  source_entity?: string | null | undefined;
  aggregation?: Aggregation | null | undefined;
  value_field?: string | null | undefined;
  filters: FilterGroup;
  group_by?: string | null | undefined;
  time_grain: "day" | "week" | "month" | "quarter" | "year";
  formula?: FormulaNode | null | undefined;
  comparison: Comparison;
  sign_convention: "natural" | "invert";
  value_type: ValueType;
  unit?: string | null | undefined;
  decimals: number;
  scale: number;
  target_value?: number | null | undefined;
  thresholds?: Thresholds | null | undefined;
  is_system: boolean;
  version: number;
};

export type PeriodKey =
  | "mtd"
  | "qtd"
  | "ytd"
  | "last_3m"
  | "last_6m"
  | "last_12m"
  | "last_24m";

export type ResolvedPeriod = {
  key: string;
  start: string;
  end: string;
  buckets: { key: string; label: string; start: string; end: string }[];
};

export type SeriesPoint = { label: string; value: number };

export type MetricResult = {
  key: string;
  name: string;
  value: number | null;
  previous: number | null;
  delta_pct: number | null;
  value_type: ValueType;
  unit?: string | null | undefined;
  decimals: number;
  target_value?: number | null | undefined;
  thresholds?: Thresholds | null | undefined;
  comparison: Comparison;
  series: SeriesPoint[];
  breakdown: SeriesPoint[];
};

export type MetricError = { key: string; error: string };

export type ValidationIssue = { path: string; message: string };
