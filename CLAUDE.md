# cost-control

Internal construction cost management platform for client-side project
managers tracking payments to head contractors and consultants on
apartment building projects in Australia.

**Stack:** Vite + React 18, JavaScript, inline styles, DM Sans,
`@supabase/supabase-js`, `@tanstack/react-query`.

**Backend:** Supabase (Postgres + Auth). Schema is a faithful
port of the Mastt cost-tracking data model — see
`docs/mastt-data-model.md`.

**Production:** <https://esscostracker.pages.dev/> — hosted on
Cloudflare Pages, auto-deploys on push to the production branch.

**Data persistence:** All data lives in Supabase. Sign in with a
magic link to access the app. Single-user RLS gate — only the email
set via `alter database postgres set app.allowed_email = '…'` can
read/write any row.

## Running

```
npm install
cp .env.example .env.local       # then fill in the three VITE_ vars
npm run dev                      # http://localhost:5173
npm run build
```

See `docs/supabase-setup.md` for the one-time Supabase project
setup (create project, run migration, seed data, set env vars on
Cloudflare Pages).

## Data model

Source of truth: `docs/mastt-data-model.md`.

The Mastt model uses 5 core entities in a tree hierarchy. Our
relational implementation (`supabase/migrations/0001_mastt_schema.sql`)
uses proper foreign keys instead of Mastt's title-based matching:

```
projects                    (CP)
  └─ budget_categories      (BGT)          -- e.g. "Consultant Fees"
       └─ budget_groups     (SBGT D3)      -- e.g. "Structure"
            └─ budget_lines (SBGT D4)      -- e.g. "Concrete Structure"

contracts                   (CTR)          -- header
  ├─ contract_sections      (SEC)          -- separable portions (nullable)
  └─ contract_milestones    (CTRM)         -- linked to budget_line_id
                                           --   ← this is the backbone FK

variations                  (VAR)          -- linked to contract + budget_line
payment_claims              (PC)           -- linked to contract
forecasts                   (FOR)          -- linked to budget_line
```

### Status enumerations

| Entity       | Statuses                                                |
| ------------ | ------------------------------------------------------- |
| Contract     | `Approved`, `Pending`, `Part-Approved`                  |
| Variation    | `Forecast`, `Pending`, `In Principle`, `Approved`       |
| Variation rejection | `date_rejected` timestamp (Mastt has no `Rejected` status) |
| Payment      | `Draft`, `Certified`, `Approved`, `Paid`                |

Mastt's vocabulary: `Forecast` = anticipated but not yet formally
raised; `In Principle` = agreed in principle, final value being
negotiated. These feed different reporting modes in Sprint 3.

## Calculations

All pure, in `src/utils/calc.js`. Every roll-up is derived at render
time so edits to any entity cascade instantly through the UI.

### Budget line
- `budgetLineEffectiveBudget(line)` — `original_amount + adjustments_in − adjustments_out`
- `milestonesForBudgetLine(line, contracts)` — flatMap across contracts
- `budgetCommitted(line, contracts)` — sum of milestones' `original_value`
- `budgetApprovedVars(line, variations)` — sum of approved variations (excluding rejected)
- `budgetUncommitted(line, contracts)` — effective budget − committed. Rendered red when negative.

### Contract
- `contractOriginalSum(contract)` — sum of milestones' `original_value`
- `contractApprovedVars(contract, variations)` — approved + not rejected
- `contractRevisedSum(contract, variations)` — original sum + approved variations
- `contractTotalCertified(contract, payments)` — sum of `certified_amount`
- `contractTotalPaid(contract, payments)` — same but only `status === 'Paid'`

### Payment
- `paymentRetention(payment, contract)` — stored `retention_amount` if > 0, else `certified_amount × contract.retention_pct`
- `paymentNetPayable(payment, contract)` — `certified_amount − retention`

### Project totals (dashboard)
`projectTotals` returns `{ totalBudget, committed, approvedVars, certified, paid, uncommitted }`.

## Sprint status

### Sprint 1 (current) — Mastt schema + Supabase
- **Done:** Full Mastt-faithful schema in Supabase, magic-link auth,
  data hooks, ported UI, seeded Harbour View sample.
- **Shim:** Each contract auto-creates a single "Main" section + "Main"
  milestone. Budget UI is still flat (shows group as a subtitle, no
  tree expansion yet). Variations support the new status vocabulary
  but no category/VPR/VO fields in the UI.

### Sprint 2 — Richness
- Budget tree UI (expandable Category → Group → Line)
- Contract sections + multi-milestone editing UI
- Forecasts tab + FFC/variance dashboard cards

### Sprint 3 — Reporting
- 8-level Overall view (SQL view + tree renderer)
- Roll-ups from budget_line upward through groups and categories
- Printable monthly cost report view

### Sprint 4 — Interop
- CSV import compatible with Mastt's format (title-based → FK resolution)
- CSV export

### Later
- Multi-project support
- Client read-only shareable links

## UI conventions

- Inline styles only. Shared style objects + palette live in
  `src/styles.js`. No Tailwind, no CSS modules.
- DM Sans loaded from Google Fonts in `index.html`.
- Dark header (`#1a1d23`) with a gold (`#d4a017`) `$` glyph.
- Tabs: `Dashboard | Budget | Contracts | Variations | Payments`. Active
  tab gets a gold underline.
- Tables: click a row to open the edit modal. `✕` on the right of each
  row deletes (with `window.confirm`).
- Modals: one generic `<Modal>` shell (`src/components/Modal.jsx`). Each
  tab owns a small inline form. Esc or clicking the backdrop closes.
- Numeric columns use `text-align: right` and tabular numerals.
- Currency via `Intl.NumberFormat('en-AU', { currency: 'AUD' })`.

## State management

- Remote state: `@tanstack/react-query` (`src/lib/queryClient.js`,
  query keys in `qk`).
- Hooks in `src/hooks/` wrap Supabase queries and mutations. Each
  mutation invalidates its own query key plus any dependent keys
  (e.g. saving a variation invalidates both variations and contracts
  so revised sums recalculate).
- Auth: `src/auth/AuthGate.jsx` blocks the app until signed in via
  magic link. `src/auth/useAuth.js` is the thin Supabase wrapper.

## Delete cascades

All cascades happen in Postgres via `ON DELETE CASCADE` FKs:

- Deleting a **project** drops categories, groups, lines, contracts,
  sections, milestones, variations, payments, forecasts.
- Deleting a **budget_line** drops forecasts linked to it;
  contract_milestones have `on delete restrict` so you can't orphan
  a committed milestone — delete the contract first.
- Deleting a **contract** drops sections, milestones, variations, payments.
- Deleting a **variation** or **payment** is a straight removal.

## Australian terminology (glossary)

- **Variation** — change to the contract sum or scope (US: change order).
- **Retention** — money withheld from each certified amount as security,
  released on practical / final completion (US: retainage).
- **Payment certificate / claim / progress claim** — monthly assessment
  from the contractor against the contract for work performed to date.
- **Certified amount** — the portion of the claim the PM or
  Superintendent has certified as payable.
- **Head contractor** — the main build contractor under a head
  construction contract with the client.
- **Client-side PM** — the project manager engaged by the client /
  developer (not the builder), which is who this tool is built for.
- **FFC (Forecast Final Cost)** — expected total cost including
  forecasts: `current_contract + uncommitted + forecasts`. Mastt's
  most important reporting number.
- **Variance** — `budget − FFC`. Negative means over budget.
- **Separable portion** — a standalone section of a head contract
  that can be handed over independently (AS4902 concept). Modelled
  as `contract_sections`.
