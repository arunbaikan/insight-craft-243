# Insight Builder

Build a self-service dashboard builder module for a multi-tenant ERP.

 

CORE IDEA

Customers assemble their own dashboards on a 12-column drag-and-drop grid

and define the KPI behind every widget themselves. Nothing is hard-coded:

not the layout, not the metric formula, not the presentation.

 

DATA

All data comes from OUR backend. The backend ingests from Zoho Books and

QuickBooks Online via OAuth2, stores raw payloads, then normalises into one

canonical schema (accounts, journal_lines, invoices, bills, payments,

customers, vendors, items, budgets, bank_balances, account_mappings,

date_dim). The frontend NEVER calls Zoho or QBO directly.

 

THREE STORED OBJECT TYPES

1. metric_definitions - user-editable KPI definitions: source_entity,

   aggregation, value_field, a JSON filter DSL, an optional formula AST

   referencing other metrics, time_grain, comparison basis, target and

   colour thresholds. Versioned. System metrics are read-only but clonable.

2. dashboards + dashboard_filters - name, grid config, global filter bar,

   default period, visibility.

3. widgets - widget_type, grid position/size, metric_binding (one or more

   metric series), viz_config (purely presentational).

 

KEY ENDPOINTS

POST /api/metrics/validate   - inline errors in the formula editor

POST /api/metrics/preview    - live value before saving

POST /api/dashboards/{id}/data - ONE batch call resolving every widget,

                                 each widget isolated so one bad metric

                                 renders an error card, not a failed page

 

WIDGET TYPES (registry-keyed renderers)

stat_card, stat_card_sparkline, gauge_donut, progress_donut, bar_chart,

stacked_bar_chart, hbar_chart, line_chart, ratio_card, kpi_group,

data_table, text_block

 

ACCEPTANCE

- A non-technical user creates a new metric ('Salary as % of Revenue')

  and sees a live preview before saving.

- The same user drags four widgets onto a blank dashboard, binds metrics,

  sets a target, saves, and shares it with a role.

- The four attached reference dashboards are reproducible as seed

  templates using only the schema above.

 

Full schema, filter DSL, formula AST, API contracts, runtime sequence and

a nine-phase build order are in the attached specification. Follow the

phase order: foundations, connectors, normalisation, metric engine,

metric builder UI, dashboard data API, widget renderers, dashboard

builder, templates and sharing, polish.

## Run it locally in VS Code

**Prerequisites**

- Node.js 20 or newer (this project was built on Node 22)
- [Bun](https://bun.sh) 1.2 or newer — `curl -fsSL https://bun.sh/install | bash`
- VS Code with the ESLint and Prettier extensions (config is already in the repo)

**Install and start**

```sh
unzip dashboard-builder-source.zip -d insight-builder
cd insight-builder
bun install
bun run dev
```

Open the printed URL (usually http://localhost:8080). The dev server hot-reloads on save.

**Other commands**

```sh
bun run build     # production build
bun run preview   # serve the production build
bun run lint      # ESLint
bun run format    # Prettier
bun test          # unit tests (metric engine, normalisation, FP&A)
```

**Environment**

`.env` already carries the backend address and the publishable key, so the app
connects to the live backend out of the box. Those are public values, safe to
commit.

Server-only secrets are **not** in this archive. To use the Zoho import route
locally, add them to a `.env` file (never commit it):

```
LOVABLE_CRON_SECRET=<scheduler token>
ZOHO_CLIENT_ID=<your Zoho app client id>
ZOHO_CLIENT_SECRET=<your Zoho app client secret>
```

**Database**

Schema history lives in `supabase/migrations/` — apply them in filename order to
a fresh Postgres/Supabase database to rebuild the full schema and seed data.

**Editing in VS Code**

Open the unzipped folder as the workspace root (`File → Open Folder`). Path
alias `@/` maps to `src/` and works out of the box; type-checking, formatting on
save and linting all read the committed configs.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://insight-craft-243.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/13fdb9d9-c7b8-488f-9350-ae6ee21d0a0a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
