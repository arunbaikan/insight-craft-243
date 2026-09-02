import { useMemo, useRef, useState } from "react";
import { Check, CircleAlert, FunctionSquare, Search } from "lucide-react";
import { FORMULA_FUNCTIONS, type FormulaNode } from "@/lib/metrics/types";
import { parseFormula } from "@/lib/metrics/formula-text";
import type { FormulaRefValue } from "@/lib/metrics.functions";
import { formatValue } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const FUNCTION_HELP: Record<string, { signature: string; description: string }> = {
  safe_divide: { signature: "safe_divide(a, b)", description: "a ÷ b, returning 0 when b is zero." },
  percent_change: { signature: "percent_change(now, before)", description: "Growth from before to now, as a percent." },
  abs: { signature: "abs(a)", description: "Drops the minus sign." },
  min: { signature: "min(a, b, …)", description: "The smallest of the values." },
  max: { signature: "max(a, b, …)", description: "The largest of the values." },
  coalesce: { signature: "coalesce(a, b, …)", description: "First value that is not empty." },
  round: { signature: "round(a, places)", description: "Rounds to the given decimals." },
  avg_per_month: { signature: "avg_per_month(a)", description: "Divides a total by the months in the period." },
};

export type FormulaToken = { text: string; start: number; end: number };

/** Metric-key-looking identifiers that are not function calls. */
export function metricTokens(text: string): FormulaToken[] {
  const out: FormulaToken[] = [];
  const re = /[A-Za-z_][A-Za-z0-9_.]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const after = text.slice(m.index + m[0].length).match(/^\s*\(/);
    if (after) continue;
    out.push({ text: m[0].replace(/^metric\./, ""), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function unknownFunctions(text: string): string[] {
  const out = new Set<string>();
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1]!;
    if (!(FORMULA_FUNCTIONS as readonly string[]).includes(name)) out.add(name);
  }
  return [...out];
}

export function FormulaEditor({
  value,
  onChange,
  metrics,
  selfKey,
  refValues,
  serverIssues,
}: {
  value: string;
  onChange: (text: string, node: FormulaNode | null, error: string | null) => void;
  metrics: { key: string; name: string; description?: string | null | undefined }[];
  selfKey: string;
  refValues?: FormulaRefValue[] | undefined;
  serverIssues?: string[] | undefined;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [search, setSearch] = useState("");

  const known = useMemo(() => new Set(metrics.map((m) => m.key)), [metrics]);

  const parseError = useMemo(() => {
    if (!value.trim()) return null;
    try {
      parseFormula(value);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid expression.";
    }
  }, [value]);

  const badFns = useMemo(() => unknownFunctions(value), [value]);
  const badRefs = useMemo(
    () => metricTokens(value).filter((t) => !known.has(t.text) && t.text !== selfKey).map((t) => t.text),
    [value, known, selfKey],
  );
  const selfRef = useMemo(() => metricTokens(value).some((t) => t.text === selfKey && selfKey), [value, selfKey]);

  const emit = (text: string) => {
    if (!text.trim()) return onChange(text, null, null);
    try {
      onChange(text, parseFormula(text), null);
    } catch (e) {
      onChange(text, null, e instanceof Error ? e.message : "Invalid expression.");
    }
  };

  /** Insert at the caret rather than appending, so editing mid-expression works. */
  const insert = (snippet: string, caretOffset = snippet.length) => {
    const el = areaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const needsSpace = before && !/[\s(,]$/.test(before);
    const chunk = `${needsSpace ? " " : ""}${snippet}`;
    const next = before + chunk + value.slice(end);
    emit(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + chunk.length - (snippet.length - caretOffset);
      el?.setSelectionRange(pos, pos);
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = metrics.filter((m) => m.key !== selfKey);
    if (!q) return list.slice(0, 24);
    return list.filter((m) => m.key.includes(q) || m.name.toLowerCase().includes(q)).slice(0, 24);
  }, [metrics, search, selfKey]);

  const errors = [
    ...(parseError ? [parseError] : []),
    ...badFns.map((f) => `“${f}” is not an allowed function. Allowed: ${FORMULA_FUNCTIONS.join(", ")}.`),
    ...badRefs.map((r) => `No metric with the key “${r}”.`),
    ...(selfRef ? ["A metric cannot reference itself."] : []),
    ...(serverIssues ?? []),
  ];
  const unique = [...new Set(errors)];

  return (
    <div className="space-y-3">
      <div>
        <Textarea
          ref={areaRef}
          rows={3}
          spellCheck={false}
          className={cn(
            "font-mono text-xs",
            unique.length ? "border-destructive focus-visible:ring-destructive/40" : value.trim() ? "border-positive/60" : "",
          )}
          value={value}
          placeholder="safe_divide(salary_expense, total_revenue) * 100"
          onChange={(e) => emit(e.target.value)}
        />
        {unique.length ? (
          <ul className="mt-1.5 space-y-1">
            {unique.map((m) => (
              <li key={m} className="flex items-start gap-1.5 text-xs text-negative">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        ) : value.trim() ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-positive">
            <Check className="size-3.5" /> Expression is valid.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Combine metric keys with + − × ÷ and the helpers below. Click any chip to insert it at the cursor.
          </p>
        )}
      </div>

      {refValues?.length ? (
        <div className="rounded-lg border border-border bg-muted/40 p-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Inputs this period</p>
          <ul className="mt-1 space-y-1 text-xs">
            {refValues.map((r) => (
              <li key={r.key} className="flex items-baseline justify-between gap-2">
                <span className="truncate font-mono text-[11px] text-muted-foreground">{r.key}</span>
                <span className={cn("tabular", r.error && "text-negative")}>
                  {r.error ? r.error : formatValue(r.value, r.value_type, r.decimals, r.unit, true)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <FunctionSquare className="size-3.5" /> Helpers
        </p>
        <div className="flex flex-wrap gap-1">
          {FORMULA_FUNCTIONS.map((f) => {
            const help = FUNCTION_HELP[f];
            return (
              <button
                key={f}
                type="button"
                title={help ? `${help.signature} — ${help.description}` : f}
                onClick={() => insert(`${f}()`, f.length + 1)}
                className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-7 text-xs"
            placeholder="Search metrics to insert…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-1.5 max-h-44 space-y-1 overflow-auto pr-1">
          {filtered.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">No metric matches “{search}”.</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => insert(m.key)}
                className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent"
              >
                <span className="truncate">{m.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{m.key}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
