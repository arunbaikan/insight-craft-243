/** Additive source metadata; the financial data itself remains company-scoped. */
export const FINCOMMAND_ENTITY = {
  entity: "fincommand_monthly_ledgers",
  label: "FinCommand trial balance",
  description: "Monthly trial-balance movements and closing balances from your company's current upload.",
  date_field: "month_date",
  default_value_field: "amount_base",
  supports_time_grain: true,
  fields: [
    ...["amount_base", "closing_balance_base", "debit", "credit"].map((name) => ({ name, label: name.replaceAll("_", " "), type: "number", measure: true, dimension: false })),
    ...["company_id", "financial_year_id", "ledger_name", "ledger_code", "section", "note_name", "treasury_type", "normal_bal"].map((name) => ({ name, label: name.replaceAll("_", " "), type: "text", measure: false, dimension: true })),
    { name: "month_date", label: "Month", type: "date", measure: false, dimension: true },
    { name: "note_no", label: "Note number", type: "number", measure: false, dimension: true },
  ],
};