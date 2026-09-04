/**
 * Advanced FP&A analytics: sensitivity, simulation, goal seek, a linked
 * three-statement model, SaaS unit economics and automated variance
 * commentary. Everything is pure and runs in the browser.
 */
import {
  ACTUALS,
  BASE_ASSUMPTIONS,
  OPEX_CATEGORIES,
  actualTotals,
  computePlan,
  summarise,
  type Assumptions,
  type HeadcountRow,
  type PlanRow,
  type Scenario,
  type VarianceRow,
} from "./engine";

/* ------------------------------------------------------------------ *
 * Sensitivity — one-at-a-time tornado
 * ------------------------------------------------------------------ */

export const SENSITIVITY_DRIVERS: { key: keyof Assumptions; label: string; swingPct: number }[] = [
  { key: "revenueGrowthPct", label: "Revenue growth", swingPct: 25 },
  { key: "churnPct", label: "Revenue churn", swingPct: 30 },
  { key: "cogsPct", label: "Cost of sales %", swingPct: 10 },
  { key: "marketingPctOfRevenue", label: "Marketing spend", swingPct: 25 },
  { key: "priceChangePct", label: "Pricing", swingPct: 100 },
  { key: "opexInflationPct", label: "Opex inflation", swingPct: 50 },
  { key: "payrollLoadPct", label: "Payroll load", swingPct: 15 },
  { key: "dso", label: "DSO", swingPct: 20 },
];

export type Measure = "ebitda" | "revenue" | "endingCash" | "fcf";

export const MEASURE_LABELS: Record<Measure, string> = {
  ebitda: "EBITDA (12m)",
  revenue: "Revenue (12m)",
  endingCash: "Ending cash",
  fcf: "Free cash flow (12m)",
};

function measure(scenario: Scenario, headcount: HeadcountRow[], m: Measure) {
  const s = summarise(computePlan(scenario, headcount));
  return s[m];
}

export type TornadoRow = { key: string; label: string; low: number; high: number; spread: number; lowInput: number; highInput: number };

export function tornado(scenario: Scenario, headcount: HeadcountRow[], m: Measure, swingScale = 1): TornadoRow[] {
  const base = measure(scenario, headcount, m);
  const rows = SENSITIVITY_DRIVERS.map((d) => {
    const v = scenario.assumptions[d.key];
    const delta = Math.abs(v || 1) * (d.swingPct / 100) * swingScale;
    const run = (val: number) =>
      measure({ ...scenario, assumptions: { ...scenario.assumptions, [d.key]: val } }, headcount, m);
    const low = run(v - delta);
    const high = run(v + delta);
    return {
      key: d.key,
      label: d.label,
      low: low - base,
      high: high - base,
      spread: Math.abs(high - low),
      lowInput: v - delta,
      highInput: v + delta,
    };
  });
  return rows.sort((a, b) => b.spread - a.spread);
}

/** Two-driver grid, the classic data table an analyst hands to the CFO. */
export function sensitivityGrid(
  scenario: Scenario,
  headcount: HeadcountRow[],
  m: Measure,
  rowKey: keyof Assumptions,
  colKey: keyof Assumptions,
  steps = 5,
  spreadPct = 30,
) {
  const rv = scenario.assumptions[rowKey];
  const cv = scenario.assumptions[colKey];
  const axis = (v: number) => {
    const d = Math.abs(v || 1) * (spreadPct / 100);
    return Array.from({ length: steps }, (_, i) => v - d + (2 * d * i) / (steps - 1));
  };
  const rowVals = axis(rv);
  const colVals = axis(cv);
  const cells = rowVals.map((r) =>
    colVals.map((c) =>
      measure({ ...scenario, assumptions: { ...scenario.assumptions, [rowKey]: r, [colKey]: c } }, headcount, m),
    ),
  );
  return { rowVals, colVals, cells };
}

/* ------------------------------------------------------------------ *
 * Monte Carlo
 * ------------------------------------------------------------------ */

export type McDriver = { key: keyof Assumptions; label: string; sigmaPct: number };

export const DEFAULT_MC_DRIVERS: McDriver[] = [
  { key: "revenueGrowthPct", label: "Revenue growth", sigmaPct: 35 },
  { key: "churnPct", label: "Revenue churn", sigmaPct: 30 },
  { key: "cogsPct", label: "Cost of sales %", sigmaPct: 8 },
  { key: "marketingPctOfRevenue", label: "Marketing spend", sigmaPct: 20 },
];

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(r: () => number) {
  const u = Math.max(r(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

export type SimulationResult = {
  samples: number[];
  sorted: number[];
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  probPositive: number;
  histogram: { bucket: string; mid: number; count: number }[];
};

export function monteCarlo(
  scenario: Scenario,
  headcount: HeadcountRow[],
  m: Measure,
  drivers: McDriver[],
  runs = 400,
  seed = 424242,
): SimulationResult {
  const r = rng(seed);
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const a: Assumptions = { ...scenario.assumptions };
    for (const d of drivers) {
      const base = scenario.assumptions[d.key];
      a[d.key] = base * (1 + (normal(r) * d.sigmaPct) / 100);
    }
    samples.push(measure({ ...scenario, assumptions: a }, headcount, m));
  }
  const sorted = [...samples].sort((x, y) => x - y);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const buckets = 18;
  const width = (max - min) / buckets || 1;
  const histogram = Array.from({ length: buckets }, (_, i) => ({
    bucket: `${i}`,
    mid: min + width * (i + 0.5),
    count: 0,
  }));
  for (const s of samples) {
    const i = Math.min(buckets - 1, Math.floor((s - min) / width));
    histogram[i]!.count++;
  }
  return {
    samples,
    sorted,
    mean: samples.reduce((x, y) => x + y, 0) / (samples.length || 1),
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    probPositive: samples.filter((s) => s > 0).length / (samples.length || 1),
    histogram,
  };
}

/* ------------------------------------------------------------------ *
 * Goal seek
 * ------------------------------------------------------------------ */

export type GoalSeekResult = { ok: boolean; value: number; achieved: number; iterations: number };

export function goalSeek(
  scenario: Scenario,
  headcount: HeadcountRow[],
  m: Measure,
  driver: keyof Assumptions,
  target: number,
): GoalSeekResult {
  const start = scenario.assumptions[driver];
  const f = (v: number) =>
    measure({ ...scenario, assumptions: { ...scenario.assumptions, [driver]: v } }, headcount, m) - target;

  // Expand a bracket around the current value, then bisect.
  let lo = start - Math.abs(start || 1) * 2 - 5;
  let hi = start + Math.abs(start || 1) * 2 + 5;
  let flo = f(lo);
  let fhi = f(hi);
  let guard = 0;
  while (flo * fhi > 0 && guard++ < 40) {
    lo -= Math.abs(lo || 1);
    hi += Math.abs(hi || 1);
    flo = f(lo);
    fhi = f(hi);
  }
  if (flo * fhi > 0) return { ok: false, value: start, achieved: f(start) + target, iterations: guard };

  let mid = start;
  let i = 0;
  for (; i < 80; i++) {
    mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < Math.max(1, Math.abs(target) * 1e-6)) break;
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return { ok: true, value: mid, achieved: f(mid) + target, iterations: i };
}

/* ------------------------------------------------------------------ *
 * Three-statement model
 * ------------------------------------------------------------------ */

export const OPENING_BALANCE = {
  ppe: 1_850_000,
  inventory: 0,
  otherAssets: 320_000,
  accruals: 210_000,
};

export type StatementRow = {
  month: PlanRow["month"];
  // P&L
  revenue: number;
  grossProfit: number;
  ebitda: number;
  da: number;
  ebit: number;
  interest: number;
  tax: number;
  netIncome: number;
  // Balance sheet
  cash: number;
  ar: number;
  ppe: number;
  otherAssets: number;
  totalAssets: number;
  ap: number;
  accruals: number;
  debt: number;
  equity: number;
  retainedEarnings: number;
  totalLiabilitiesEquity: number;
  balanceCheck: number;
  // Cash flow (indirect)
  cfoNetIncome: number;
  cfoDa: number;
  cfoWorkingCapital: number;
  cfo: number;
  cfi: number;
  cff: number;
  netCashMovement: number;
};

export function buildStatements(scenario: Scenario, headcount: HeadcountRow[]): StatementRow[] {
  const plan = computePlan(scenario, headcount);
  const a = scenario.assumptions;
  const lastActual = ACTUALS[ACTUALS.length - 1]!;
  const t = actualTotals(lastActual);

  let ppe = OPENING_BALANCE.ppe;
  let prevAr = t.revenue * (a.dso / 30);
  let prevAp = (lastActual.cogs + t.totalOpex) * (a.dpo / 30);
  let prevCash = a.openingCash;
  let retained = 0;

  // Equity is set once so the opening balance sheet balances exactly.
  const openingAssets = prevCash + prevAr + ppe + OPENING_BALANCE.otherAssets;
  const shareCapital = openingAssets - prevAp - OPENING_BALANCE.accruals - a.debt;

  return plan.map((r) => {
    const dAr = r.ar - prevAr;
    const dAp = r.ap - prevAp;
    const workingCapital = -dAr + dAp;
    const cfo = r.netIncome + r.da + workingCapital;
    const cfi = -r.capex;
    const cff = 0;
    const netCashMovement = cfo + cfi + cff;
    const cash = prevCash + netCashMovement;
    ppe = ppe + r.capex - r.da;
    retained += r.netIncome;

    const totalAssets = cash + r.ar + ppe + OPENING_BALANCE.otherAssets;
    const equity = shareCapital + retained;
    const totalLiabilitiesEquity = r.ap + OPENING_BALANCE.accruals + a.debt + equity;

    const row: StatementRow = {
      month: r.month,
      revenue: r.revenue,
      grossProfit: r.grossProfit,
      ebitda: r.ebitda,
      da: r.da,
      ebit: r.ebit,
      interest: r.interest,
      tax: r.tax,
      netIncome: r.netIncome,
      cash,
      ar: r.ar,
      ppe,
      otherAssets: OPENING_BALANCE.otherAssets,
      totalAssets,
      ap: r.ap,
      accruals: OPENING_BALANCE.accruals,
      debt: a.debt,
      equity,
      retainedEarnings: retained,
      totalLiabilitiesEquity,
      balanceCheck: totalAssets - totalLiabilitiesEquity,
      cfoNetIncome: r.netIncome,
      cfoDa: r.da,
      cfoWorkingCapital: workingCapital,
      cfo,
      cfi,
      cff,
      netCashMovement,
    };
    prevAr = r.ar;
    prevAp = r.ap;
    prevCash = cash;
    return row;
  });
}

/* ------------------------------------------------------------------ *
 * Unit economics (SaaS)
 * ------------------------------------------------------------------ */

export const UE_ASSUMPTIONS = {
  avgContractValue: 24_000, // annual, per customer
  grossMarginPct: 63,
  salesCycleMonths: 2,
};

export type UnitEconomicsRow = {
  month: PlanRow["month"];
  isActual: boolean;
  arr: number;
  customers: number;
  newCustomers: number;
  churnedCustomers: number;
  arpa: number;
  smSpend: number;
  cac: number;
  ltv: number;
  ltvToCac: number;
  paybackMonths: number;
  nrrPct: number;
  grrPct: number;
  magicNumber: number;
  ruleOf40: number;
  burnMultiple: number;
};

/** Blend actual history and the live plan into one customer/ARR ledger. */
export function unitEconomics(scenario: Scenario, headcount: HeadcountRow[]): UnitEconomicsRow[] {
  const a = scenario.assumptions;
  const plan = computePlan(scenario, headcount);

  type Slice = { month: PlanRow["month"]; sub: number; revenue: number; sm: number; fcf: number; ebitda: number; isActual: boolean };
  const slices: Slice[] = [
    ...ACTUALS.map((r) => {
      const t = actualTotals(r);
      return {
        month: r.month,
        sub: r.revenueByStream.Subscriptions,
        revenue: t.revenue,
        sm: r.opexByCategory.Marketing + r.opexByCategory.Sales,
        fcf: t.ebitda - r.capex,
        ebitda: t.ebitda,
        isActual: true,
      };
    }),
    ...plan.map((r) => ({
      month: r.month,
      sub: r.revenueByStream.Subscriptions,
      revenue: r.revenue,
      sm: r.opexByCategory.Marketing + r.opexByCategory.Sales,
      fcf: r.freeCashFlow,
      ebitda: r.ebitda,
      isActual: false,
    })),
  ];

  const arpaMonthly = UE_ASSUMPTIONS.avgContractValue / 12;
  const gmPct = UE_ASSUMPTIONS.grossMarginPct / 100;
  const monthlyChurn = a.churnPct / 100;

  return slices.map((s, i) => {
    const prev = slices[i - 1];
    const customers = s.sub / arpaMonthly;
    const prevCustomers = prev ? prev.sub / arpaMonthly : customers;
    const churned = prevCustomers * monthlyChurn;
    const gross = customers - prevCustomers + churned;
    const newCustomers = Math.max(gross, 0);
    const cac = newCustomers > 0 ? s.sm / newCustomers : 0;
    const lifetimeMonths = monthlyChurn > 0 ? 1 / monthlyChurn : 60;
    const ltv = arpaMonthly * gmPct * Math.min(lifetimeMonths, 96);
    const arr = s.sub * 12;
    const prevArr = prev ? prev.sub * 12 : arr;
    const grr = prevArr > 0 ? ((prevArr - churned * arpaMonthly * 12) / prevArr) * 100 : 100;
    const nrr = prevArr > 0 ? (arr / prevArr) * 100 : 100;
    const yoy = slices[i - 12];
    const growthPct = yoy && yoy.revenue > 0 ? (s.revenue / yoy.revenue - 1) * 100 : ((s.revenue / (prev?.revenue || s.revenue)) ** 12 - 1) * 100;
    const marginPct = s.revenue > 0 ? (s.ebitda / s.revenue) * 100 : 0;
    const netNewArr = arr - prevArr;
    const magic = prev && prev.sm > 0 ? netNewArr / prev.sm : 0;
    const burn = s.fcf < 0 && netNewArr > 0 ? Math.abs(s.fcf) / (netNewArr / 12) : 0;

    return {
      month: s.month,
      isActual: s.isActual,
      arr,
      customers,
      newCustomers,
      churnedCustomers: churned,
      arpa: arpaMonthly,
      smSpend: s.sm,
      cac,
      ltv,
      ltvToCac: cac > 0 ? ltv / cac : 0,
      paybackMonths: arpaMonthly * gmPct > 0 ? cac / (arpaMonthly * gmPct) : 0,
      nrrPct: nrr,
      grrPct: grr,
      magicNumber: magic,
      ruleOf40: growthPct + marginPct,
      burnMultiple: burn,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Automated variance commentary
 * ------------------------------------------------------------------ */

export type Commentary = { headline: string; severity: "good" | "bad" | "neutral"; detail: string };

function fmtPct(v: number | null) {
  return v === null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

/**
 * Turns a variance table into the paragraphs an FP&A lead would write for the
 * month-end pack: biggest swings first, expenses read the right way round.
 */
export function varianceCommentary(rows: VarianceRow[], fmtMoney: (v: number) => string): Commentary[] {
  const revenue = rows.filter((r) => r.group === "Revenue");
  const revActual = revenue.reduce((a, r) => a + r.actual, 0);
  const revBudget = revenue.reduce((a, r) => a + r.budget, 0);
  const revVar = revActual - revBudget;
  const cost = rows.filter((r) => r.group !== "Revenue");
  const costVar = cost.reduce((a, r) => a + r.variance, 0);

  const out: Commentary[] = [
    {
      headline: `Revenue ${revVar >= 0 ? "ahead of" : "behind"} budget by ${fmtMoney(Math.abs(revVar))}`,
      severity: revVar >= 0 ? "good" : "bad",
      detail: `Actual ${fmtMoney(revActual)} against a budget of ${fmtMoney(revBudget)} (${fmtPct(
        revBudget ? (revVar / Math.abs(revBudget)) * 100 : null,
      )}). ${
        revenue.length
          ? `Largest single driver: ${[...revenue].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))[0]!.label}.`
          : ""
      }`,
    },
    {
      headline: `Total cost ${costVar <= 0 ? "under" : "over"} budget by ${fmtMoney(Math.abs(costVar))}`,
      severity: costVar <= 0 ? "good" : "bad",
      detail: `Cost of sales and operating expenses came in ${fmtMoney(Math.abs(costVar))} ${
        costVar <= 0 ? "below" : "above"
      } plan, a ${costVar <= 0 ? "favourable" : "unfavourable"} variance for the period.`,
    },
  ];

  const movers = [...rows].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 3);
  for (const m of movers) {
    out.push({
      headline: `${m.label}: ${m.favorable ? "favourable" : "unfavourable"} ${fmtMoney(Math.abs(m.variance))}`,
      severity: m.favorable ? "good" : "bad",
      detail: `${m.label} actual ${fmtMoney(m.actual)} vs budget ${fmtMoney(m.budget)} (${fmtPct(m.variancePct)}). ${
        m.group === "Revenue"
          ? m.favorable
            ? "Hold the upside in the reforecast only if the pipeline supports it."
            : "Reforecast the remaining quarters before committing the annual number."
          : m.favorable
            ? "Confirm this is a true saving rather than a timing difference before releasing budget."
            : "Investigate whether the overspend is phasing or a run-rate increase."
      }`,
    });
  }

  const flat = rows.filter((r) => r.group !== "Revenue" && Math.abs(r.variancePct ?? 0) > 12);
  if (flat.length) {
    out.push({
      headline: `${flat.length} cost line${flat.length > 1 ? "s" : ""} moved more than 12% from plan`,
      severity: "neutral",
      detail: `${flat.map((f) => f.label).join(", ")} breached the 12% materiality threshold and require owner commentary in the close pack.`,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Executive KPI scorecard
 * ------------------------------------------------------------------ */

export type ScorecardRow = {
  label: string;
  value: number;
  format: "money" | "pct" | "x" | "months" | "number";
  target: number;
  higherIsBetter: boolean;
  status: "good" | "warn" | "bad";
  note: string;
};

function rag(value: number, target: number, higherIsBetter: boolean): ScorecardRow["status"] {
  const ratio = target === 0 ? 1 : value / target;
  const r = higherIsBetter ? ratio : ratio === 0 ? 2 : 1 / ratio;
  if (r >= 1) return "good";
  if (r >= 0.85) return "warn";
  return "bad";
}

export function scorecard(scenario: Scenario, headcount: HeadcountRow[]): ScorecardRow[] {
  const plan = computePlan(scenario, headcount);
  const s = summarise(plan);
  const ue = unitEconomics(scenario, headcount);
  const last = ue[ue.length - 1]!;

  const defs: Omit<ScorecardRow, "status">[] = [
    { label: "Revenue growth (exit)", value: s.revenueGrowthPct, format: "pct", target: 20, higherIsBetter: true, note: "Exit-month growth over the plan start." },
    { label: "Gross margin", value: s.grossMarginPct, format: "pct", target: 65, higherIsBetter: true, note: "Benchmark for a mixed software and services book." },
    { label: "EBITDA margin", value: s.ebitdaMarginPct, format: "pct", target: 15, higherIsBetter: true, note: "Twelve-month plan margin." },
    { label: "Rule of 40", value: s.ruleOf40, format: "number", target: 40, higherIsBetter: true, note: "Growth plus EBITDA margin." },
    { label: "LTV : CAC", value: last.ltvToCac, format: "x", target: 3, higherIsBetter: true, note: "Three times or better is healthy." },
    { label: "CAC payback", value: last.paybackMonths, format: "months", target: 18, higherIsBetter: false, note: "Months of gross profit to recover acquisition cost." },
    { label: "Net revenue retention", value: last.nrrPct, format: "pct", target: 110, higherIsBetter: true, note: "Expansion net of churn." },
    { label: "Runway", value: s.runwayMonths ?? 99, format: "months", target: 18, higherIsBetter: true, note: "Months of cash at the current burn." },
  ];

  return defs.map((d) => ({ ...d, status: rag(d.value, d.target, d.higherIsBetter) }));
}

/* ------------------------------------------------------------------ *
 * Revenue bridge: price / volume / churn decomposition
 * ------------------------------------------------------------------ */

export function revenueBridge(scenario: Scenario, headcount: HeadcountRow[]) {
  const a = scenario.assumptions;
  const plan = computePlan(scenario, headcount);
  const opening = actualTotals(ACTUALS[ACTUALS.length - 1]!).revenue * 12;
  const closing = (plan[plan.length - 1]?.revenue ?? 0) * 12;
  const total = closing - opening;

  // Attribute the annualised movement to each multiplicative driver.
  const gross = Math.pow(1 + a.revenueGrowthPct / 100, 12) - 1;
  const churn = Math.pow(1 - a.churnPct / 100, 12) - 1;
  const price = a.priceChangePct / 100;
  const weights = [Math.abs(gross), Math.abs(churn), Math.abs(price)];
  const sum = weights.reduce((x, y) => x + y, 0) || 1;

  return {
    opening,
    closing,
    steps: [
      { label: "Volume growth", value: total * (Math.abs(gross) / sum) * Math.sign(gross || 1) },
      { label: "Churn", value: -Math.abs(total * (Math.abs(churn) / sum)) },
      { label: "Pricing", value: total * (Math.abs(price) / sum) * Math.sign(price || 1) },
    ],
    total,
  };
}

/* ------------------------------------------------------------------ *
 * Cost structure
 * ------------------------------------------------------------------ */

export function costStructure(plan: PlanRow[]) {
  const revenue = plan.reduce((a, r) => a + r.revenue, 0) || 1;
  const rows = [
    { label: "Cost of sales", value: plan.reduce((a, r) => a + r.cogs, 0) },
    { label: "Payroll", value: plan.reduce((a, r) => a + r.payroll, 0) },
    ...OPEX_CATEGORIES.map((c) => ({
      label: c,
      value: plan.reduce((a, r) => a + r.opexByCategory[c], 0),
    })),
  ];
  return rows.map((r) => ({ ...r, pctOfRevenue: (r.value / revenue) * 100 }));
}

export const BENCHMARK_NOTE = `Benchmarks reflect typical mid-market B2B software operators; adjust the targets to your board's operating plan.`;

export { BASE_ASSUMPTIONS };
