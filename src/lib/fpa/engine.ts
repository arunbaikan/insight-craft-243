/**
 * Client-side FP&A planning engine.
 *
 * Everything here is pure and runs in the browser: no backend calls. Actuals
 * are generated from a deterministic seed so every session sees the same
 * history, and forecasts are recomputed from scenario assumptions on every
 * keystroke.
 */

export const REVENUE_STREAMS = ["Subscriptions", "Services", "Licenses"] as const;
export type RevenueStream = (typeof REVENUE_STREAMS)[number];

export const OPEX_CATEGORIES = ["Marketing", "Sales", "R&D", "G&A", "Facilities"] as const;
export type OpexCategory = (typeof OPEX_CATEGORIES)[number];

export const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Support", "G&A"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export type Assumptions = {
  revenueGrowthPct: number; // month over month, %
  priceChangePct: number; // one-off uplift applied to forecast revenue
  churnPct: number; // monthly revenue churn, %
  cogsPct: number; // % of revenue
  opexInflationPct: number; // annual, %
  marketingPctOfRevenue: number; // variable marketing spend
  payrollLoadPct: number; // employer taxes/benefits on top of salary
  capexPerMonth: number;
  daPerMonth: number;
  dso: number; // days sales outstanding
  dpo: number; // days payable outstanding
  taxRatePct: number;
  interestRatePct: number; // annual, on debt
  debt: number;
  openingCash: number;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  color: string;
  assumptions: Assumptions;
  locked?: boolean;
};

export type HeadcountRow = {
  id: string;
  department: Department;
  role: string;
  count: number;
  startMonth: string; // YYYY-MM
  annualSalary: number;
};

export type MonthMeta = { key: string; label: string; short: string; index: number; isActual: boolean };

export type PlanRow = {
  month: MonthMeta;
  revenueByStream: Record<RevenueStream, number>;
  revenue: number;
  cogs: number;
  grossProfit: number;
  payroll: number;
  opexByCategory: Record<OpexCategory, number>;
  otherOpex: number;
  totalOpex: number;
  ebitda: number;
  da: number;
  ebit: number;
  interest: number;
  tax: number;
  netIncome: number;
  headcount: number;
  collections: number;
  disbursements: number;
  capex: number;
  freeCashFlow: number;
  cashBalance: number;
  ar: number;
  ap: number;
};

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const HISTORY_MONTHS = 12;
export const FORECAST_MONTHS = 12;

export function buildCalendar(today = new Date()): MonthMeta[] {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1; // current month is the first forecast month
  const out: MonthMeta[] = [];
  for (let i = -HISTORY_MONTHS; i < FORECAST_MONTHS; i++) {
    const total = y * 12 + (m - 1) + i;
    const yy = Math.floor(total / 12);
    const mm = (total % 12) + 1;
    out.push({
      key: `${yy}-${String(mm).padStart(2, "0")}`,
      label: `${MONTH_NAMES[mm - 1]} ${yy}`,
      short: `${MONTH_NAMES[mm - 1]} ${String(yy).slice(2)}`,
      index: i + HISTORY_MONTHS,
      isActual: i < 0,
    });
  }
  return out;
}

export const CALENDAR = buildCalendar();
export const ACTUAL_MONTHS = CALENDAR.filter((m) => m.isActual);
export const PLAN_MONTHS = CALENDAR.filter((m) => !m.isActual);

/* ------------------------------------------------------------------ *
 * Deterministic actuals
 * ------------------------------------------------------------------ */

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ActualRow = {
  month: MonthMeta;
  revenueByStream: Record<RevenueStream, number>;
  cogs: number;
  payroll: number;
  opexByCategory: Record<OpexCategory, number>;
  capex: number;
  headcount: number;
};

const STREAM_BASE: Record<RevenueStream, number> = {
  Subscriptions: 620_000,
  Services: 180_000,
  Licenses: 95_000,
};

const OPEX_BASE: Record<OpexCategory, number> = {
  Marketing: 96_000,
  Sales: 74_000,
  "R&D": 58_000,
  "G&A": 61_000,
  Facilities: 27_000,
};

export const ACTUALS: ActualRow[] = (() => {
  const rand = mulberry(20260904);
  return ACTUAL_MONTHS.map((month, i) => {
    const trend = 1 + i * 0.018;
    const season = 1 + 0.06 * Math.sin((i / 12) * Math.PI * 2);
    const revenueByStream = Object.fromEntries(
      REVENUE_STREAMS.map((s) => [s, Math.round(STREAM_BASE[s] * trend * season * (0.94 + rand() * 0.12))]),
    ) as Record<RevenueStream, number>;
    const revenue = Object.values(revenueByStream).reduce((a, b) => a + b, 0);
    const opexByCategory = Object.fromEntries(
      OPEX_CATEGORIES.map((c) => [c, Math.round(OPEX_BASE[c] * (1 + i * 0.011) * (0.93 + rand() * 0.14))]),
    ) as Record<OpexCategory, number>;
    return {
      month,
      revenueByStream,
      cogs: Math.round(revenue * (0.36 + rand() * 0.03)),
      payroll: Math.round((298_000 + i * 4200) * (0.98 + rand() * 0.04)),
      opexByCategory,
      capex: Math.round(18_000 * (0.6 + rand())),
      headcount: 74 + Math.round(i * 1.1),
    };
  });
})();

export function actualTotals(row: ActualRow) {
  const revenue = Object.values(row.revenueByStream).reduce((a, b) => a + b, 0);
  const otherOpex = Object.values(row.opexByCategory).reduce((a, b) => a + b, 0);
  const totalOpex = otherOpex + row.payroll;
  const grossProfit = revenue - row.cogs;
  return { revenue, otherOpex, totalOpex, grossProfit, ebitda: grossProfit - totalOpex };
}

/* ------------------------------------------------------------------ *
 * Defaults
 * ------------------------------------------------------------------ */

export const BASE_ASSUMPTIONS: Assumptions = {
  revenueGrowthPct: 2.4,
  priceChangePct: 0,
  churnPct: 0.8,
  cogsPct: 37,
  opexInflationPct: 4,
  marketingPctOfRevenue: 9,
  payrollLoadPct: 22,
  capexPerMonth: 20_000,
  daPerMonth: 26_000,
  dso: 46,
  dpo: 38,
  taxRatePct: 25,
  interestRatePct: 8,
  debt: 1_200_000,
  openingCash: 2_450_000,
};

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "base",
    name: "Base plan",
    description: "Board-approved operating plan carried forward from last close.",
    color: "var(--brand)",
    assumptions: { ...BASE_ASSUMPTIONS },
    locked: true,
  },
  {
    id: "upside",
    name: "Upside",
    description: "Pricing uplift lands and pipeline converts above plan.",
    color: "var(--positive)",
    assumptions: {
      ...BASE_ASSUMPTIONS,
      revenueGrowthPct: 4.1,
      priceChangePct: 5,
      churnPct: 0.5,
      cogsPct: 35,
      marketingPctOfRevenue: 11,
    },
  },
  {
    id: "downside",
    name: "Downside",
    description: "Demand softens, churn rises, hiring freeze partially offsets.",
    color: "var(--negative)",
    assumptions: {
      ...BASE_ASSUMPTIONS,
      revenueGrowthPct: 0.3,
      churnPct: 2.1,
      cogsPct: 39.5,
      marketingPctOfRevenue: 6,
      capexPerMonth: 8_000,
    },
  },
];

export const DEFAULT_HEADCOUNT: HeadcountRow[] = [
  { id: "hc-1", department: "Engineering", role: "Senior engineer", count: 3, startMonth: PLAN_MONTHS[1]!.key, annualSalary: 148_000 },
  { id: "hc-2", department: "Sales", role: "Account executive", count: 4, startMonth: PLAN_MONTHS[2]!.key, annualSalary: 112_000 },
  { id: "hc-3", department: "Support", role: "Support specialist", count: 2, startMonth: PLAN_MONTHS[4]!.key, annualSalary: 68_000 },
  { id: "hc-4", department: "Marketing", role: "Demand gen manager", count: 1, startMonth: PLAN_MONTHS[5]!.key, annualSalary: 96_000 },
  { id: "hc-5", department: "G&A", role: "Financial analyst", count: 1, startMonth: PLAN_MONTHS[7]!.key, annualSalary: 88_000 },
];

/* ------------------------------------------------------------------ *
 * Budget
 * ------------------------------------------------------------------ */

export type BudgetLine = { key: string; label: string; group: "Revenue" | "Cost of sales" | "Operating expenses" };

export const BUDGET_LINES: BudgetLine[] = [
  ...REVENUE_STREAMS.map((s) => ({ key: `rev:${s}`, label: s, group: "Revenue" as const })),
  { key: "cogs", label: "Cost of sales", group: "Cost of sales" },
  { key: "opex:Payroll", label: "Payroll", group: "Operating expenses" },
  ...OPEX_CATEGORIES.map((c) => ({ key: `opex:${c}`, label: c, group: "Operating expenses" as const })),
];

export type Budget = Record<string, Record<string, number>>; // lineKey -> monthKey -> value

/** Budget defaults: last actual grown at a steady rate, so the grid is never empty. */
export function defaultBudget(): Budget {
  const last = ACTUALS[ACTUALS.length - 1]!;
  const budget: Budget = {};
  const set = (key: string, base: number, growth: number) => {
    budget[key] = {};
    CALENDAR.forEach((m, i) => {
      budget[key]![m.key] = Math.round(base * Math.pow(1 + growth, i - HISTORY_MONTHS + 1));
    });
  };
  for (const s of REVENUE_STREAMS) set(`rev:${s}`, last.revenueByStream[s], 0.025);
  set("cogs", last.cogs, 0.022);
  set("opex:Payroll", last.payroll, 0.015);
  for (const c of OPEX_CATEGORIES) set(`opex:${c}`, last.opexByCategory[c], 0.01);
  return budget;
}

export function budgetTotals(budget: Budget, monthKey: string) {
  const get = (k: string) => budget[k]?.[monthKey] ?? 0;
  const revenue = REVENUE_STREAMS.reduce((a, s) => a + get(`rev:${s}`), 0);
  const cogs = get("cogs");
  const payroll = get("opex:Payroll");
  const otherOpex = OPEX_CATEGORIES.reduce((a, c) => a + get(`opex:${c}`), 0);
  const totalOpex = payroll + otherOpex;
  return { revenue, cogs, payroll, otherOpex, totalOpex, grossProfit: revenue - cogs, ebitda: revenue - cogs - totalOpex };
}

/* ------------------------------------------------------------------ *
 * Forecast engine
 * ------------------------------------------------------------------ */

export function plannedHeadcountPayroll(rows: HeadcountRow[], monthKey: string, loadPct: number) {
  let count = 0;
  let monthly = 0;
  for (const r of rows) {
    if (r.startMonth <= monthKey) {
      count += r.count;
      monthly += (r.count * r.annualSalary) / 12;
    }
  }
  return { count, cost: monthly * (1 + loadPct / 100) };
}

export function computePlan(scenario: Scenario, headcount: HeadcountRow[]): PlanRow[] {
  const a = scenario.assumptions;
  const rows: PlanRow[] = [];
  const lastActual = ACTUALS[ACTUALS.length - 1]!;

  let streams: Record<RevenueStream, number> = { ...lastActual.revenueByStream };
  let cash = a.openingCash;
  let prevRevenue = actualTotals(lastActual).revenue;
  let prevOutflow = 0;

  const netGrowth = (1 + a.revenueGrowthPct / 100) * (1 - a.churnPct / 100);
  const monthlyInflation = Math.pow(1 + a.opexInflationPct / 100, 1 / 12);
  const dsoLag = Math.min(a.dso / 30, 2);
  const dpoLag = Math.min(a.dpo / 30, 2);

  PLAN_MONTHS.forEach((month, i) => {
    streams = Object.fromEntries(
      REVENUE_STREAMS.map((s) => [s, streams[s] * netGrowth * (i === 0 ? 1 + a.priceChangePct / 100 : 1)]),
    ) as Record<RevenueStream, number>;
    const revenue = Object.values(streams).reduce((x, y) => x + y, 0);
    const cogs = revenue * (a.cogsPct / 100);
    const grossProfit = revenue - cogs;

    const hc = plannedHeadcountPayroll(headcount, month.key, a.payrollLoadPct);
    const basePayroll = lastActual.payroll * Math.pow(monthlyInflation, i + 1);
    const payroll = basePayroll + hc.cost;

    const opexByCategory = Object.fromEntries(
      OPEX_CATEGORIES.map((c) => [
        c,
        c === "Marketing"
          ? revenue * (a.marketingPctOfRevenue / 100)
          : lastActual.opexByCategory[c] * Math.pow(monthlyInflation, i + 1),
      ]),
    ) as Record<OpexCategory, number>;

    const otherOpex = Object.values(opexByCategory).reduce((x, y) => x + y, 0);
    const totalOpex = otherOpex + payroll;
    const ebitda = grossProfit - totalOpex;
    const da = a.daPerMonth;
    const ebit = ebitda - da;
    const interest = (a.debt * (a.interestRatePct / 100)) / 12;
    const pretax = ebit - interest;
    const tax = pretax > 0 ? pretax * (a.taxRatePct / 100) : 0;
    const netIncome = pretax - tax;

    // Working-capital aware cash conversion: a share of each month's activity
    // settles in the following month according to DSO / DPO.
    const dsoShare = Math.min(dsoLag, 1);
    const dpoShare = Math.min(dpoLag, 1);
    const collections = revenue * (1 - dsoShare) + prevRevenue * dsoShare;
    const outflow = cogs + totalOpex;
    const disbursements = outflow * (1 - dpoShare) + (prevOutflow || outflow) * dpoShare;
    const capex = a.capexPerMonth;
    const freeCashFlow = collections - disbursements - capex - interest - tax;
    cash += freeCashFlow;

    rows.push({
      month,
      revenueByStream: { ...streams },
      revenue,
      cogs,
      grossProfit,
      payroll,
      opexByCategory,
      otherOpex,
      totalOpex,
      ebitda,
      da,
      ebit,
      interest,
      tax,
      netIncome,
      headcount: lastActual.headcount + hc.count,
      collections,
      disbursements,
      capex,
      freeCashFlow,
      cashBalance: cash,
      ar: revenue * (a.dso / 30),
      ap: outflow * (a.dpo / 30),
    });

    prevRevenue = revenue;
    prevOutflow = outflow;
  });

  return rows;
}

/** Actual months expressed in the same shape so charts can concatenate them. */
export function actualsAsPlanRows(): PlanRow[] {
  let cash = BASE_ASSUMPTIONS.openingCash * 0.82;
  return ACTUALS.map((r) => {
    const t = actualTotals(r);
    const da = BASE_ASSUMPTIONS.daPerMonth;
    const interest = (BASE_ASSUMPTIONS.debt * (BASE_ASSUMPTIONS.interestRatePct / 100)) / 12;
    const ebit = t.ebitda - da;
    const pretax = ebit - interest;
    const tax = pretax > 0 ? pretax * (BASE_ASSUMPTIONS.taxRatePct / 100) : 0;
    const fcf = t.ebitda - r.capex - interest - tax;
    cash += fcf;
    return {
      month: r.month,
      revenueByStream: r.revenueByStream,
      revenue: t.revenue,
      cogs: r.cogs,
      grossProfit: t.grossProfit,
      payroll: r.payroll,
      opexByCategory: r.opexByCategory,
      otherOpex: t.otherOpex,
      totalOpex: t.totalOpex,
      ebitda: t.ebitda,
      da,
      ebit,
      interest,
      tax,
      netIncome: pretax - tax,
      headcount: r.headcount,
      collections: t.revenue,
      disbursements: r.cogs + t.totalOpex,
      capex: r.capex,
      freeCashFlow: fcf,
      cashBalance: cash,
      ar: t.revenue * (BASE_ASSUMPTIONS.dso / 30),
      ap: (r.cogs + t.totalOpex) * (BASE_ASSUMPTIONS.dpo / 30),
    } satisfies PlanRow;
  });
}

/* ------------------------------------------------------------------ *
 * Variance
 * ------------------------------------------------------------------ */

export type VarianceRow = {
  key: string;
  label: string;
  group: string;
  actual: number;
  budget: number;
  variance: number;
  variancePct: number | null;
  favorable: boolean;
};

/** Expense lines are favourable when actual is BELOW budget. */
export function computeVariance(budget: Budget, monthKeys: string[]): VarianceRow[] {
  const sum = (fn: (r: ActualRow) => number) =>
    ACTUALS.filter((r) => monthKeys.includes(r.month.key)).reduce((a, r) => a + fn(r), 0);
  const budgetSum = (key: string) => monthKeys.reduce((a, m) => a + (budget[key]?.[m] ?? 0), 0);

  const lines: { key: string; label: string; group: string; actual: number; isExpense: boolean }[] = [
    ...REVENUE_STREAMS.map((s) => ({
      key: `rev:${s}`,
      label: s,
      group: "Revenue",
      actual: sum((r) => r.revenueByStream[s]),
      isExpense: false,
    })),
    { key: "cogs", label: "Cost of sales", group: "Cost of sales", actual: sum((r) => r.cogs), isExpense: true },
    { key: "opex:Payroll", label: "Payroll", group: "Operating expenses", actual: sum((r) => r.payroll), isExpense: true },
    ...OPEX_CATEGORIES.map((c) => ({
      key: `opex:${c}`,
      label: c,
      group: "Operating expenses",
      actual: sum((r) => r.opexByCategory[c]),
      isExpense: true,
    })),
  ];

  return lines.map((l) => {
    const b = budgetSum(l.key);
    const variance = l.actual - b;
    return {
      key: l.key,
      label: l.label,
      group: l.group,
      actual: l.actual,
      budget: b,
      variance,
      variancePct: b === 0 ? null : (variance / Math.abs(b)) * 100,
      favorable: l.isExpense ? variance <= 0 : variance >= 0,
    };
  });
}

/* ------------------------------------------------------------------ *
 * KPIs
 * ------------------------------------------------------------------ */

export function summarise(rows: PlanRow[]) {
  const revenue = rows.reduce((a, r) => a + r.revenue, 0);
  const grossProfit = rows.reduce((a, r) => a + r.grossProfit, 0);
  const ebitda = rows.reduce((a, r) => a + r.ebitda, 0);
  const netIncome = rows.reduce((a, r) => a + r.netIncome, 0);
  const fcf = rows.reduce((a, r) => a + r.freeCashFlow, 0);
  const last = rows[rows.length - 1];
  const first = rows[0];
  const burnMonths = rows.filter((r) => r.freeCashFlow < 0);
  const avgBurn = burnMonths.length ? Math.abs(burnMonths.reduce((a, r) => a + r.freeCashFlow, 0)) / burnMonths.length : 0;
  const growth = first && last && first.revenue > 0 ? (last.revenue / first.revenue - 1) * 100 : 0;
  const ebitdaMargin = revenue ? (ebitda / revenue) * 100 : 0;
  return {
    revenue,
    grossProfit,
    grossMarginPct: revenue ? (grossProfit / revenue) * 100 : 0,
    ebitda,
    ebitdaMarginPct: ebitdaMargin,
    netIncome,
    fcf,
    endingCash: last?.cashBalance ?? 0,
    endingHeadcount: last?.headcount ?? 0,
    avgBurn,
    runwayMonths: avgBurn > 0 ? (last?.cashBalance ?? 0) / avgBurn : null,
    revenueGrowthPct: growth,
    ruleOf40: growth + ebitdaMargin,
  };
}

/** Contribution of each driver to the revenue gap between two scenarios. */
export function driverBridge(from: Scenario, to: Scenario, headcount: HeadcountRow[]) {
  const keys: (keyof Assumptions)[] = [
    "revenueGrowthPct",
    "churnPct",
    "priceChangePct",
    "cogsPct",
    "marketingPctOfRevenue",
    "payrollLoadPct",
    "opexInflationPct",
  ];
  const baseEbitda = summarise(computePlan(from, headcount)).ebitda;
  let running = { ...from.assumptions };
  const steps: { label: string; value: number }[] = [];
  for (const k of keys) {
    if (from.assumptions[k] === to.assumptions[k]) continue;
    const before = summarise(computePlan({ ...from, assumptions: running }, headcount)).ebitda;
    running = { ...running, [k]: to.assumptions[k] };
    const after = summarise(computePlan({ ...from, assumptions: running }, headcount)).ebitda;
    steps.push({ label: ASSUMPTION_LABELS[k], value: after - before });
  }
  return { baseEbitda, steps, targetEbitda: summarise(computePlan(to, headcount)).ebitda };
}

export const ASSUMPTION_LABELS: Record<keyof Assumptions, string> = {
  revenueGrowthPct: "Revenue growth (m/m %)",
  priceChangePct: "Price change (%)",
  churnPct: "Revenue churn (m/m %)",
  cogsPct: "Cost of sales (% of revenue)",
  opexInflationPct: "Opex inflation (annual %)",
  marketingPctOfRevenue: "Marketing (% of revenue)",
  payrollLoadPct: "Payroll load (%)",
  capexPerMonth: "Capex per month",
  daPerMonth: "Depreciation & amortisation",
  dso: "DSO (days)",
  dpo: "DPO (days)",
  taxRatePct: "Tax rate (%)",
  interestRatePct: "Interest rate (annual %)",
  debt: "Debt balance",
  openingCash: "Opening cash",
};

export const ASSUMPTION_GROUPS: { title: string; keys: (keyof Assumptions)[] }[] = [
  { title: "Growth drivers", keys: ["revenueGrowthPct", "priceChangePct", "churnPct"] },
  { title: "Cost drivers", keys: ["cogsPct", "marketingPctOfRevenue", "opexInflationPct", "payrollLoadPct"] },
  { title: "Capital & working capital", keys: ["capexPerMonth", "daPerMonth", "dso", "dpo"] },
  { title: "Financing & tax", keys: ["debt", "interestRatePct", "taxRatePct", "openingCash"] },
];

export const MONEY_KEYS = new Set<keyof Assumptions>(["capexPerMonth", "daPerMonth", "debt", "openingCash"]);
