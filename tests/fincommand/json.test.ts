import { describe, expect, test } from "bun:test";
import { reportJson } from "../../src/lib/fincommand/json";

describe("financial report transport", () => {
  test("preserves financial amounts and exposes undefined ratios as unavailable", () => {
    expect(reportJson({ revenue: 125000, cash: 0, ratio: Infinity, unavailable: undefined }))
      .toEqual({ revenue: 125000, cash: 0, ratio: null, unavailable: null });
  });
});