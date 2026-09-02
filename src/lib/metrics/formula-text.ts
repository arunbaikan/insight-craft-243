import { FORMULA_FUNCTIONS, type FormulaFn, type FormulaNode } from "./types";

/** Tiny recursive-descent parser: numbers, metric refs, + - * /, and safe functions. */
export function parseFormula(input: string): FormulaNode {
  const src = input.trim();
  if (!src) throw new Error("Write an expression, e.g. safe_divide(revenue, headcount).");
  let i = 0;

  const ws = () => {
    while (i < src.length && /\s/.test(src[i]!)) i++;
  };
  const peek = () => {
    ws();
    return src[i];
  };
  const eat = (ch: string) => {
    ws();
    if (src[i] !== ch) throw new Error(`Expected “${ch}” at position ${i + 1}.`);
    i++;
  };

  const parseExpr = (): FormulaNode => {
    let left = parseTerm();
    for (;;) {
      const c = peek();
      if (c === "+" || c === "-") {
        i++;
        left = { type: "binary", op: c, left, right: parseTerm() };
      } else return left;
    }
  };

  const parseTerm = (): FormulaNode => {
    let left = parseFactor();
    for (;;) {
      const c = peek();
      if (c === "*" || c === "/") {
        i++;
        left = { type: "binary", op: c, left, right: parseFactor() };
      } else return left;
    }
  };

  const parseFactor = (): FormulaNode => {
    const c = peek();
    if (c === undefined) throw new Error("The expression ends unexpectedly.");
    if (c === "(") {
      i++;
      const node = parseExpr();
      eat(")");
      return node;
    }
    if (c === "-") {
      i++;
      const node = parseFactor();
      return { type: "binary", op: "-", left: { type: "number", value: 0 }, right: node };
    }
    if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+/.exec(src.slice(i));
      if (!m) throw new Error(`Invalid number at position ${i + 1}.`);
      i += m[0].length;
      return { type: "number", value: Number(m[0]) };
    }
    const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i));
    if (!m) throw new Error(`Unexpected character “${c}” at position ${i + 1}.`);
    i += m[0].length;
    const name = m[0];
    if (peek() === "(") {
      i++;
      const args: FormulaNode[] = [];
      if (peek() !== ")") {
        for (;;) {
          args.push(parseExpr());
          if (peek() === ",") {
            i++;
            continue;
          }
          break;
        }
      }
      eat(")");
      if (!(FORMULA_FUNCTIONS as readonly string[]).includes(name))
        throw new Error(`“${name}” is not an allowed function. Allowed: ${FORMULA_FUNCTIONS.join(", ")}.`);
      return { type: "call", fn: name as FormulaFn, args };
    }
    return { type: "metric", key: name.replace(/^metric\./, "") };
  };

  const node = parseExpr();
  ws();
  if (i < src.length) throw new Error(`Unexpected text “${src.slice(i)}”.`);
  return node;
}

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
