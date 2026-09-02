export type EntityConfig = {
  table: string;
  dateField: string | null;
  /** Balance metrics take the latest snapshot rather than a cumulative sum. */
  snapshot?: boolean;
  /** Columns pulled for aggregation and filtering. */
  columns: string;
};

export const ENTITY_CONFIG: Record<string, EntityConfig> = {
  journal_lines: {
    table: "journal_lines",
    dateField: "txn_date",
    columns:
      "txn_date, amount_base, debit, credit, account_subtype, account_type, account_name, account_code, txn_type, cost_center, source, memo",
  },
  invoices: {
    table: "invoices",
    dateField: "invoice_date",
    columns:
      "invoice_date, total, balance_due, amount_base, status, days_overdue, customer_name, cost_center, source, id",
  },
  bills: {
    table: "bills",
    dateField: "bill_date",
    columns:
      "bill_date, total, balance_due, amount_base, status, days_overdue, vendor_name, cost_center, source, id",
  },
  payments: {
    table: "payments",
    dateField: "paid_on",
    columns: "paid_on, amount_base, direction, party_name, cost_center, source, id",
  },
  bank_balances: {
    table: "bank_balances",
    dateField: "as_of_date",
    snapshot: true,
    columns: "as_of_date, closing_balance_base, account_name, account_subtype, source",
  },
  budgets: {
    table: "budgets",
    dateField: "period_start",
    columns: "period_start, period_end, budget_type, account_subtype, amount_base, cost_center",
  },
  employees: {
    table: "employees",
    dateField: "hire_date",
    columns:
      "hire_date, separation_date, salary, tenure_years, department, gender, age_group, employment_type, location, is_active, id",
  },
  employee_events: {
    table: "employee_events",
    dateField: "event_date",
    columns: "event_date, event_type, department, location, id",
  },
  accounts: {
    table: "accounts",
    dateField: null,
    columns: "code, name, account_type, account_subtype, is_active, source, id",
  },
  customers: { table: "customers", dateField: null, columns: "name, credit_limit, is_active, source, id" },
  vendors: { table: "vendors", dateField: null, columns: "name, is_active, source, id" },
  items: { table: "items", dateField: null, columns: "name, category, unit_price, source, id" },
};
