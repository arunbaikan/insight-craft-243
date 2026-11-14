export type ZohoRow = Record<string, unknown>;
export const ZOHO_RESOURCES = [
  ["contacts", "/contacts", "contacts", "contact_id", "contact"],
  ["items", "/items", "items", "item_id", "item"],
  ["invoices", "/invoices", "invoices", "invoice_id", "invoice"],
  ["bills", "/bills", "bills", "bill_id", "bill"],
  ["customerpayments", "/customerpayments", "customerpayments", "payment_id", "payment"],
  ["vendorpayments", "/vendorpayments", "vendorpayments", "payment_id", "vendorpayment"],
  ["creditnotes", "/creditnotes", "creditnotes", "creditnote_id", "creditnote"],
  ["vendorcredits", "/vendorcredits", "vendorcredits", "vendor_credit_id", "vendor_credit"],
  ["expenses", "/expenses", "expenses", "expense_id", "expense"],
  ["estimates", "/estimates", "estimates", "estimate_id", "estimate"],
  ["salesorders", "/salesorders", "salesorders", "salesorder_id", "salesorder"],
  ["purchaseorders", "/purchaseorders", "purchaseorders", "purchaseorder_id", "purchaseorder"],
  ["projects", "/projects", "projects", "project_id", "project"],
  ["accounts", "/chartofaccounts", "chartofaccounts", "account_id", "chartofaccount"],
  ["journals", "/journals", "journals", "journal_id", "journal"],
  ["bankaccounts", "/bankaccounts", "bankaccounts", "account_id", "bankaccount"],
] as const;

export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(result) ? result : null;
}
const text = (v: unknown) => typeof v === "string" && v.length ? v : null;
const date = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

export function normalizeZoho(companyId: string, baseCurrency: string, resource: string, idKey: string, rows: ZohoRow[]) {
  const records = [], documents = [], masters = [], lines = [];
  for (const row of rows) {
    const sourceId = text(row[idKey]);
    if (!sourceId) throw new Error(`Zoho ${resource} record is missing ${idKey}; batch not saved.`);
    const identity = { company_id: companyId, resource, source_id: sourceId };
    records.push({ source_id: sourceId, payload: row, source_modified_at: text(row["last_modified_time"]) });
    if (["contacts", "items", "projects", "accounts", "bankaccounts"].includes(resource)) {
      masters.push({ ...identity, name: text(row["contact_name"] ?? row["name"] ?? row["account_name"] ?? row["project_name"]),
        kind: text(row["contact_type"] ?? row["account_type"]), status: text(row["status"]), currency: text(row["currency_code"]), payload: row });
      continue;
    }
    // Never infer a foreign currency rate, or treat an invoice gross total as revenue.
    const currency = text(row["currency_code"]);
    const explicitRate = numberOrNull(row["exchange_rate"]);
    const exchangeRate = explicitRate && explicitRate > 0 ? explicitRate : currency === baseCurrency ? 1 : null;
    const total = numberOrNull(row["total"] ?? row["amount"]);
    const balance = numberOrNull(row["balance"] ?? row["balance_due"]);
    const issues: string[] = [];
    if (!currency) issues.push("Currency unavailable");
    if (exchangeRate === null) issues.push("Base currency conversion unavailable");
    if (total === null) issues.push("Document total unavailable");
    documents.push({ ...identity, document_number: text(row["invoice_number"] ?? row["bill_number"] ?? row["payment_number"] ?? row["creditnote_number"] ?? row["estimate_number"] ?? row["salesorder_number"] ?? row["purchaseorder_number"] ?? row["journal_number"]),
      document_date: date(row["date"]), due_date: date(row["due_date"]), party_source_id: text(row["customer_id"] ?? row["vendor_id"]),
      party_name: text(row["customer_name"] ?? row["vendor_name"]), status: text(row["status"]), currency, base_currency: baseCurrency,
      exchange_rate: exchangeRate, total, subtotal: numberOrNull(row["sub_total"]), tax_total: numberOrNull(row["tax_total"]),
      balance_due: balance, total_base: total !== null && exchangeRate !== null ? total * exchangeRate : null,
      balance_base: balance !== null && exchangeRate !== null ? balance * exchangeRate : null,
      location_id: text(row["location_id"] ?? row["branch_id"]), project_id: text(row["project_id"]), normalization_issues: issues,
      fetched_at: new Date().toISOString() });
    if (Array.isArray(row["line_items"])) {
      for (const [index, raw] of row["line_items"].entries()) {
        if (!raw || typeof raw !== "object") throw new Error("Invalid Zoho line item");
        const line = raw as ZohoRow;
        lines.push({ ...identity, line_id: text(line["line_item_id"]) ?? String(index), item_id: text(line["item_id"]),
          account_id: text(line["account_id"]), description: text(line["description"] ?? line["name"]), quantity: numberOrNull(line["quantity"]),
          rate: numberOrNull(line["rate"]), amount: numberOrNull(line["item_total"] ?? line["amount"]), tax_id: text(line["tax_id"]),
          project_id: text(line["project_id"]), payload: line });
      }
    }
  }
  return { records, documents, masters, lines };
}