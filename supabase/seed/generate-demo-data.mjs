// Generates seed SQL for the ERP dashboard builder demo tenant.
const out = [];
const q = (v) =>
  v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;

// ---------- period grid: 24 months ending Aug 2026 ----------
const months = [];
for (let i = 23; i >= 0; i--) {
  const d = new Date(Date.UTC(2026, 7 - i, 1));
  months.push({
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    start: d.toISOString().slice(0, 10),
    end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
    label: d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
  });
}

// ---------- date_dim ----------
const dd = [];
for (let y = 2024; y <= 2026; y++) {
  for (let m = 1; m <= 12; m++) {
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= dim; d++) {
      const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dd.push(`(${q(key)},${d},${m},${Math.ceil(m / 3)},${y},${q(new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }))})`);
    }
  }
}
if (process.env.FULL) out.push(`INSERT INTO public.date_dim (date_key, day, month, quarter, year, month_label) VALUES\n${dd.join(",\n")};`);

// ---------- accounts ----------
const accounts = [
  ["4000", "Product Revenue", "income", "revenue"],
  ["4100", "Services Revenue", "income", "revenue"],
  ["4200", "Other Income", "income", "other_income"],
  ["5000", "Cost of Goods Sold", "expense", "cogs"],
  ["6000", "Salaries & Wages", "expense", "opex"],
  ["6050", "Employee Benefits", "expense", "opex"],
  ["6100", "Rent", "expense", "opex"],
  ["6200", "Marketing", "expense", "opex"],
  ["6300", "Software & Subscriptions", "expense", "opex"],
  ["6400", "Professional Fees", "expense", "opex"],
  ["6500", "Utilities", "expense", "opex"],
  ["6600", "Travel", "expense", "opex"],
  ["6700", "Depreciation", "expense", "depreciation"],
  ["6710", "Amortisation", "expense", "amortisation"],
  ["6800", "Interest Expense", "expense", "interest"],
  ["6900", "Income Tax", "expense", "tax"],
  ["1000", "Business Bank Account", "asset", "bank"],
  ["1010", "Savings Account", "asset", "bank"],
  ["1100", "Accounts Receivable", "asset", "current_asset"],
  ["1200", "Inventory", "asset", "inventory"],
  ["1500", "Equipment", "asset", "fixed_asset"],
  ["1600", "Capital Expenditure", "asset", "capex"],
  ["2000", "Accounts Payable", "liability", "current_liability"],
  ["2100", "Credit Card", "liability", "current_liability"],
  ["2500", "Bank Loan", "liability", "long_term_liability"],
  ["3000", "Share Capital", "equity", "equity"],
  ["3100", "Retained Earnings", "equity", "equity"],
];
const accIds = {};
let n = 0;
const uuid = (prefix, i) => `${prefix}${String(i).padStart(8 - prefix.length, "0")}-0000-4000-8000-${String(i).padStart(12, "0")}`;


out.push(
  `INSERT INTO public.accounts (id, source, source_id, code, name, account_type, account_subtype) VALUES\n` +
    accounts
      .map(([code, name, type, sub]) => {
        const id = uuid("a", ++n);
        accIds[code] = id;
        return `(${q(id)},'zoho_books',${q("acc-" + code)},${q(code)},${q(name)},${q(type)},${q(sub)})`;
      })
      .join(",\n") +
    ";",
);

// ---------- customers / vendors / items ----------
const customerNames = ["Nimbus Retail", "Harborline Logistics", "Verdant Foods", "Kestrel Media", "Orion Manufacturing", "Bluepeak Health", "Cedarworks Design", "Atlas Freight"];
const vendorNames = ["Rowan Office Park", "Lumen Cloud Services", "Pratt & Hale LLP", "Vertex Supplies", "Northwind Utilities", "Skyway Travel", "Brightline Ads"];
const itemDefs = [["Core Platform License", "Software", 4800], ["Implementation Services", "Services", 12000], ["Support Retainer", "Services", 2400], ["Hardware Bundle", "Hardware", 3200], ["Training Workshop", "Services", 1800], ["Data Migration", "Services", 5400]];
const custIds = {}, vendIds = {}, itemIds = {};
out.push(
  `INSERT INTO public.customers (id, source, source_id, name, credit_limit) VALUES\n` +
    customerNames.map((cn, i) => { const id = uuid("c", i + 1); custIds[cn] = id; return `(${q(id)},'zoho_books',${q("cust-" + (i + 1))},${q(cn)},${50000 + i * 15000})`; }).join(",\n") + ";",
);
out.push(
  `INSERT INTO public.vendors (id, source, source_id, name) VALUES\n` +
    vendorNames.map((vn, i) => { const id = uuid("d", i + 1); vendIds[vn] = id; return `(${q(id)},'zoho_books',${q("vend-" + (i + 1))},${q(vn)})`; }).join(",\n") + ";",
);
out.push(
  `INSERT INTO public.items (id, source, source_id, name, category, unit_price) VALUES\n` +
    itemDefs.map(([nm, cat, price], i) => { const id = uuid("e", i + 1); itemIds[nm] = id; return `(${q(id)},'zoho_books',${q("item-" + (i + 1))},${q(nm)},${q(cat)},${price})`; }).join(",\n") + ";",
);

// deterministic pseudo-random
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const wobble = (base, pct) => Math.round(base * (1 + (rnd() - 0.5) * pct));

const costCenters = ["CC-01", "CC-02", "CC-03"];

// ---------- journal lines ----------
const jl = [];
let jn = 0;
const pushLine = (date, code, amount, extra = {}) => {
  const [c, nm, type, sub] = accounts.find((a) => a[0] === code);
  jl.push(
    `(${q(uuid("f", ++jn))},'zoho_books',${q("jl-" + jn)},${q(date)},${q(accIds[c])},${q(c)},${q(nm)},${q(type)},${q(sub)},${amount},${amount > 0 ? amount : 0},${amount < 0 ? -amount : 0},${q(extra.txn_type ?? "journal")},${q(extra.customer_id ?? null)},${q(extra.vendor_id ?? null)},${q(extra.item_id ?? null)},${q(extra.cost_center ?? costCenters[jn % 3])},${q(extra.project_id ?? null)},${q(extra.memo ?? null)})`,
  );
};

let cumulativeCash = 420000;
const bank = [];
months.forEach((mo, idx) => {
  const growth = 1 + idx * 0.021;
  const mid = `${mo.y}-${String(mo.m).padStart(2, "0")}-15`;
  const eom = mo.end;
  const productRev = wobble(210000 * growth, 0.18);
  const serviceRev = wobble(96000 * growth, 0.22);
  const otherInc = wobble(6000, 0.4);
  pushLine(mid, "4000", -productRev, { txn_type: "invoice", customer_id: custIds[customerNames[idx % 8]], item_id: itemIds["Core Platform License"] });
  pushLine(mid, "4100", -serviceRev, { txn_type: "invoice", customer_id: custIds[customerNames[(idx + 3) % 8]], item_id: itemIds["Implementation Services"] });
  pushLine(eom, "4200", -otherInc, { txn_type: "journal" });

  const cogs = wobble(productRev * 0.36, 0.1);
  const salaries = wobble(118000 * (1 + idx * 0.012), 0.05);
  const benefits = Math.round(salaries * 0.11);
  const rent = 18500;
  const marketing = wobble(24000 * growth, 0.35);
  const software = wobble(9800, 0.15);
  const prof = wobble(7400, 0.5);
  const utilities = wobble(3100, 0.2);
  const travel = wobble(6200, 0.6);
  pushLine(mid, "5000", cogs, { txn_type: "bill", vendor_id: vendIds["Vertex Supplies"] });
  pushLine(eom, "6000", salaries, { txn_type: "payroll", memo: "Monthly payroll" });
  pushLine(eom, "6050", benefits, { txn_type: "payroll" });
  pushLine(mo.start, "6100", rent, { txn_type: "bill", vendor_id: vendIds["Rowan Office Park"] });
  pushLine(mid, "6200", marketing, { txn_type: "bill", vendor_id: vendIds["Brightline Ads"] });
  pushLine(mid, "6300", software, { txn_type: "bill", vendor_id: vendIds["Lumen Cloud Services"] });
  pushLine(mid, "6400", prof, { txn_type: "bill", vendor_id: vendIds["Pratt & Hale LLP"] });
  pushLine(eom, "6500", utilities, { txn_type: "bill", vendor_id: vendIds["Northwind Utilities"] });
  pushLine(mid, "6600", travel, { txn_type: "expense", vendor_id: vendIds["Skyway Travel"] });
  pushLine(eom, "6700", 7200, { txn_type: "journal" });
  pushLine(eom, "6710", 2100, { txn_type: "journal" });
  pushLine(eom, "6800", 4300, { txn_type: "journal" });
  const pretax = productRev + serviceRev + otherInc - (cogs + salaries + benefits + rent + marketing + software + prof + utilities + travel + 7200 + 2100 + 4300);
  const tax = Math.max(0, Math.round(pretax * 0.21));
  pushLine(eom, "6900", tax, { txn_type: "journal" });

  // balance sheet movements
  const netCash = Math.round(pretax * 0.62);
  cumulativeCash += netCash;
  pushLine(eom, "1000", Math.round(netCash * 0.8), { txn_type: "journal", memo: "Net cash movement" });
  pushLine(eom, "1010", Math.round(netCash * 0.2), { txn_type: "journal" });
  pushLine(eom, "1100", wobble(9000, 1.2), { txn_type: "journal", memo: "AR movement" });
  pushLine(eom, "1200", wobble(3500, 1.4), { txn_type: "journal", memo: "Inventory movement" });
  pushLine(eom, "1500", 5200, { txn_type: "journal" });
  pushLine(eom, "1600", wobble(9000, 1.0), { txn_type: "journal", memo: "Capex" });
  pushLine(eom, "2000", -wobble(6000, 1.2), { txn_type: "journal", memo: "AP movement" });
  pushLine(eom, "2100", -wobble(1800, 1.0), { txn_type: "journal" });
  pushLine(eom, "2500", 4200, { txn_type: "journal", memo: "Loan repayment" });
  pushLine(eom, "3100", -Math.round(pretax - tax), { txn_type: "journal", memo: "Retained earnings" });
  if (idx === 0) pushLine(mo.start, "3000", -600000, { txn_type: "journal", memo: "Opening share capital" });

  bank.push(
    `(${q(uuid("b", idx * 2 + 1))},'zoho_books',${q(accIds["1000"])},'Business Bank Account','bank',${q(eom)},${Math.round(cumulativeCash * 0.78)})`,
    `(${q(uuid("b", idx * 2 + 2))},'zoho_books',${q(accIds["1010"])},'Savings Account','bank',${q(eom)},${Math.round(cumulativeCash * 0.22)})`,
  );
});
if (process.env.FULL) out.push(
  `INSERT INTO public.journal_lines (id, source, source_id, txn_date, account_id, account_code, account_name, account_type, account_subtype, amount_base, debit, credit, txn_type, customer_id, vendor_id, item_id, cost_center, project_id, memo) VALUES\n${jl.join(",\n")};`,
);
if (process.env.FULL) out.push(`INSERT INTO public.bank_balances (id, source, account_id, account_name, account_subtype, as_of_date, closing_balance_base) VALUES\n${bank.join(",\n")};`);

// ---------- invoices / bills / payments ----------
const invs = [], bils = [], pays = [];
const today = new Date(Date.UTC(2026, 8, 2));
let ii = 0;
months.slice(-9).forEach((mo, mi) => {
  for (let k = 0; k < 6; k++) {
    ii++;
    const cn = customerNames[(mi * 6 + k) % 8];
    const invDate = `${mo.y}-${String(mo.m).padStart(2, "0")}-${String(3 + k * 4).padStart(2, "0")}`;
    const due = new Date(Date.UTC(mo.y, mo.m - 1, 3 + k * 4 + 30)).toISOString().slice(0, 10);
    const total = wobble(38000, 0.8);
    const settled = mi < 6 || rnd() > 0.45;
    const balance = settled ? 0 : Math.round(total * (rnd() > 0.5 ? 1 : 0.5));
    const overdue = Math.max(0, Math.round((today - new Date(due)) / 86400000));
    invs.push(
      `(${q(uuid("1", ii))},'zoho_books',${q("INV-" + (1000 + ii))},${q(custIds[cn])},${q(cn)},${q(invDate)},${q(due)},${total},${balance},${total},${q(balance === 0 ? "paid" : overdue > 0 ? "overdue" : "open")},${balance === 0 ? 0 : overdue},${q(costCenters[ii % 3])})`,
    );
    pays.push(`(${q(uuid("2", ii))},'zoho_books',${q("PAY-" + (2000 + ii))},'in',${q(due)},${total - balance},${q(custIds[cn])},${q(cn)},${q(uuid("1", ii))},${q(costCenters[ii % 3])})`);
  }
});
let bi = 0;
months.slice(-9).forEach((mo, mi) => {
  for (let k = 0; k < 4; k++) {
    bi++;
    const vn = vendorNames[(mi * 4 + k) % 7];
    const billDate = `${mo.y}-${String(mo.m).padStart(2, "0")}-${String(5 + k * 6).padStart(2, "0")}`;
    const due = new Date(Date.UTC(mo.y, mo.m - 1, 5 + k * 6 + 30)).toISOString().slice(0, 10);
    const total = wobble(21000, 0.9);
    const settled = mi < 6 || rnd() > 0.5;
    const balance = settled ? 0 : total;
    const overdue = Math.max(0, Math.round((today - new Date(due)) / 86400000));
    bils.push(
      `(${q(uuid("3", bi))},'zoho_books',${q("BILL-" + (3000 + bi))},${q(vendIds[vn])},${q(vn)},${q(billDate)},${q(due)},${total},${balance},${total},${q(balance === 0 ? "paid" : overdue > 0 ? "overdue" : "open")},${balance === 0 ? 0 : overdue},${q(costCenters[bi % 3])})`,
    );
    pays.push(`(${q(uuid("4", bi))},'zoho_books',${q("VPAY-" + (4000 + bi))},'out',${q(due)},${total - balance},${q(vendIds[vn])},${q(vn)},${q(uuid("3", bi))},${q(costCenters[bi % 3])})`);
  }
});
if (process.env.FULL) out.push(`INSERT INTO public.invoices (id, source, source_id, customer_id, customer_name, invoice_date, due_date, total, balance_due, amount_base, status, days_overdue, cost_center) VALUES\n${invs.join(",\n")};`);
if (process.env.FULL) out.push(`INSERT INTO public.bills (id, source, source_id, vendor_id, vendor_name, bill_date, due_date, total, balance_due, amount_base, status, days_overdue, cost_center) VALUES\n${bils.join(",\n")};`);
if (process.env.FULL) out.push(`INSERT INTO public.payments (id, source, source_id, direction, paid_on, amount_base, party_id, party_name, applied_to_id, cost_center) VALUES\n${pays.join(",\n")};`);

// ---------- budgets ----------
const bud = [];
months.forEach((mo, idx) => {
  const growth = 1 + idx * 0.021;
  bud.push(`(${q(uuid("7", idx * 2 + 1))},${q(mo.start)},${q(mo.end)},'revenue','revenue',${Math.round(320000 * growth)},NULL)`);
  bud.push(`(${q(uuid("7", idx * 2 + 2))},${q(mo.start)},${q(mo.end)},'expense','opex',${Math.round(215000 * growth)},NULL)`);
});
if (process.env.FULL) out.push(`INSERT INTO public.budgets (id, period_start, period_end, budget_type, account_subtype, amount_base, cost_center) VALUES\n${bud.join(",\n")};`);

// ---------- connections + mappings ----------
out.push(`INSERT INTO public.connections (source, display_name, org_identifier, status, last_cursor, last_success_at, records_pulled) VALUES
('zoho_books','Zoho Books — Acme Holdings','org-8827341','connected','2026-09-02T07:30:00Z','2026-09-02T07:31:12Z',18422),
('qbo','QuickBooks Online — Acme US','realm-193882910','connected','2026-09-02T07:00:00Z','2026-09-02T07:02:48Z',9310);`);
out.push(
  `INSERT INTO public.account_mappings (source, source_account_id, source_account_name, canonical_type, canonical_subtype, confidence) VALUES\n` +
    accounts.map(([code, name, type, sub], i) => `('zoho_books',${q("acc-" + code)},${q(name)},${q(type)},${q(sub)},${i % 9 === 0 ? "'needs_review'" : "'auto'"})`).join(",\n") +
    ";",
);

// ---------- entity registry ----------
const f = (name, label, type, opts = {}) => ({ name, label, type, dimension: !!opts.dimension, measure: !!opts.measure, values: opts.values });
const entities = [
  {
    entity: "journal_lines", label: "Journal Lines", description: "The general-ledger fact table. Use for income, expenses and balances.",
    date_field: "txn_date", default_value_field: "amount_base", supports_time_grain: true, sort_order: 1,
    fields: [
      f("amount_base", "Amount", "number", { measure: true }), f("debit", "Debit", "number", { measure: true }), f("credit", "Credit", "number", { measure: true }),
      f("account_subtype", "Account subtype", "enum", { dimension: true, values: ["revenue", "other_income", "cogs", "opex", "depreciation", "amortisation", "interest", "tax", "bank", "current_asset", "inventory", "fixed_asset", "capex", "current_liability", "long_term_liability", "equity"] }),
      f("account_type", "Account type", "enum", { dimension: true, values: ["income", "expense", "asset", "liability", "equity"] }),
      f("account_name", "Account name", "string", { dimension: true }), f("account_code", "Account code", "string", { dimension: true }),
      f("txn_type", "Transaction type", "string", { dimension: true }), f("cost_center", "Cost centre", "enum", { dimension: true, values: costCenters }),
      f("source", "Source system", "enum", { dimension: true, values: ["zoho_books", "qbo"] }), f("memo", "Memo", "string"),
    ],
  },
  {
    entity: "invoices", label: "Invoices", description: "Customer invoices, balances and ageing.", date_field: "invoice_date", default_value_field: "balance_due", supports_time_grain: true, sort_order: 2,
    fields: [f("total", "Total", "number", { measure: true }), f("balance_due", "Balance due", "number", { measure: true }), f("amount_base", "Amount", "number", { measure: true }), f("days_overdue", "Days overdue", "number", { measure: true }), f("status", "Status", "enum", { dimension: true, values: ["open", "overdue", "paid"] }), f("customer_name", "Customer", "string", { dimension: true }), f("cost_center", "Cost centre", "enum", { dimension: true, values: costCenters }), f("source", "Source system", "enum", { dimension: true, values: ["zoho_books", "qbo"] })],
  },
  {
    entity: "bills", label: "Bills", description: "Vendor bills and payables ageing.", date_field: "bill_date", default_value_field: "balance_due", supports_time_grain: true, sort_order: 3,
    fields: [f("total", "Total", "number", { measure: true }), f("balance_due", "Balance due", "number", { measure: true }), f("amount_base", "Amount", "number", { measure: true }), f("days_overdue", "Days overdue", "number", { measure: true }), f("status", "Status", "enum", { dimension: true, values: ["open", "overdue", "paid"] }), f("vendor_name", "Vendor", "string", { dimension: true }), f("cost_center", "Cost centre", "enum", { dimension: true, values: costCenters }), f("source", "Source system", "enum", { dimension: true, values: ["zoho_books", "qbo"] })],
  },
  {
    entity: "payments", label: "Payments", description: "Money in and money out.", date_field: "paid_on", default_value_field: "amount_base", supports_time_grain: true, sort_order: 4,
    fields: [f("amount_base", "Amount", "number", { measure: true }), f("direction", "Direction", "enum", { dimension: true, values: ["in", "out"] }), f("party_name", "Party", "string", { dimension: true }), f("cost_center", "Cost centre", "enum", { dimension: true, values: costCenters })],
  },
  {
    entity: "bank_balances", label: "Bank Balances", description: "Closing balance snapshots per bank account.", date_field: "as_of_date", default_value_field: "closing_balance_base", supports_time_grain: true, sort_order: 5,
    fields: [f("closing_balance_base", "Closing balance", "number", { measure: true }), f("account_subtype", "Account subtype", "enum", { dimension: true, values: ["bank"] }), f("account_name", "Account", "string", { dimension: true }), f("source", "Source system", "enum", { dimension: true, values: ["zoho_books", "qbo"] })],
  },
  {
    entity: "budgets", label: "Budgets", description: "Planned revenue and expense per period.", date_field: "period_start", default_value_field: "amount_base", supports_time_grain: true, sort_order: 6,
    fields: [f("amount_base", "Budget amount", "number", { measure: true }), f("budget_type", "Budget type", "enum", { dimension: true, values: ["revenue", "expense"] }), f("account_subtype", "Account subtype", "enum", { dimension: true, values: ["revenue", "opex", "cogs"] })],
  },
  {
    entity: "customers", label: "Customers", description: "Customer master records.", date_field: null, default_value_field: "credit_limit", supports_time_grain: false, sort_order: 7,
    fields: [f("credit_limit", "Credit limit", "number", { measure: true }), f("name", "Name", "string", { dimension: true }), f("is_active", "Active", "boolean", { dimension: true })],
  },
  {
    entity: "vendors", label: "Vendors", description: "Vendor master records.", date_field: null, default_value_field: null, supports_time_grain: false, sort_order: 8,
    fields: [f("name", "Name", "string", { dimension: true }), f("is_active", "Active", "boolean", { dimension: true })],
  },
  {
    entity: "items", label: "Items", description: "Products and services.", date_field: null, default_value_field: "unit_price", supports_time_grain: false, sort_order: 9,
    fields: [f("unit_price", "Unit price", "number", { measure: true }), f("category", "Category", "string", { dimension: true }), f("name", "Name", "string", { dimension: true })],
  },
  {
    entity: "employees", label: "Employees", description: "HR master records sourced from the ERP HR module.", date_field: "hire_date", default_value_field: "salary", supports_time_grain: false, sort_order: 10,
    fields: [f("salary", "Salary", "number", { measure: true }), f("tenure_years", "Tenure (years)", "number", { measure: true }), f("department", "Department", "string", { dimension: true }), f("gender", "Gender", "enum", { dimension: true, values: ["Male", "Female"] }), f("age_group", "Age group", "enum", { dimension: true, values: ["25", "25-35", "35-45", "45-55", "55-65", "65-75", "75-85"] }), f("employment_type", "Employment type", "enum", { dimension: true, values: ["Full Time", "Part Time"] }), f("location", "Location", "string", { dimension: true }), f("is_active", "Active", "boolean", { dimension: true })],
  },
  {
    entity: "employee_events", label: "Hires & Separations", description: "HR joiner and leaver events.", date_field: "event_date", default_value_field: "id", supports_time_grain: true, sort_order: 11,
    fields: [f("event_type", "Event type", "enum", { dimension: true, values: ["hire", "separation"] }), f("department", "Department", "string", { dimension: true }), f("location", "Location", "string", { dimension: true })],
  },
];
out.push(
  `INSERT INTO public.entity_registry (entity, label, description, date_field, default_value_field, supports_time_grain, fields, sort_order) VALUES\n` +
    entities.map((e) => `(${q(e.entity)},${q(e.label)},${q(e.description)},${q(e.date_field)},${q(e.default_value_field)},${e.supports_time_grain},${j(e.fields)},${e.sort_order})`).join(",\n") +
    ";",
);

// ---------- HR data ----------
const departments = ["Department 01", "Department 02", "Department 03", "Department 04", "Department 05", "Department 06"];
const locations = ["Amsterdam", "Berlin", "London", "Madrid", "Warsaw", "Lisbon"];
const ageGroups = ["25", "25-35", "35-45", "45-55", "55-65", "65-75"];
const firstNames = ["Ava", "Noah", "Mia", "Liam", "Ivy", "Ezra", "Nora", "Jonas", "Elif", "Marek", "Sofia", "Tomas", "Lena", "Rafa", "Anja", "Piet"];
const lastNames = ["Bakker", "Novak", "Fischer", "Silva", "Kowalski", "Ahmed", "Rossi", "Dupont", "Larsen", "Ferreira"];
const emps = [], evts = [];
let ev = 0;
for (let i = 1; i <= 672; i++) {
  const dept = departments[Math.floor(rnd() * departments.length)];
  const loc = locations[Math.floor(rnd() * locations.length)];
  const gender = rnd() < 0.44 ? "Male" : "Female";
  const empType = rnd() < 0.89 ? "Full Time" : "Part Time";
  const ageGroup = ageGroups[Math.floor(rnd() * ageGroups.length)];
  const hireYear = 2014 + Math.floor(rnd() * 12);
  const hireDate = `${hireYear}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 27)).padStart(2, "0")}`;
  const active = i <= 670 || rnd() > 0.5;
  const sepDate = active ? null : "2026-05-18";
  const salary = Math.round((48000 + rnd() * 62000) / 100) * 100;
  const tenure = Math.round((2026 - hireYear + rnd()) * 10) / 10;
  const id = uuid("9", i);
  emps.push(`(${q(id)},${q(firstNames[i % firstNames.length] + " " + lastNames[i % lastNames.length])},${q(dept)},${q(gender)},${q(ageGroup)},${q(empType)},${q(loc)},${salary},${tenure},${q(hireDate)},${q(sepDate)},${active})`);
  if (hireYear === 2026) {
    ev++;
    evts.push(`(${q(uuid("8", ev))},'hire',${q(hireDate)},${q(id)},${q(dept)},${q(loc)})`);
  }
}
// separations spread across the current year so turnover trends read well
for (let k = 1; k <= 62; k++) {
  ev++;
  const m = 1 + Math.floor(rnd() * 8);
  evts.push(`(${q(uuid("8", ev))},'separation',${q(`2026-${String(m).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 27)).padStart(2, "0")}`)},NULL,${q(departments[Math.floor(rnd() * 6)])},${q(locations[Math.floor(rnd() * 6)])})`);
}
if (process.env.FULL) out.push(`INSERT INTO public.employees (id, name, department, gender, age_group, employment_type, location, salary, tenure_years, hire_date, separation_date, is_active) VALUES\n${emps.join(",\n")};`);
if (process.env.FULL) out.push(`INSERT INTO public.employee_events (id, event_type, event_date, employee_id, department, location) VALUES\n${evts.join(",\n")};`);


// ---------- metric definitions ----------
const M = (o) => ({
  key: o.key, name: o.name, description: o.description ?? null, metric_kind: o.kind, source_entity: o.entity ?? null,
  aggregation: o.agg ?? null, value_field: o.field ?? null, filters: o.filters ?? {}, group_by: o.group_by ?? null,
  time_grain: o.grain ?? "month", formula: o.formula ?? null, comparison: o.comparison ?? "prior_period",
  sign_convention: o.sign ?? "natural", value_type: o.value_type ?? "currency", unit: o.unit ?? null,
  decimals: o.decimals ?? 0, scale: o.scale ?? 1, target_value: o.target ?? null, thresholds: o.thresholds ?? null, is_system: true,
});
const cond = (field, operator, value) => ({ field, operator, value });
const flt = (...conditions) => ({ op: "and", conditions });
const met = (key) => ({ type: "metric", key });
const num = (v) => ({ type: "number", value: v });
const bin = (op, left, right) => ({ type: "binary", op, left, right });
const call = (fn, ...args) => ({ type: "call", fn, args });

const metrics = [
  M({ key: "total_income", name: "Total Income", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["revenue", "other_income"])), sign: "invert", description: "All revenue recognised in the period." }),
  M({ key: "total_expenses", name: "Total Expenses", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["cogs", "opex", "depreciation", "amortisation", "interest", "tax"])), description: "All operating and non-operating costs." }),
  M({ key: "monthly_expenses", name: "Monthly Expenses", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["cogs", "opex"])), description: "Cost of sales plus operating expenses." }),
  M({ key: "salaries", name: "Salaries & Benefits", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_code", "in", ["6000", "6050"])), description: "Payroll cost including benefits." }),
  M({ key: "marketing_spend", name: "Marketing Spend", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_code", "=", "6200")) }),
  M({ key: "expense_by_category", name: "Expense by Category", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["cogs", "opex"])), group_by: "account_name", description: "Operating spend broken down by account." }),
  M({ key: "income_by_source", name: "Income by Source System", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["revenue", "other_income"])), group_by: "source", sign: "invert" }),
  M({ key: "net_profit", name: "Net Profit", kind: "formula", formula: bin("-", met("total_income"), met("total_expenses")), description: "Total income minus total expenses." }),
  M({ key: "net_profit_margin", name: "Net Profit Margin", kind: "formula", formula: bin("*", call("safe_divide", met("net_profit"), met("total_income")), num(100)), value_type: "percent", decimals: 1, target: 12, thresholds: { good: 12, warn: 8, direction: "higher_is_better" } }),
  M({ key: "gross_profit", name: "Gross Profit", kind: "formula", formula: bin("-", met("total_income"), met("cost_of_sales")) }),
  M({ key: "cost_of_sales", name: "Cost of Sales", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "=", "cogs")) }),
  M({ key: "gross_margin", name: "Gross Margin", kind: "formula", formula: bin("*", call("safe_divide", met("gross_profit"), met("total_income")), num(100)), value_type: "percent", decimals: 1, target: 60 }),
  M({ key: "cash_at_bank", name: "Cash at Bank", kind: "balance", entity: "bank_balances", agg: "sum", field: "closing_balance_base", filters: flt(cond("account_subtype", "=", "bank")), description: "Latest closing balance across all bank accounts." }),
  M({ key: "net_cash_outflow", name: "Net Cash Outflow", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["cogs", "opex", "interest", "tax"])) }),
  M({ key: "cash_burn_rate", name: "Cash Burn Rate", kind: "formula", formula: call("safe_divide", call("sum_over", met("net_cash_outflow"), num(3)), num(3)), description: "Average monthly cash outflow over the last three months." }),
  M({ key: "solvency_months", name: "Solvency (months)", kind: "formula", formula: call("safe_divide", met("cash_at_bank"), met("cash_burn_rate")), value_type: "months", decimals: 1, target: 6, thresholds: { good: 6, warn: 3, direction: "higher_is_better" } }),
  M({ key: "accounts_receivable", name: "Accounts Receivable", kind: "balance", entity: "invoices", agg: "sum", field: "balance_due", filters: flt(cond("status", "!=", "paid")) }),
  M({ key: "accounts_payable", name: "Accounts Payable", kind: "balance", entity: "bills", agg: "sum", field: "balance_due", filters: flt(cond("status", "!=", "paid")) }),
  M({ key: "debtors_over_60", name: "Debtors over 60 days", kind: "balance", entity: "invoices", agg: "sum", field: "balance_due", filters: flt(cond("status", "!=", "paid"), cond("days_overdue", ">", 60)) }),
  M({ key: "debtors_by_customer", name: "Debtors by Customer", kind: "balance", entity: "invoices", agg: "sum", field: "balance_due", filters: flt(cond("status", "!=", "paid")), group_by: "customer_name" }),
  M({ key: "creditors_by_vendor", name: "Creditors by Vendor", kind: "balance", entity: "bills", agg: "sum", field: "balance_due", filters: flt(cond("status", "!=", "paid")), group_by: "vendor_name" }),
  M({ key: "current_assets", name: "Current Assets", kind: "balance", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["bank", "current_asset", "inventory"])) }),
  M({ key: "inventory", name: "Inventory", kind: "balance", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "=", "inventory")) }),
  M({ key: "current_liabilities", name: "Current Liabilities", kind: "balance", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "=", "current_liability")), sign: "invert" }),
  M({ key: "total_liabilities", name: "Total Liabilities", kind: "balance", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["current_liability", "long_term_liability"])), sign: "invert" }),
  M({ key: "total_equity", name: "Total Equity", kind: "balance", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "=", "equity")), sign: "invert" }),
  M({ key: "quick_ratio", name: "Quick Ratio", kind: "formula", formula: call("safe_divide", bin("-", met("current_assets"), met("inventory")), met("current_liabilities")), value_type: "ratio", decimals: 2, target: 1, thresholds: { good: 1, warn: 0.8, direction: "higher_is_better" } }),
  M({ key: "current_ratio", name: "Current Ratio", kind: "formula", formula: call("safe_divide", met("current_assets"), met("current_liabilities")), value_type: "ratio", decimals: 2, target: 3, thresholds: { good: 3, warn: 1.5, direction: "higher_is_better" } }),
  M({ key: "debt_to_equity", name: "Debt to Equity", kind: "formula", formula: call("safe_divide", met("total_liabilities"), met("total_equity")), value_type: "ratio", decimals: 2, target: 1, thresholds: { good: 1, warn: 2, direction: "lower_is_better" } }),
  M({ key: "roe", name: "Return on Equity", kind: "formula", formula: bin("*", call("safe_divide", met("net_profit"), met("total_equity")), num(100)), value_type: "percent", decimals: 1, target: 15 }),
  M({ key: "income_budget", name: "Income Budget", kind: "aggregate", entity: "budgets", agg: "sum", field: "amount_base", filters: flt(cond("budget_type", "=", "revenue")) }),
  M({ key: "expense_budget", name: "Expense Budget", kind: "aggregate", entity: "budgets", agg: "sum", field: "amount_base", filters: flt(cond("budget_type", "=", "expense")) }),
  M({ key: "pct_of_income_budget", name: "% of Income Budget", kind: "formula", formula: bin("*", call("safe_divide", met("total_income"), met("income_budget")), num(100)), value_type: "percent", decimals: 0, target: 100 }),
  M({ key: "pct_of_expense_budget", name: "% of Expense Budget", kind: "formula", formula: bin("*", call("safe_divide", met("total_expenses"), met("expense_budget")), num(100)), value_type: "percent", decimals: 0, target: 100, thresholds: { good: 95, warn: 105, direction: "lower_is_better" } }),
  M({ key: "revenue_growth_yoy", name: "Revenue Growth YoY", kind: "formula", formula: call("percent_change", met("total_income"), num(12)), value_type: "percent", decimals: 1, comparison: "prior_year" }),
  M({ key: "ebitda", name: "EBITDA", kind: "formula", formula: bin("+", met("net_profit"), bin("+", met("interest_expense"), bin("+", met("tax_expense"), met("depreciation_amortisation")))) }),
  M({ key: "interest_expense", name: "Interest Expense", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "=", "interest")) }),
  M({ key: "tax_expense", name: "Tax Expense", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "=", "tax")) }),
  M({ key: "depreciation_amortisation", name: "Depreciation & Amortisation", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "in", ["depreciation", "amortisation"])) }),
  M({ key: "capex", name: "Capital Expenditure", kind: "aggregate", entity: "journal_lines", agg: "sum", field: "amount_base", filters: flt(cond("account_subtype", "=", "capex")) }),
  M({ key: "operating_cash_flow", name: "Operating Cash Flow", kind: "formula", formula: bin("+", met("net_profit"), met("depreciation_amortisation")) }),
  M({ key: "free_cash_flow", name: "Free Cash Flow", kind: "formula", formula: bin("-", met("operating_cash_flow"), met("capex")) }),
  M({ key: "cash_in", name: "Cash In", kind: "aggregate", entity: "payments", agg: "sum", field: "amount_base", filters: flt(cond("direction", "=", "in")) }),
  M({ key: "cash_out", name: "Cash Out", kind: "aggregate", entity: "payments", agg: "sum", field: "amount_base", filters: flt(cond("direction", "=", "out")) }),
  M({ key: "invoice_count", name: "Invoice Count", kind: "aggregate", entity: "invoices", agg: "count", field: "id", filters: {}, value_type: "number" }),
  M({ key: "avg_invoice_value", name: "Average Invoice Value", kind: "aggregate", entity: "invoices", agg: "avg", field: "total", filters: {} }),
  M({ key: "headcount", name: "Headcount", kind: "balance", entity: "employees", agg: "count", field: "id", filters: flt(cond("is_active", "=", true)), value_type: "number", comparison: "none" }),
  M({ key: "new_hires_ytd", name: "New Hires (YTD)", kind: "aggregate", entity: "employee_events", agg: "count", field: "id", filters: flt(cond("event_type", "=", "hire")), value_type: "number" }),
  M({ key: "separations", name: "Separations", kind: "aggregate", entity: "employee_events", agg: "count", field: "id", filters: flt(cond("event_type", "=", "separation")), value_type: "number" }),
  M({ key: "turnover_rate", name: "Turnover Rate", kind: "formula", formula: bin("*", call("safe_divide", met("separations"), met("headcount")), num(100)), value_type: "percent", decimals: 0 }),
  M({ key: "average_tenure", name: "Average Tenure", kind: "balance", entity: "employees", agg: "avg", field: "tenure_years", filters: flt(cond("is_active", "=", true)), value_type: "number", unit: "yrs", decimals: 1, comparison: "none" }),
  M({ key: "average_salary", name: "Average Salary", kind: "balance", entity: "employees", agg: "avg", field: "salary", filters: flt(cond("is_active", "=", true)), comparison: "none" }),
  M({ key: "employees_by_department", name: "Employees by Department", kind: "balance", entity: "employees", agg: "count", field: "id", filters: flt(cond("is_active", "=", true)), group_by: "department", value_type: "number", comparison: "none" }),
  M({ key: "employees_by_gender", name: "Employees by Gender", kind: "balance", entity: "employees", agg: "count", field: "id", filters: flt(cond("is_active", "=", true)), group_by: "gender", value_type: "number", comparison: "none" }),
  M({ key: "employees_by_age_group", name: "Employees by Age Group", kind: "balance", entity: "employees", agg: "count", field: "id", filters: flt(cond("is_active", "=", true)), group_by: "age_group", value_type: "number", comparison: "none" }),
  M({ key: "employees_by_type", name: "Employees by Employment Type", kind: "balance", entity: "employees", agg: "count", field: "id", filters: flt(cond("is_active", "=", true)), group_by: "employment_type", value_type: "number", comparison: "none" }),
  M({ key: "headcount_by_location", name: "Headcount by Location", kind: "balance", entity: "employees", agg: "count", field: "id", filters: flt(cond("is_active", "=", true)), group_by: "location", value_type: "number", comparison: "none" }),
  M({ key: "salary_pct_of_revenue", name: "Salary as % of Revenue", kind: "formula", formula: bin("*", call("safe_divide", met("salaries"), met("total_income")), num(100)), value_type: "percent", decimals: 1, target: 35, thresholds: { good: 35, warn: 45, direction: "lower_is_better" } }),
];

out.push(
  `INSERT INTO public.metric_definitions (key, name, description, metric_kind, source_entity, aggregation, value_field, filters, group_by, time_grain, formula, comparison, sign_convention, value_type, unit, decimals, scale, target_value, thresholds, is_system) VALUES\n` +
    metrics
      .map((m) => `(${q(m.key)},${q(m.name)},${q(m.description)},${q(m.metric_kind)},${q(m.source_entity)},${q(m.aggregation)},${q(m.value_field)},${j(m.filters)},${q(m.group_by)},${q(m.time_grain)},${m.formula ? j(m.formula) : "NULL"},${q(m.comparison)},${q(m.sign_convention)},${q(m.value_type)},${q(m.unit)},${m.decimals},${m.scale},${m.target_value ?? "NULL"},${m.thresholds ? j(m.thresholds) : "NULL"},true)`)
      .join(",\n") + ";",
);

// ---------- roles ----------
out.push(`INSERT INTO public.roles (id, name, permissions) VALUES
('90000001-0000-4000-8000-000000000001','Finance Lead','["manage_metrics","build_dashboards","view_dashboards"]'::jsonb),
('90000001-0000-4000-8000-000000000002','Department Manager','["build_dashboards","view_dashboards"]'::jsonb),
('90000001-0000-4000-8000-000000000003','Executive','["view_dashboards"]'::jsonb);`);

// ---------- dashboards (templates) ----------
const dashUuid = (i) => `d0000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const wUuid = (d, i) => `e0000000-0000-4000-8000-${String(d * 100 + i).padStart(12, "0")}`;
const series = (...defs) => ({ series: defs.map(([metric_key, label, color, extra = {}]) => ({ metric_key, label, color, ...extra })) });
const PALETTE = ["#1B3A6B", "#29A3E0", "#7FD4E8", "#F2A93B", "#E4572E", "#4C9F70"];

const HR = ["#3B6FE0", "#1BB6A0", "#F58634", "#8B5CF6", "#22B8CF", "#2F5FD0"];

const templates = [
  {
    // Reference 1 — "Financial Dashboard"
    name: "Financial Dashboard", slug: "financial-dashboard", description: "Headline KPIs vs previous month, profit margin gauge, income vs expenses and budget attainment.", period: "last_12m",
    filters: [["cost_center", "Cost centre", "select", "cost_center", costCenters.map((c) => ({ value: c, label: c }))], ["source", "Source system", "select", "source", [{ value: "zoho_books", label: "Zoho Books" }, { value: "qbo", label: "QuickBooks Online" }]]],
    widgets: [
      ["stat_card", "Total Income", "vs previous month", 0, 0, 2, 4, series(["total_income", "Total Income", PALETTE[0]]), { icon: "dollar-sign", show_delta: true }],
      ["stat_card", "Total Expenses", "vs previous month", 2, 0, 2, 4, series(["total_expenses", "Total Expenses", PALETTE[0]]), { icon: "wallet", show_delta: true }],
      ["gauge_donut", "Net Profit Margin %", "Target 12,0%", 4, 0, 4, 8, series(["net_profit_margin", "Net Profit Margin %", PALETTE[1]]), { show_target_ring: true, center_label: "Net Profit Margin %" }],
      ["stat_card", "Accounts Receivable", "vs previous month", 8, 0, 2, 4, series(["accounts_receivable", "Accounts Receivable", PALETTE[0]]), { icon: "coins", show_delta: true }],
      ["stat_card", "Accounts Payable", "vs previous month", 10, 0, 2, 4, series(["accounts_payable", "Accounts Payable", PALETTE[0]]), { icon: "receipt", show_delta: true }],
      ["stat_card", "Net Profit", "vs previous month", 0, 4, 2, 4, series(["net_profit", "Net Profit", PALETTE[0]]), { icon: "bar-chart-3", show_delta: true }],
      ["stat_card", "Cash at end of month", "vs previous month", 2, 4, 2, 4, series(["cash_at_bank", "Cash at Bank", PALETTE[0]]), { icon: "piggy-bank", show_delta: true }],
      ["ratio_card", "Quick Ratio", "Quick Ratio Target", 8, 4, 2, 4, series(["quick_ratio", "Quick Ratio", PALETTE[1]]), { caption: "1 or higher", icon: "pie-chart" }],
      ["ratio_card", "Current Ratio", "Current Ratio Target", 10, 4, 2, 4, series(["current_ratio", "Current Ratio", PALETTE[1]]), { caption: "3 or higher", icon: "timer" }],
      ["bar_chart", "Income and Expenses", "Monthly", 0, 8, 8, 8, series(["total_income", "Total Income", PALETTE[0]], ["total_expenses", "Total Expenses", PALETTE[1]], ["net_profit", "Net Profit", PALETTE[2], { render_as: "line", axis: "right" }]), { legend: true }],
      ["progress_donut", "% of income Budget", "Budget attainment", 8, 8, 2, 8, series(["total_income", "Actual", PALETTE[1]], ["income_budget", "Budget", PALETTE[0]]), { footer_labels: ["Budget", "Balance"] }],
      ["progress_donut", "% of Expenses Budget", "Budget attainment", 10, 8, 2, 8, series(["total_expenses", "Actual", PALETTE[1]], ["expense_budget", "Budget", PALETTE[0]]), { footer_labels: ["Budget", "Balance"] }],
    ],
  },
  {
    // Reference 2 — "Financial Summary"
    name: "Financial Summary", slug: "financial-summary", description: "Board summary: sales and gross profit against target, growth drivers and return ratios.", period: "ytd",
    filters: [],
    widgets: [
      ["text_block", "Financial Summary", null, 0, 0, 3, 4, { series: [] }, { text: "Year-to-date performance drawn live from the connected Zoho Books and QuickBooks Online ledgers.", variant: "accent" }],
      ["kpi_group", "Sales", "Target achievement and change over last year", 0, 4, 3, 5, series(["total_income", "Sales", PALETTE[0]], ["pct_of_income_budget", "Target Achievement", PALETTE[5]], ["revenue_growth_yoy", "Change Over Last Year", PALETTE[1]]), { variant: "primary", headline_index: 0 }],
      ["kpi_group", "Gross Profit", "Target achievement and change over last year", 0, 9, 3, 5, series(["gross_profit", "Gross Profit", PALETTE[0]], ["gross_margin", "Target Achievement", PALETTE[5]], ["revenue_growth_yoy", "Change Over Last Year", PALETTE[1]]), { headline_index: 0 }],
      ["stat_card_sparkline", "Revenue", "Actual vs prior year", 3, 0, 2, 6, series(["total_income", "Revenue", PALETTE[0]]), { spark_type: "bar", show_delta: true }],
      ["stat_card_sparkline", "EBITDA", "Actual vs prior year", 5, 0, 2, 6, series(["ebitda", "EBITDA", PALETTE[0]]), { spark_type: "bar", show_delta: true }],
      ["stat_card_sparkline", "Free Cash Flow", "Actual vs prior year", 7, 0, 2, 6, series(["free_cash_flow", "Free Cash Flow", PALETTE[0]]), { spark_type: "bar", show_delta: true }],
      ["stat_card_sparkline", "Net Profit", "Actual vs prior year", 9, 0, 3, 6, series(["net_profit", "Net Profit", PALETTE[0]]), { spark_type: "bar", show_delta: true }],
      ["progress_donut", "Revenue Growth (YoY)", "Growth against 25% goal", 3, 6, 6, 8, series(["revenue_growth_yoy", "Growth", PALETTE[5]]), { footer: "Revenue Growth (YoY 25%)", target_override: 25 }],
      ["kpi_group", "Return Ratios", "Profitability and leverage", 9, 6, 3, 8, series(["net_profit_margin", "Net Profit Margin", PALETTE[0]], ["debt_to_equity", "Debt-to-Equity Ratio", PALETTE[0]], ["roe", "Return on Equity (ROE)", PALETTE[0]]), { layout: "rows" }],
    ],
  },
  {
    // Reference 3 — "Company Cash Flow Report"
    name: "Cash Flow Report", slug: "cash-flow-report", description: "Cash at bank, burn rate, expense mix, runway and debtor exposure.", period: "last_6m",
    filters: [["cost_center", "Cost centre", "select", "cost_center", costCenters.map((c) => ({ value: c, label: c }))]],
    widgets: [
      ["stat_card_sparkline", "Cash at Bank", "Current Status · past 6 months", 0, 0, 4, 7, series(["cash_at_bank", "Cash at Bank", PALETTE[1]]), { spark_type: "bar", icon: "landmark" }],
      ["stat_card_sparkline", "Cash Burn Rate", "3 Months avg. · past 6 months", 4, 0, 4, 7, series(["cash_burn_rate", "Cash Burn Rate", PALETTE[5]]), { spark_type: "line", icon: "activity" }],
      ["line_chart", "Monthly Expenses", "Salary, fixed cost and other expenses", 8, 0, 4, 7, series(["salaries", "Salary", PALETTE[3]], ["cost_of_sales", "Fixed Cost", PALETTE[5]], ["monthly_expenses", "Expenses", PALETTE[0]]), { legend: true }],
      ["stat_card_sparkline", "Solvency", "Months of runway", 0, 7, 5, 8, series(["solvency_months", "Solvency", PALETTE[5]], ["cash_burn_rate", "Burn Rate", PALETTE[0]]), { spark_type: "bar", show_state: true, icon: "shield-check" }],
      ["ratio_card", "Debtors", "Total vs over 60 days", 5, 7, 3, 8, series(["accounts_receivable", "Total", PALETTE[1]], ["debtors_over_60", "Over 60 Days", PALETTE[5]]), { stacked_values: true }],
      ["bar_chart", "Debtors — past 6 months", "Outstanding balance", 8, 7, 4, 8, series(["accounts_receivable", "Debtors", PALETTE[5]]), { legend: false }],
    ],
  },
  {
    // Reference 4 — "Human Resources Dashboard"
    name: "Human Resources Dashboard", slug: "human-resources", description: "Headcount, hiring, turnover and workforce composition from the ERP HR module.", period: "ytd",
    filters: [["department", "Department", "select", "department", departments.map((d) => ({ value: d, label: d }))], ["location", "Location", "select", "location", locations.map((l) => ({ value: l, label: l }))]],
    widgets: [
      ["stat_card", "Total Employees", "100%", 0, 0, 2, 3, series(["headcount", "Total Employees", HR[0]]), { icon: "users" }],
      ["stat_card", "New Hires (YTD)", "100%", 2, 0, 2, 3, series(["new_hires_ytd", "New Hires", HR[1]]), { icon: "user-plus" }],
      ["stat_card", "Turnover Rate (YTD)", "100%", 4, 0, 3, 3, series(["turnover_rate", "Turnover Rate", HR[2]]), { icon: "log-out" }],
      ["stat_card", "Average Tenure", "100%", 7, 0, 2, 3, series(["average_tenure", "Average Tenure", HR[3]]), { icon: "bar-chart-3" }],
      ["stat_card", "Average Salary", "100%", 9, 0, 3, 3, series(["average_salary", "Average Salary", HR[4]]), { icon: "banknote" }],
      ["hbar_chart", "Employees by Department", null, 0, 3, 4, 8, series(["employees_by_department", "Employees", HR[0]]), { limit: 6 }],
      ["gauge_donut", "Employees by Gender", "Total", 4, 3, 4, 8, series(["employees_by_gender", "Employees", HR[1]]), { donut_mode: "breakdown", center_label: "Total" }],
      ["bar_chart", "Employees by Age Group", "Number of Employees", 8, 3, 4, 8, series(["employees_by_age_group", "Employees", HR[2]]), { legend: false }],
      ["line_chart", "Hires vs. Turnover (Trend)", "Monthly", 0, 11, 4, 8, series(["new_hires_ytd", "Hires", HR[0]], ["separations", "Turnover", HR[4]]), { legend: true, smooth: true }],
      ["gauge_donut", "Employees by Employment Type", "Full time vs part time", 4, 11, 4, 8, series(["employees_by_type", "Employees", HR[0]]), { donut_mode: "breakdown" }],
      ["hbar_chart", "Headcount by Location", "Number of Employees", 8, 11, 4, 8, series(["headcount_by_location", "Employees", HR[1]]), { limit: 6 }],
    ],
  },
];


const dashRows = [], filterRows = [], widgetRows = [], shareRows = [];
templates.forEach((t, di) => {
  const id = dashUuid(di + 1);
  dashRows.push(`(${q(id)},${q(t.name)},${q(t.slug)},${q(t.description)},true,${q(t.period)},${di === 0},'tenant')`);
  t.filters.forEach((fl, fi) => filterRows.push(`(${q(id)},${q(fl[0])},${q(fl[1])},${q(fl[2])},${q(fl[3])},${j(fl[4])},NULL,${fi})`));
  t.widgets.forEach((w, wi) => {
    widgetRows.push(`(${q(wUuid(di + 1, wi + 1))},${q(id)},${q(w[0])},${q(w[1])},${q(w[2])},${w[3]},${w[4]},${w[5]},${w[6]},${j(w[7])},${j(w[8])},${wi})`);
  });
  shareRows.push(`(${q(id)},'90000001-0000-4000-8000-00000000000${di === 3 ? 3 : 1}','view')`);
});
out.push(`INSERT INTO public.dashboards (id, name, slug, description, is_template, default_period, is_default, visibility) VALUES\n${dashRows.join(",\n")};`);
out.push(`INSERT INTO public.dashboard_filters (dashboard_id, key, label, filter_type, source_field, options, default_value, sort_order) VALUES\n${filterRows.join(",\n")};`);
out.push(`INSERT INTO public.widgets (id, dashboard_id, widget_type, title, subtitle, grid_x, grid_y, grid_w, grid_h, metric_binding, viz_config, sort_order) VALUES\n${widgetRows.join(",\n")};`);
out.push(`INSERT INTO public.dashboard_shares (dashboard_id, role_id, permission) VALUES\n${shareRows.join(",\n")};`);

console.log(out.join("\n\n"));
