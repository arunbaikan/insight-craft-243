import { describe, expect, test } from "bun:test";
import { normalizeZoho, numberOrNull } from "../../src/lib/fincommand/zoho-normalize";

describe("Zoho source financial accuracy", () => {
  test("preserves source currency and uses source exchange rate for base totals", () => {
    const data = normalizeZoho("company", "INR", "invoices", "invoice_id", [{invoice_id:"1", currency_code:"USD",total:53457,balance:53457,exchange_rate:95.25}]);
    expect(data.documents[0]).toMatchObject({currency:"USD",total:53457,total_base:5091779.25,balance_base:5091779.25});
  });
  test("missing foreign currency rates are unavailable, never silently one", () => {
    const data = normalizeZoho("company", "INR", "bills", "bill_id", [{bill_id:"1",currency_code:"USD",total:100}]);
    expect(data.documents[0].total_base).toBeNull();
    expect(data.documents[0].normalization_issues).toContain("Base currency conversion unavailable");
  });
  test("source zero is preserved and missing amounts are not converted to zero", () => {
    expect(numberOrNull(0)).toBe(0); expect(numberOrNull(null)).toBeNull(); expect(numberOrNull("invalid")).toBeNull();
  });
  test("keeps tax separate without interpreting gross invoices as recognized revenue", () => {
    const data = normalizeZoho("company","INR","invoices","invoice_id",[{invoice_id:"1",currency_code:"INR",total:118,sub_total:100,tax_total:18}]);
    expect(data.documents[0]).toMatchObject({total:118,subtotal:100,tax_total:18});
    expect(data.documents[0]).not.toHaveProperty("revenue");
  });
  test("records preserve source identifiers and detail line relationships", () => {
    const data = normalizeZoho("company","INR","bills","bill_id",[{bill_id:"2",currency_code:"INR",total:10,line_items:[{line_item_id:"3",account_id:"4",item_total:10}]}]);
    expect(data.lines[0]).toMatchObject({company_id:"company",source_id:"2",line_id:"3",account_id:"4",amount:10});
  });
  test("missing identifiers fail the batch instead of silently losing records", () => {
    expect(() => normalizeZoho("company","INR","invoices","invoice_id",[{}])).toThrow("missing invoice_id");
  });
});