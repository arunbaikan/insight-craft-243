import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BASE_CURRENCY,
  CURRENCIES,
  setCurrencyCode,
  setCurrencyRate,
  useCurrency,
  type CurrencyCode,
} from "@/lib/currency";

/** Presentation-currency selector plus manual exchange-rate entry. */
export function CurrencyControls() {
  const { code, rate } = useCurrency();
  const [draft, setDraft] = useState(String(rate));

  useEffect(() => {
    setDraft(String(rate));
  }, [rate]);

  const isBase = code === BASE_CURRENCY;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={code}
        onValueChange={(v) => setCurrencyCode(v as CurrencyCode)}
      >
        <SelectTrigger className="h-9 w-36" aria-label="Currency">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code === BASE_CURRENCY ? `${c.code} (base)` : c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <label htmlFor="fx-rate" className="text-xs text-muted-foreground whitespace-nowrap">
          Exchange rate
        </label>
        <Input
          id="fx-rate"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.0001"
          className="h-9 w-24 tabular"
          value={isBase ? "1.00" : draft}
          disabled={isBase}
          title={isBase ? "Base currency — rate is always 1.00" : `1 ${BASE_CURRENCY} = ? ${code}`}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n > 0) setCurrencyRate(n);
          }}
          onBlur={() => setDraft(String(rate))}
        />
      </div>
    </div>
  );
}
