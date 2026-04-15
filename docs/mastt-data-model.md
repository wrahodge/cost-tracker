# Mastt Cost Tracking Data Model — Complete Reference

This document describes the data model used by the Mastt construction
cost management platform, reverse-engineered from real project
exports (Levande Oatlands Golf Club). It's the reference spec this
app replicates.

Source: user-provided dump on 2026-04-15.

---

## 1. Core Concepts

Mastt organises construction cost data around **five interrelated
entities**. Every entity uses a **tree/hierarchy** expressed via a
`Depth` integer (1 = root, incrementing for children). The platform
uses **24-character hex IDs** (MongoDB ObjectId format) as primary
keys, prefixed with a type code in the CSV exports.

### Entity ID Prefixes

| Prefix | Meaning             | Description                                           |
| ------ | ------------------- | ----------------------------------------------------- |
| `CP`   | Cost Plan (Project) | The root node — one per project                       |
| `BGT`  | Budget Category     | Top-level budget grouping                              |
| `SBGT` | Sub-Budget          | A budget line item — this is where dollar amounts live |
| `CTR`  | Contract            | A contract with a vendor/subcontractor                 |
| `CTRM` | Contract Milestone  | A line item or deliverable stage within a contract     |
| `SEC`  | Section             | A section grouping within a contract                   |
| `VAR`  | Variation           | A variation (change order) against a contract         |
| `FOR`  | Forecast            | A forecast cost item                                   |
| `PC`   | Payment Claim       | An individual payment claim against a contract         |

---

## 2. Entity Details

### 2.1 Budget (BGT / SBGT)

The budget is the **top-down cost plan** — what you expect to spend.
4-level tree:

```
Depth 1: CP   — Project root (amounts are zero; it's just the container)
Depth 2: BGT  — Budget Category (e.g. "Consultant Fees", "Contractors")
Depth 3: SBGT — Sub-Budget Group (e.g. "Gate 4 - Detailed Design To Tender")
Depth 4: SBGT — Budget Line Item (e.g. "Gate 4 - Project Manager")
```

**Unallocated Amount** row appears at Depth 4 within each Depth 3
group. It's a virtual balancing entry (don't store as a real row).

#### Budget fields

| Field                | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `Title`              | Display name                                         |
| `Depth`              | Hierarchy level (1–4)                                |
| `ID`                 | Prefixed hex ID                                      |
| `Original Amount`    | Initial budget allocation                            |
| `Adjustments`        | Net budget adjustments (transfers between lines)     |
| `Budget`             | Effective budget = Original Amount + Adjustments     |
| `Unallocated Budget` | Budget minus committed contract value                |
| `Status`             | "Approved" or blank                                  |
| `Tag`                | Optional classification tag                          |
| `Date Created`       | Creation timestamp                                   |

**Key design point:** Budget Depth 4 line items are what contracts
link to. In Mastt's CSV this is a **title-based reference**; in our
clone we use proper `budget_line_id` foreign keys.

---

### 2.2 Contract (CTR)

Contracts represent **committed spend**. Structure depends on contract
type.

**Consultant contract** (simple):
```
Depth 1: CTR  — Contract header
Depth 2: CTRM — Milestone/deliverable (e.g. "Stage 4 – Design Development")
```

**Head contractor contract** (with separable portions):
```
Depth 1: CTR  — Contract header
Depth 2: SEC  — Section / Separable Portion (e.g. "SP1 - Townhouses")
Depth 3: CTRM — Trade line item within section (e.g. "PRELIMINARIES", "Concrete")
```

Sections are used for large head contracts (typically AS4902-2000)
to group trade packages by separable portion. Consultant contracts
don't use sections.

#### Contract fields

| Field                         | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `Title`                       | Contract name or milestone name                            |
| `Depth`                       | 1 = contract, 2 = milestone or section, 3 = milestone within section |
| `ID`                          | Prefixed hex ID (CTR, CTRM, or SEC)                        |
| `Status`                      | "Approved" \| "Pending" \| "Part-Approved"                 |
| `Original Contract Value`     | Initial agreed contract sum                                |
| `Variation Value`             | Total value of approved/forecast variations                |
| `No. Variations`              | Count of variations                                        |
| `Total Contract Value`        | Original + Variations                                      |
| `Vendor`                      | Vendor/subcontractor name                                  |
| `PO Number`                   | Purchase order reference                                   |
| `Budget`                      | Title-based reference to the SBGT Depth 4 line item         |
| `Contract Standard`           | "AS4902-2000" \| "Contractor" \| blank                     |
| `Contract Completion Date`    | Original completion date                                   |
| `EOT`                         | Extension of time (days)                                   |
| `Revised Completion Date`     | Adjusted completion date                                   |
| `Date Approved`               | When the contract was approved                             |
| `Date Created`                | Creation timestamp                                         |
| `Notes`                       | Free text notes                                            |
| `Principal Organisation`      | Client entity name                                         |
| `Project Manager Organisation`| PM entity name                                             |
| `Total Paid`                  | Sum of all paid claims                                     |
| `Total Submitted`             | Sum of all submitted (not yet approved) claims             |
| `Total Approved`              | Sum of all approved (not yet paid) claims                  |
| `Amount Remaining`            | Total Contract Value - Total Paid                          |
| `Total Paid + Approved`       | Combined paid and approved amounts                         |
| `Payment Percentage Complete` | (Total Paid / Total Contract Value) × 100                  |
| `Tax %`                       | GST rate (typically 10)                                    |
| `Due Date`                    | Payment due date                                           |

#### Contract ↔ Budget linkage

Each **contract milestone** points to a budget line item. If a
contract has milestones spanning multiple budgets, the parent
contract row shows "Multiple Budgets".

For **contractor** contracts (Early Works, Main Works), the Budget
field often references the Depth 3 SBGT title rather than a Depth 4
line item.

---

### 2.3 Variation (VAR)

Variations are **change orders** against contracts — additions,
deductions, scope changes.

```
Depth 1: VAR — Variation header (one row per variation per contract)
Depth 2: VAR — Variation breakdown / commitment detail
```

#### Variation fields

| Field                         | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `Title`                       | Description (format: "Vendor - V001 - Description")  |
| `Contract`                    | Title-based reference to parent contract             |
| `Contract Variation No.`      | Sequential number within the contract                |
| `Variation No.`               | Optional project-wide variation number               |
| `Clause`                      | Contractual clause reference                         |
| `VPR No.`                     | Variation Price Request number                       |
| `VA No.`                      | Variation Approval number                            |
| `VO No.`                      | Variation Order number                               |
| `Status`                      | Forecast \| Pending \| In Principle \| Approved      |
| `Category`                    | Scope Change \| Latent Conditions \| blank           |
| `Date Received`               | When the variation was received                      |
| `Date Approved`               | When approved                                        |
| `Date Rejected`               | When rejected                                        |
| `Requested Amount`            | Amount claimed by contractor                         |
| `Variation Amount`            | Amount approved/agreed                               |
| `Total Paid`                  | Amount paid against this variation                   |
| `Total Submitted`             | Amount submitted for payment                         |
| `Total Approved`              | Amount approved for payment                          |
| `Amount Remaining`            | Variation Amount - Total Paid                        |
| `Approved By`                 | Name of approver                                     |
| `Ref. No.`                    | Reference number                                     |
| `Days Claimed`                | EOT days claimed                                     |
| `Days Approved`               | EOT days approved                                    |
| `Current Completion Date`     | Current contract completion date                     |
| `Revised Completion Date`     | Proposed revised completion date                     |
| `Budget`                      | Title-based reference to budget line item            |
| `Variation Description`       | Detailed description                                 |
| `Notes`                       | Free text notes                                      |
| `Tax %`                       | GST rate                                             |

#### Variation statuses

| Status         | Meaning                                               |
| -------------- | ----------------------------------------------------- |
| `Forecast`     | Anticipated but not yet formally raised               |
| `Pending`      | Formally submitted, awaiting assessment               |
| `In Principle` | Agreed in principle, final value being negotiated     |
| `Approved`     | Fully approved with agreed value                      |

#### Title naming convention

`{Vendor Short Name} - {V/F}{NNN} - {Description}`

- `V` = formal Variation (approved or pending)
- `F` = Forecast variation (not yet formally raised)
- `VO` = Variation Order (used for contractor contracts)

---

### 2.4 Payment (PC)

Payment claims / progress certificates against contracts.

Mastt uses a flat parent-child structure (no Depth field):

```
Header row: Contract-level summary (ID = raw hex matching the CTR ID)
  Claim row: Individual payment claim (ID = "PC " + hex)
  Claim row: ...
```

#### Payment fields

| Field                       | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `Payments by Contract`      | Contract name (header) or claim title                |
| `ID`                        | Raw hex (header) or "PC " + hex (claim)              |
| `Month`                     | Calendar month this claim relates to (e.g. "Mar 2025") |
| `Month Paid`                | Month payment was actually made                      |
| `Status`                    | Paid \| Approved \| blank                            |
| `Payment Amount`            | Claim amount (header shows total across all claims)  |
| `Submitted Amount`          | Amount submitted by contractor                       |
| `Approved Contract`         | Approved contract value at time of claim             |
| `Value Completed`           | Cumulative value of work completed to date           |
| `% Completed`               | Cumulative percentage complete                       |
| `Previous Payments`         | Sum of all prior payments                            |
| `Retention Amount`          | Retention withheld on this claim                     |
| `Payment Reference`         | Invoice or payment reference string                  |
| `Payment Statement/Claim No.` | Contractor's claim/invoice number                  |
| `Payment No.`               | Internal payment number                              |
| `Contract Payment No.`      | Sequential payment number within the contract        |
| `Reimbursable Claim`        | Flag for reimbursable (cost-plus) claims             |
| `PO Number`                 | Purchase order reference                             |
| `Vendor`                    | Vendor name                                          |
| `Project Payment No.`       | Project-wide sequential payment number               |
| `Period From`               | Claim period start date                              |
| `Period To`                 | Claim period end date                                |
| `Amount Remaining`          | Contract value minus total paid                      |
| `Date Received`             | When claim was received                              |
| `Date Approved`             | When claim was approved                              |
| `Date Payment Due`          | Payment due date                                     |
| `Invoice`                   | Invoice reference                                    |
| `Date Created`              | Creation timestamp                                   |

---

### 2.5 Overall view

A **fully denormalised, deeply nested read-only summary** that
stitches Budget, Contract, Variation, and Forecast data into a
single tree, up to 8 levels deep:

```
Depth 1: CP   — Project root
Depth 2: BGT  — Budget Category
Depth 3: SBGT — Sub-Budget Group
Depth 4: SBGT — Budget Line Item
Depth 5: CTR  — Contract (nested under its budget line)
Depth 6: CTRM — Contract Milestone
Depth 6: VAR  — Variations folder (aggregate)
Depth 7: (no prefix) — Individual variation header
Depth 8: VAR  — Variation breakdown line
Depth 5: FOR  — Forecasts folder (aggregate)
Depth 6: FOR  — Individual forecast item
```

**Critical insight:** In the OVERALL view, the same hex ID can appear
at a D4 SBGT row and a D5 CTR row. This means the budget line item
and its primary contract share the same underlying ID in Mastt's
system — establishing a 1:1 link between a budget line and its
primary contract.

#### Key financial formulas

```
Budget             = Original Budget + Adjustments
Current Contract   = Contract + Variations
FFC                = Current Contract + Uncommitted + Forecasts
Variance           = Budget - FFC
Amount Remaining   = Current Contract - Total Paid
Payment % Complete = (Total Paid / Current Contract) × 100
```

---

## 3. Relationship summary

| Parent                        | Child                          | Cardinality | Link                                      |
| ----------------------------- | ------------------------------ | ----------- | ----------------------------------------- |
| Project (CP)                  | Budget Category (BGT)          | 1:many      | Hierarchy                                 |
| Budget Category (BGT)         | Sub-Budget Group (SBGT D3)     | 1:many      | Hierarchy                                 |
| Sub-Budget Group (SBGT D3)    | Budget Line Item (SBGT D4)     | 1:many      | Hierarchy                                 |
| Budget Line Item (SBGT D4)    | Contract (CTR)                 | 1:many      | Title match / shared hex ID in OVERALL    |
| Contract (CTR)                | Section (SEC)                  | 1:many      | Hierarchy                                 |
| Contract (CTR) or Section     | Milestone (CTRM)               | 1:many      | Hierarchy                                 |
| Contract (CTR)                | Variation (VAR)                | 1:many      | `VAR.Contract = CTR.Title`                |
| Variation (VAR D1)            | Variation Line (VAR D2)        | 1:many      | Hierarchy                                 |
| Contract (CTR)                | Payment Header                 | 1:1         | Shared hex ID                             |
| Payment Header                | Payment Claim (PC)             | 1:many      | Sequential rows under header              |
| Budget Line Item (SBGT D4)    | Forecast (FOR)                 | 1:many      | Only visible in OVERALL                   |

---

## 4. Our relational schema

See `supabase/migrations/0001_mastt_schema.sql` — the SQL that
implements this spec using UUID primary keys and real foreign keys
instead of Mastt's title-based matching.

## 5. Status enumerations

- **Budget:** `Approved` \| null
- **Contract:** `Approved` \| `Pending` \| `Part-Approved`
- **Variation:** `Forecast` \| `Pending` \| `In Principle` \| `Approved`
- **Variation category:** `Scope Change` \| `Latent Conditions` \| null
- **Payment:** `Paid` \| `Approved`

## 6. Scale reference (real Mastt project)

- Budget lines: ~200 rows (4-level tree)
- Contracts: ~48 contracts with ~550 milestones
- Variations: ~140 variations with ~280 total rows including breakdowns
- Payment claims: ~46 contracts with ~236 individual claims
- Overall: ~1,240 rows (full denormalised tree, 8 levels deep)

Our app needs to handle this scale in Sprint 3+.

## 7. Key implementation notes

1. **Budget ↔ Contract link is the backbone.** Every contract
   milestone must point to a budget line. This is how we compute
   committed vs uncommitted.
2. **Variations modify contracts and are also tracked against budget
   lines.** They both increase a contract's total AND draw from the
   same budget allocation.
3. **Forecasts are soft commitments.** They feed FFC but don't
   create contracts. For anticipated costs not formally committed.
4. **Payment claims are always against contracts**, not budgets. The
   budget connection is derived through contract → milestone →
   budget_line.
5. **The Overall view is a computed roll-up**, not a stored table.
   Build it as a SQL view.
6. **Variation status → reporting:**
   - `Approved` → included in committed costs
   - `In Principle` → often included (conservative)
   - `Pending` → optional depending on reporting mode
   - `Forecast` → in FFC, not in committed contract value
7. **Contract sections** are only needed for large head contracts
   with separable portions. Most consultant contracts don't need them.
8. **"Unallocated Amount"** in the budget tree is a virtual balancing
   entry. Compute as `budget_group.budget - SUM(child_lines.budget)`.
9. **CSV import compatibility:** Mastt uses `{PREFIX} - {24_HEX}`
   separator for IDs, `PC {HEX}` for payment claims (single space,
   no dash). Monetary values use AU format (comma thousands, period
   decimal). Depth field is the sole hierarchy mechanism.

## 8. Sprint plan

See `/root/.claude/plans/dreamy-prancing-moon.md` for the Sprint 1
plan currently in progress. Backlog:

- **Sprint 2:** Budget tree UI, contract sections + multi-milestone,
  forecasts tab + FFC/variance dashboard cards
- **Sprint 3:** The 8-level Overall view, roll-up SQL view, reporting
- **Sprint 4:** CSV import compatible with Mastt format
- **Later:** Multi-project, client read-only shareable links
