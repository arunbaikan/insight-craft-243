import { FORMULA_FUNCTIONS, type FormulaNode, type ValidationIssue } from "./types";

export type FormulaScope = {
  /** Value of a referenced metric in the current evaluation scope. */
  get: (key: string) => number;
  /** Percent change of a metric against a lag expressed in months. */
  pctChange: (key: string, lagMonths: number) => number;
};

const ARITY: Record<string, [number, number]> = {
  safe_divide: [2, 3],
  percent_change: [1, 2],
  abs: [1, 1],
  min: [2, 8],
  max: [2, 8],
  coalesce: [1, 8],
  round: [1, 2],
};

export function collectMetricRefs(node: FormulaNode | null | undefined, out = new Set<string>()) {
  if (!node) return out;
  if (node.type === "metric") out.add(node.key);
  else if (node.type === "binary") {
    collectMetricRefs(node.left, out);
    collectMetricRefs(node.right, out);
  } else if (node.type === "call") node.args.forEach((a) => collectMetricRefs(a, out));
  return out;
}

export function validateFormula(
  node: FormulaNode | null | undefined,
  knownKeys: Set<string>,
  path = "formula",
  issues: ValidationIssue[] = [],
): ValidationIssue[] {
  if (!node) {
    issues.push({ path, message: "A formula metric needs an expression." });
    return issues;
  }
  switch (node.type) {
    case "number":
      if (typeof node.value !== "number" || Number.isNaN(node.value))
        issues.push({ path, message: "Number nodes need a numeric value." });
      break;
    case "metric":
      if (!node.key) issues.push({ path, message: "Pick a metric for this reference." });
      else if (!knownKeys.has(node.key))
        issues.push({ path, message: `Unknown metric "${node.key}".` });
      break;
    case "binary":
      if (!["+", "-", "*", "/"].includes(node.op))
        issues.push({ path, message: `Unsupported operator "${node.op}".` });
      if (node.op === "/")
        issues.push({
          path,
          message: "Use safe_divide() instead of / so a zero denominator cannot break the widget.",
        });
      validateFormula(node.left, knownKeys, `${path}.left`, issues);
      validateFormula(node.right, knownKeys, `${path}.right`, issues);
      break;
    case "call": {
      if (!FORMULA_FUNCTIONS.includes(node.fn)) {
        issues.push({ path, message: `Unknown function "${node.fn}".` });
        break;
      }
      const [min, max] = ARITY[node.fn]!;
      const n = node.args?.length ?? 0;
      if (n < min || n > max)
        issues.push({
          path,
          message: `${node.fn}() takes ${min === max ? min : `${min}–${max}`} arguments, got ${n}.`,
        });
      (node.args ?? []).forEach((a, i) => validateFormula(a, knownKeys, `${path}.${node.fn}[${i}]`, issues));
      break;
    }
    default:
      issues.push({ path, message: "Unsupported expression node." });
  }
  return issues;
}

export function detectCycle(
  key: string,
  formulas: Map<string, FormulaNode | null | undefined>,
  seen: string[] = [],
): string[] | null {
  if (seen.includes(key)) return [...seen, key];
  const refs = collectMetricRefs(formulas.get(key));
  for (const ref of refs) {
    if (!formulas.has(ref)) continue;
    const cycle = detectCycle(ref, formulas, [...seen, key]);
    if (cycle) return cycle;
  }
  return null;
}

export function evaluateFormula(node: FormulaNode, scope: FormulaScope): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "metric":
      return scope.get(node.key);
    case "binary": {
      const l = evaluateFormula(node.left, scope);
      const r = evaluateFormula(node.right, scope);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? 0 : l / r;
      }
      return 0;
    }
    case "call": {
      const a = node.args.map((x) => evaluateFormula(x, scope));
      switch (node.fn) {
        case "safe_divide":
          return a[1] === 0 || !Number.isFinite(a[1]!) ? (a[2] ?? 0) : a[0]! / a[1]!;
        case "percent_change": {
          const arg = node.args[0]!;
          const lag = a[1] ?? 1;
          if (arg.type === "metric") return scope.pctChange(arg.key, lag);
          return 0;
        }
        case "abs":
          return Math.abs(a[0]!);
        case "min":
          return Math.min(...a);
        case "max":
          return Math.max(...a);
        case "coalesce":
          return a.find((v) => Number.isFinite(v) && v !== 0) ?? 0;
        case "round": {
          const p = Math.round(a[1] ?? 0);
          const f = 10 ** p;
          return Math.round(a[0]! * f) / f;
        }
      }
      return 0;
    }
  }
}

/** Human-readable rendering of an AST, used by the formula editor. */
export function formulaToText(node: FormulaNode | null | undefined): string {
  if (!node) return "";
  switch (node.type) {
    case "number":
      return String(node.value);
    case "metric":
      return node.key;
    case "binary":
      return `(${formulaToText(node.left)} ${node.op} ${formulaToText(node.right)})`;
    case "call":
      return `${node.fn}(${node.args.map(formulaToText).join(", ")})`;
  }
}
