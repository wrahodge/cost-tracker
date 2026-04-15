# cost-control

Internal construction cost management platform for client-side project
managers tracking payments to head contractors and consultants on
apartment building projects in Australia.

Built with Vite + React 18, JavaScript, inline styles, DM Sans. No
backend yet — data lives in `useState` in `src/App.jsx`, seeded from
`src/data/sampleData.js`.

## Running

```
npm install
npm run dev       # http://localhost:5173
npm run build
```

## Data model

All entities live in memory. Ids are plain strings
(`crypto.randomUUID()` for new rows).

### BudgetLine
Cost code with an original budget amount.
| Field            | Type   | Notes                                           |
| ---------------- | ------ | ----------------------------------------------- |
| `id`             | string | PK                                              |
| `code`           | string | e.g. `03-100`                                   |
| `description`    | string | e.g. `Concrete Structure`                       |
| `originalBudget` | number | AUD                                             |

### Contract
Belongs to one `BudgetLine`. One per head-contractor or consultant
engagement.
| Field          | Type   | Notes                                          |
| -------------- | ------ | ---------------------------------------------- |
| `id`           | string | PK                                             |
| `budgetLineId` | string | FK → BudgetLine                                |
| `contractor`   | string | Company name                                   |
| `reference`    | string | e.g. `CT-001`                                  |
| `originalSum`  | number | AUD, the signed contract sum                   |
| `retentionPct` | number | 0 – 1 (0.05 = 5%)                              |
| `status`       | enum   | `Active` \| `Closed` \| `On Hold`              |

### Variation
Belongs to one `Contract`. Only `Approved` variations flow into the
revised contract sum.
| Field         | Type   | Notes                                           |
| ------------- | ------ | ----------------------------------------------- |
| `id`          | string | PK                                              |
| `contractId`  | string | FK → Contract                                   |
| `reference`   | string | e.g. `VAR-001`                                  |
| `description` | string |                                                 |
| `amount`      | number | AUD, may be negative                            |
| `status`      | enum   | `Pending` \| `Approved` \| `Rejected`           |
| `date`        | string | ISO `YYYY-MM-DD`                                |

### Payment
Payment certificate belonging to one `Contract`. Retention and net
payable are derived from `contract.retentionPct` — never stored.
| Field             | Type   | Notes                                       |
| ----------------- | ------ | ------------------------------------------- |
| `id`              | string | PK                                          |
| `contractId`      | string | FK → Contract                               |
| `reference`       | string | e.g. `PC-01`                                |
| `claimAmount`     | number | AUD the contractor claimed                  |
| `certifiedAmount` | number | AUD certified by the PM / Superintendent    |
| `date`            | string | ISO `YYYY-MM-DD`                            |
| `status`          | enum   | `Draft` \| `Certified` \| `Paid`            |

## Calculations

All pure, in `src/utils/calc.js`. Every roll-up is derived at render
time so edits to any entity cascade instantly through the UI.

### Contract
- `contractApprovedVars(contract, variations)` — sum of
  `status === 'Approved'` variation amounts for that contract.
- `contractRevisedSum(contract, variations)` —
  `originalSum + contractApprovedVars`.
- `contractTotalCertified(contract, payments)` — sum of
  `certifiedAmount` across the contract's payments.
- `contractTotalPaid(contract, payments)` — sum of certified amounts
  where the certificate `status === 'Paid'`.

### Payment
- `paymentRetention(payment, contract)` —
  `certifiedAmount × contract.retentionPct`.
- `paymentNetPayable(payment, contract)` —
  `certifiedAmount − paymentRetention(payment, contract)`.

### Budget line
- `budgetCommitted(line, contracts)` — sum of `originalSum` for contracts
  linked to that budget line.
- `budgetApprovedVars(line, contracts, variations)` — sum of approved
  variations across those contracts.
- `budgetUncommitted(line, contracts)` —
  `originalBudget − budgetCommitted`. Rendered red when negative.

### Project totals (dashboard)
`projectTotals` returns `{ totalBudget, committed, approvedVars,
certified, paid, uncommitted }`.

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

## Delete cascades

- Deleting a **BudgetLine** cascades to its contracts, their variations
  and their payments.
- Deleting a **Contract** cascades to its variations and payments.
- Deleting a **Variation** or **Payment** is a straight removal.

These cascades live in `App.jsx` alongside the state setters.

## Sample project

`src/data/sampleData.js` seeds a Sydney apartment project, **Harbour
View Apartments**, with:

- 11 budget lines totalling **$17,000,000**
  (Preliminaries, Demolition, Excavation & Piling, Concrete Structure,
  Structural Steel, Facade & Cladding, Windows & Doors, Roofing,
  Mechanical Services, Electrical Services, Hydraulic Services)
- 4 contracts — 2 trade (Apex Concrete, Pacific Facade) and
  2 consultant (Meridian QS, Northline Structural)
- 4 variations across Apex and Pacific (mix of Approved / Pending /
  Rejected so cascades into revised sums are visible immediately)
- 5 payment certificates (mix of Draft / Certified / Paid)

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

## Planned features

Not implemented yet — listed here so future sessions know the direction.

- **Supabase backend** — swap the `useState` seed for a Supabase project
  (tables: `budget_lines`, `contracts`, `variations`, `payments`,
  `projects`). Row-level security keyed by `project_id` + user.
- **Multi-project** — a projects table and a project picker in the
  header; every other query scopes to the active project.
- **PDF export** — one-click export of individual payment certificates
  (client / builder / superintendent copies) and monthly cost reports
  (budget vs committed vs certified vs forecast).
- **Cash flow forecasting** — per-contract S-curve or manual payment
  schedule, roll up to a monthly projected cash-out for the project and
  plot actual vs forecast.
- **Audit log** — append-only history of edits to contract sums,
  variations and certified amounts, since those are the numbers that
  matter most in disputes.
