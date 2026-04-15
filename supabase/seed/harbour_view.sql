-- Seed: Harbour View Apartments — $17,000,000 sample project.
-- Idempotent: deletes any existing Harbour View project first.
--
-- Run this in the Supabase SQL editor AFTER running
-- 0001_mastt_schema.sql. It populates the budget tree (2 categories,
-- 5 groups, 11 line items), 4 contracts (each with a single section +
-- single milestone shim), 4 variations, and 5 payment claims.
--
-- The category/group structure groups the flat sample into a sensible
-- 2-level hierarchy so the app has something to show while Sprint 2
-- builds the full tree-editing UI.

begin;

do $seed$
declare
  -- Project
  project_id uuid;

  -- Categories
  cat_consultants uuid;
  cat_contractors uuid;

  -- Groups
  grp_prelim     uuid;
  grp_demolition uuid;
  grp_structure  uuid;
  grp_envelope   uuid;
  grp_services   uuid;

  -- Budget lines
  bl_prelim   uuid;
  bl_demo     uuid;
  bl_exc      uuid;
  bl_conc     uuid;
  bl_steel    uuid;
  bl_facade   uuid;
  bl_windows  uuid;
  bl_roofing  uuid;
  bl_mech     uuid;
  bl_elec     uuid;
  bl_hydr     uuid;

  -- Contracts
  ctr_apex      uuid;
  ctr_pacific   uuid;
  ctr_meridian  uuid;
  ctr_northline uuid;

  -- Sections
  sec_apex      uuid;
  sec_pacific   uuid;
  sec_meridian  uuid;
  sec_northline uuid;
begin
  -- Remove any prior Harbour View seed (cascades through FKs)
  delete from public.projects where title = 'Harbour View Apartments';

  -- ---------------------------------------------------------------------
  -- Project
  -- ---------------------------------------------------------------------
  insert into public.projects (title)
    values ('Harbour View Apartments')
    returning id into project_id;

  -- ---------------------------------------------------------------------
  -- Budget categories
  -- ---------------------------------------------------------------------
  insert into public.budget_categories (project_id, title, sort_order, status)
    values (project_id, 'Consultant Fees', 1, 'Approved')
    returning id into cat_consultants;

  insert into public.budget_categories (project_id, title, sort_order, status)
    values (project_id, 'Contractors', 2, 'Approved')
    returning id into cat_contractors;

  -- ---------------------------------------------------------------------
  -- Budget groups
  -- ---------------------------------------------------------------------
  insert into public.budget_groups (category_id, title, sort_order, status)
    values (cat_consultants, 'Preliminaries', 1, 'Approved')
    returning id into grp_prelim;

  insert into public.budget_groups (category_id, title, sort_order, status)
    values (cat_contractors, 'Demolition & Earthworks', 1, 'Approved')
    returning id into grp_demolition;

  insert into public.budget_groups (category_id, title, sort_order, status)
    values (cat_contractors, 'Structure', 2, 'Approved')
    returning id into grp_structure;

  insert into public.budget_groups (category_id, title, sort_order, status)
    values (cat_contractors, 'Envelope', 3, 'Approved')
    returning id into grp_envelope;

  insert into public.budget_groups (category_id, title, sort_order, status)
    values (cat_contractors, 'Services', 4, 'Approved')
    returning id into grp_services;

  -- ---------------------------------------------------------------------
  -- Budget lines (11 rows totalling $17,000,000)
  -- ---------------------------------------------------------------------
  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_prelim, '01-100', 'Preliminaries', 850000, 1)
    returning id into bl_prelim;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_demolition, '02-100', 'Demolition', 420000, 1)
    returning id into bl_demo;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_demolition, '02-200', 'Excavation & Piling', 1100000, 2)
    returning id into bl_exc;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_structure, '03-100', 'Concrete Structure', 4500000, 1)
    returning id into bl_conc;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_structure, '05-100', 'Structural Steel', 1350000, 2)
    returning id into bl_steel;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_envelope, '07-100', 'Facade & Cladding', 2900000, 1)
    returning id into bl_facade;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_envelope, '08-100', 'Windows & Doors', 1200000, 2)
    returning id into bl_windows;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_envelope, '07-500', 'Roofing', 680000, 3)
    returning id into bl_roofing;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_services, '15-100', 'Mechanical Services', 1450000, 1)
    returning id into bl_mech;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_services, '16-100', 'Electrical Services', 1550000, 2)
    returning id into bl_elec;

  insert into public.budget_lines (group_id, code, title, original_amount, sort_order)
    values (grp_services, '15-400', 'Hydraulic Services', 1000000, 3)
    returning id into bl_hydr;

  -- ---------------------------------------------------------------------
  -- Contracts
  -- Each contract auto-creates one "Main" section and one "Main"
  -- milestone wired to the target budget line. Sprint 2 introduces the
  -- UI for multi-section / multi-milestone contracts.
  -- ---------------------------------------------------------------------

  -- 1. Apex Concrete Pty Ltd → Concrete Structure
  insert into public.contracts (
    project_id, title, reference, vendor, status,
    retention_pct, contract_standard, date_approved
  ) values (
    project_id, 'Apex Concrete Pty Ltd', 'CT-001', 'Apex Concrete Pty Ltd',
    'Approved', 0.05, 'AS4902-2000', '2025-11-10'
  ) returning id into ctr_apex;

  insert into public.contract_sections (contract_id, title, sort_order)
    values (ctr_apex, 'Main', 1)
    returning id into sec_apex;

  insert into public.contract_milestones
    (contract_id, section_id, budget_line_id, title, original_value, status, sort_order)
    values (ctr_apex, sec_apex, bl_conc, 'Main', 4200000, 'Approved', 1);

  -- 2. Pacific Facade Systems → Facade & Cladding
  insert into public.contracts (
    project_id, title, reference, vendor, status,
    retention_pct, contract_standard, date_approved
  ) values (
    project_id, 'Pacific Facade Systems', 'CT-002', 'Pacific Facade Systems',
    'Approved', 0.05, 'AS4902-2000', '2025-12-04'
  ) returning id into ctr_pacific;

  insert into public.contract_sections (contract_id, title, sort_order)
    values (ctr_pacific, 'Main', 1)
    returning id into sec_pacific;

  insert into public.contract_milestones
    (contract_id, section_id, budget_line_id, title, original_value, status, sort_order)
    values (ctr_pacific, sec_pacific, bl_facade, 'Main', 2800000, 'Approved', 1);

  -- 3. Meridian Quantity Surveyors → Preliminaries
  insert into public.contracts (
    project_id, title, reference, vendor, status,
    retention_pct, contract_standard, date_approved
  ) values (
    project_id, 'Meridian Quantity Surveyors', 'CT-003', 'Meridian Quantity Surveyors',
    'Approved', 0, 'Contractor', '2025-10-01'
  ) returning id into ctr_meridian;

  insert into public.contract_sections (contract_id, title, sort_order)
    values (ctr_meridian, 'Main', 1)
    returning id into sec_meridian;

  insert into public.contract_milestones
    (contract_id, section_id, budget_line_id, title, original_value, status, sort_order)
    values (ctr_meridian, sec_meridian, bl_prelim, 'Main', 180000, 'Approved', 1);

  -- 4. Northline Structural Engineers → Preliminaries
  insert into public.contracts (
    project_id, title, reference, vendor, status,
    retention_pct, contract_standard, date_approved
  ) values (
    project_id, 'Northline Structural Engineers', 'CT-004', 'Northline Structural Engineers',
    'Approved', 0, 'Contractor', '2025-10-15'
  ) returning id into ctr_northline;

  insert into public.contract_sections (contract_id, title, sort_order)
    values (ctr_northline, 'Main', 1)
    returning id into sec_northline;

  insert into public.contract_milestones
    (contract_id, section_id, budget_line_id, title, original_value, status, sort_order)
    values (ctr_northline, sec_northline, bl_prelim, 'Main', 240000, 'Approved', 1);

  -- ---------------------------------------------------------------------
  -- Variations (new Mastt status vocabulary)
  -- ---------------------------------------------------------------------

  insert into public.variations (
    contract_id, budget_line_id, reference, title, description,
    contract_variation_no, status, category,
    date_received, date_approved,
    requested_amount, variation_amount,
    approved_by
  ) values (
    ctr_apex, bl_conc, 'VAR-001',
    'Apex - V001 - Additional rebar to L3 transfer slab',
    'Additional reinforcement added to level 3 transfer slab following updated structural drawings.',
    1, 'Approved', 'Scope Change',
    '2026-02-03', '2026-02-10',
    92000, 85000,
    'J. Tran (Principal)'
  );

  insert into public.variations (
    contract_id, budget_line_id, reference, title, description,
    contract_variation_no, status,
    date_received,
    requested_amount, variation_amount,
    days_claimed
  ) values (
    ctr_apex, bl_conc, 'VAR-002',
    'Apex - V002 - Weather delay extension of time',
    'EOT claim for 8 days of wet weather delays in February 2026.',
    2, 'Pending',
    '2026-03-05',
    48000, 42000,
    8
  );

  insert into public.variations (
    contract_id, budget_line_id, reference, title, description,
    contract_variation_no, status, category,
    date_received, date_approved,
    requested_amount, variation_amount,
    approved_by
  ) values (
    ctr_pacific, bl_facade, 'VAR-003',
    'Pacific - V003 - Upgrade to double-glazed curtain wall units',
    'Client-requested upgrade from single to double-glazed curtain wall units on south elevation.',
    1, 'Approved', 'Scope Change',
    '2026-01-18', '2026-01-22',
    170000, 156000,
    'J. Tran (Principal)'
  );

  -- VAR-004 was "Rejected" in the old model. Mastt doesn't have a
  -- Rejected status — rejection is tracked via date_rejected being set.
  -- Status stays at Pending so it doesn't flow into committed spend.
  insert into public.variations (
    contract_id, budget_line_id, reference, title, description,
    contract_variation_no, status,
    date_received, date_rejected,
    requested_amount, variation_amount,
    notes
  ) values (
    ctr_pacific, bl_facade, 'VAR-004',
    'Pacific - V004 - Crane standby during strata handover',
    'Crane standby costs claimed during handover of stage 1 strata units.',
    2, 'Pending',
    '2026-02-12', '2026-02-18',
    32000, 28000,
    'Rejected — standby not authorised under clause 34.3.'
  );

  -- ---------------------------------------------------------------------
  -- Payment claims
  -- value_completed tracks cumulative certified amount per contract.
  -- ---------------------------------------------------------------------

  -- Apex PC-01: $820k certified, $41k retention, Paid
  insert into public.payment_claims (
    contract_id, reference, title, contract_payment_no,
    status,
    claim_amount, submitted_amount, certified_amount,
    value_completed, previous_payments, retention_amount,
    period_from, period_to, month, month_paid,
    date, date_received, date_approved
  ) values (
    ctr_apex, 'PC-01', 'Apex — Progress Claim 01', 1,
    'Paid',
    850000, 850000, 820000,
    820000, 0, 41000,
    '2026-01-01', '2026-01-31', 'Jan 2026', 'Feb 2026',
    '2026-01-28', '2026-01-30', '2026-02-02'
  );

  -- Apex PC-02: $900k certified, $45k retention, Certified (not yet paid)
  insert into public.payment_claims (
    contract_id, reference, title, contract_payment_no,
    status,
    claim_amount, submitted_amount, certified_amount,
    value_completed, previous_payments, retention_amount,
    period_from, period_to, month,
    date, date_received, date_approved
  ) values (
    ctr_apex, 'PC-02', 'Apex — Progress Claim 02', 2,
    'Certified',
    920000, 920000, 900000,
    1720000, 820000, 45000,
    '2026-02-01', '2026-02-28', 'Feb 2026',
    '2026-02-28', '2026-03-02', '2026-03-08'
  );

  -- Apex PC-03: Draft, no cert yet
  insert into public.payment_claims (
    contract_id, reference, title, contract_payment_no,
    status,
    claim_amount, submitted_amount, certified_amount,
    value_completed, previous_payments, retention_amount,
    period_from, period_to, month,
    date, date_received
  ) values (
    ctr_apex, 'PC-03', 'Apex — Progress Claim 03', 3,
    'Draft',
    600000, 600000, 0,
    1720000, 1720000, 0,
    '2026-03-01', '2026-03-31', 'Mar 2026',
    '2026-03-30', '2026-03-30'
  );

  -- Pacific PC-04: $460k certified, $23k retention, Paid
  insert into public.payment_claims (
    contract_id, reference, title, contract_payment_no,
    status,
    claim_amount, submitted_amount, certified_amount,
    value_completed, previous_payments, retention_amount,
    period_from, period_to, month, month_paid,
    date, date_received, date_approved
  ) values (
    ctr_pacific, 'PC-04', 'Pacific — Progress Claim 01', 1,
    'Paid',
    480000, 480000, 460000,
    460000, 0, 23000,
    '2026-02-01', '2026-02-28', 'Feb 2026', 'Mar 2026',
    '2026-02-15', '2026-02-18', '2026-02-24'
  );

  -- Meridian PC-05: $45k certified, 0% retention, Paid
  insert into public.payment_claims (
    contract_id, reference, title, contract_payment_no,
    status,
    claim_amount, submitted_amount, certified_amount,
    value_completed, previous_payments, retention_amount,
    period_from, period_to, month, month_paid,
    date, date_received, date_approved
  ) values (
    ctr_meridian, 'PC-05', 'Meridian — Invoice 01', 1,
    'Paid',
    45000, 45000, 45000,
    45000, 0, 0,
    '2026-02-01', '2026-02-28', 'Feb 2026', 'Feb 2026',
    '2026-02-05', '2026-02-05', '2026-02-07'
  );

end $seed$;

commit;
