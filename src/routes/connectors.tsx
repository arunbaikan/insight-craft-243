import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Database } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { listConnections } from "@/lib/connections.functions";
import { getZohoImportStatus } from "@/lib/fincommand/zoho-status.functions";

export const Route = createFileRoute("/connectors")({
  head: () => ({
    meta: [
      { title: "Connected ledgers — Ledgerframe" },
      {
        name: "description",
        content: "Zoho Books and QuickBooks Online sync status feeding the normalised ledger behind every metric.",
      },
      { property: "og:title", content: "Connected ledgers — Ledgerframe" },
      { property: "og:description", content: "Sync status for the accounting sources behind your dashboards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectorsPage,
});

function ConnectorsPage() {
  const connections = useQuery({ queryKey: ["connections"], queryFn: () => listConnections() });
  const imported = useQuery({ queryKey: ["zoho-import-status"], queryFn: () => getZohoImportStatus(), retry: false });

  return (
    <AppShell
      title="Connected ledgers"
      description="Dashboards read only from the normalised canonical schema — never from a provider API directly."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(connections.data ?? []).map((c) => (
          <article key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold">{c.display_name}</h3>
                <p className="text-xs text-muted-foreground">{c.org_identifier}</p>
              </div>
              <Badge variant={c.status === "connected" ? "secondary" : "destructive"} className="capitalize">
                {c.status === "connected" ? <CheckCircle2 className="size-3" /> : <CircleAlert className="size-3" />}
                {c.status}
              </Badge>
            </div>
            <dl className="mt-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Records pulled</dt>
                <dd className="tabular">{c.records_pulled.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last successful sync</dt>
                <dd>{c.last_success_at ? new Date(c.last_success_at).toLocaleString("en-GB") : "—"}</dd>
              </div>
              {c.last_error ? <p className="pt-1 text-negative">{c.last_error}</p> : null}
            </dl>
          </article>
        ))}
        {connections.isLoading
          ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)
          : null}
        {!connections.isLoading && (connections.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No source connected yet.
          </p>
        ) : null}
      </div>

      <section className="mt-8 border-t border-border pt-5">
        <h2 className="font-display text-base font-semibold">Zoho import coverage</h2>
        {imported.isError ? <p className="mt-2 text-sm text-muted-foreground">Sign in with a company-authorized account to view private Zoho records.</p> : null}
        {imported.data?.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No company access assigned to this account.</p> : null}
        <div className="mt-3 divide-y divide-border">
          {imported.data?.map((item) => <div key={`${item.company_id}-${item.resource}`} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto]">
            <span className="font-medium capitalize">{item.resource}</span>
            <span className="text-sm tabular-nums">{item.records_pulled.toLocaleString()} records</span>
            <Badge variant={item.status === "blocked" || item.status === "error" ? "destructive" : "secondary"}>{item.status} · {item.phase}</Badge>
            {item.last_error ? <p className="text-sm text-negative sm:col-span-3">{item.last_error}</p> : null}
          </div>)}
        </div>
      </section>
      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <Database className="size-4 text-brand" /> Canonical schema
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Raw provider payloads are normalised into one shared shape, so a metric written once resolves identically
          whichever ledger the rows came from.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            "accounts",
            "journal_lines",
            "invoices",
            "bills",
            "payments",
            "customers",
            "vendors",
            "items",
            "budgets",
            "bank_balances",
            "account_mappings",
            "employees",
            "employee_events",
            "date_dim",
          ].map((t) => (
            <code key={t} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {t}
            </code>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
