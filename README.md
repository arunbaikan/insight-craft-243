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
