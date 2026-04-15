-- Sprint 1: Mastt data model in Supabase
-- Reference: docs/mastt-data-model.md
--
-- Run this migration in the Supabase SQL editor after creating the
-- project. It creates all tables, indexes, RLS policies, and update
-- triggers for the cost-control schema.

begin;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- updated_at trigger function (shared)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Projects (Mastt: CP)
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Budget hierarchy
--    projects → budget_categories → budget_groups → budget_lines
-- ---------------------------------------------------------------------------

create table if not exists public.budget_categories (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  sort_order   integer not null default 0,
  status       text check (status in ('Approved') or status is null),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists budget_categories_project_id_idx
  on public.budget_categories (project_id, sort_order);

create trigger budget_categories_set_updated_at
  before update on public.budget_categories
  for each row execute function public.set_updated_at();


create table if not exists public.budget_groups (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.budget_categories(id) on delete cascade,
  title         text not null,
  sort_order    integer not null default 0,
  status        text check (status in ('Approved') or status is null),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists budget_groups_category_id_idx
  on public.budget_groups (category_id, sort_order);

create trigger budget_groups_set_updated_at
  before update on public.budget_groups
  for each row execute function public.set_updated_at();


create table if not exists public.budget_lines (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.budget_groups(id) on delete cascade,
  code              text,
  title             text not null,
  original_amount   numeric(15, 2) not null default 0,
  adjustments_in    numeric(15, 2) not null default 0,
  adjustments_out   numeric(15, 2) not null default 0,
  status            text check (status in ('Approved') or status is null),
  tag               text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists budget_lines_group_id_idx
  on public.budget_lines (group_id, sort_order);

create trigger budget_lines_set_updated_at
  before update on public.budget_lines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Contracts, sections, milestones
-- ---------------------------------------------------------------------------

create table if not exists public.contracts (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null references public.projects(id) on delete cascade,
  title                    text not null,
  reference                text,
  vendor                   text,
  po_number                text,
  contract_standard        text,                   -- e.g. 'AS4902-2000', 'Contractor'
  status                   text not null default 'Pending'
    check (status in ('Approved', 'Pending', 'Part-Approved')),
  principal_org            text,
  pm_org                   text,
  retention_pct            numeric(6, 4) not null default 0  -- 0..1
    check (retention_pct >= 0 and retention_pct <= 1),
  tax_percent              numeric(5, 2) not null default 10,
  contract_completion_date date,
  eot_days                 integer not null default 0,
  revised_completion_date  date,
  date_approved            date,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists contracts_project_id_idx
  on public.contracts (project_id);

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();


create table if not exists public.contract_sections (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references public.contracts(id) on delete cascade,
  title         text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists contract_sections_contract_id_idx
  on public.contract_sections (contract_id, sort_order);

create trigger contract_sections_set_updated_at
  before update on public.contract_sections
  for each row execute function public.set_updated_at();


create table if not exists public.contract_milestones (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null references public.contracts(id) on delete cascade,
  section_id       uuid references public.contract_sections(id) on delete set null,
  budget_line_id   uuid not null references public.budget_lines(id) on delete restrict,
  title            text not null,
  original_value   numeric(15, 2) not null default 0,
  status           text check (status in ('Approved', 'Pending', 'Part-Approved') or status is null),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists contract_milestones_contract_id_idx
  on public.contract_milestones (contract_id, sort_order);

create index if not exists contract_milestones_budget_line_id_idx
  on public.contract_milestones (budget_line_id);

create index if not exists contract_milestones_section_id_idx
  on public.contract_milestones (section_id);

create trigger contract_milestones_set_updated_at
  before update on public.contract_milestones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Variations
-- ---------------------------------------------------------------------------

create table if not exists public.variations (
  id                       uuid primary key default gen_random_uuid(),
  contract_id              uuid not null references public.contracts(id) on delete cascade,
  budget_line_id           uuid references public.budget_lines(id) on delete set null,
  reference                text,
  title                    text not null,
  description              text,
  contract_variation_no    integer,
  variation_no             text,
  clause                   text,
  vpr_no                   text,
  va_no                    text,
  vo_no                    text,
  status                   text not null default 'Pending'
    check (status in ('Forecast', 'Pending', 'In Principle', 'Approved')),
  category                 text check (category in ('Scope Change', 'Latent Conditions') or category is null),
  date_received            date,
  date_approved            date,
  date_rejected            date,
  requested_amount         numeric(15, 2),
  variation_amount         numeric(15, 2) not null default 0,
  approved_by              text,
  days_claimed             integer,
  days_approved            integer,
  current_completion_date  date,
  revised_completion_date  date,
  tax_percent              numeric(5, 2) not null default 10,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists variations_contract_id_idx
  on public.variations (contract_id);

create index if not exists variations_budget_line_id_idx
  on public.variations (budget_line_id);

create trigger variations_set_updated_at
  before update on public.variations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Payment claims
-- ---------------------------------------------------------------------------

create table if not exists public.payment_claims (
  id                    uuid primary key default gen_random_uuid(),
  contract_id           uuid not null references public.contracts(id) on delete cascade,
  reference             text,                         -- e.g. 'PC-01'
  title                 text,                         -- display name for claim row
  contract_payment_no   integer,                      -- sequential within contract
  project_payment_no    integer,                      -- sequential across the project
  status                text not null default 'Approved'
    check (status in ('Paid', 'Approved', 'Draft', 'Certified')),
  -- Mastt only uses Paid/Approved. We allow Draft/Certified during data entry
  -- so the user can track claims before they're approved for payment.
  claim_amount          numeric(15, 2) not null default 0,   -- Requested by contractor
  submitted_amount      numeric(15, 2),                      -- Submitted amount (raw claim)
  certified_amount      numeric(15, 2) not null default 0,   -- Approved/certified
  value_completed       numeric(15, 2),                      -- Cumulative value completed to date
  percent_completed     numeric(5, 2),                       -- Cumulative %
  previous_payments     numeric(15, 2),
  retention_amount      numeric(15, 2) not null default 0,
  period_from           date,
  period_to             date,
  month                 text,                          -- e.g. 'Mar 2025'
  month_paid            text,
  date_received         date,
  date_approved         date,
  date_payment_due      date,
  date                  date,                          -- headline date (certificate)
  invoice               text,
  payment_reference     text,
  po_number             text,
  vendor                text,
  reimbursable          boolean not null default false,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists payment_claims_contract_id_idx
  on public.payment_claims (contract_id, contract_payment_no);

create trigger payment_claims_set_updated_at
  before update on public.payment_claims
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Forecasts (soft commitments — feeds FFC in Sprint 2)
-- ---------------------------------------------------------------------------

create table if not exists public.forecasts (
  id               uuid primary key default gen_random_uuid(),
  budget_line_id   uuid not null references public.budget_lines(id) on delete cascade,
  title            text not null,
  amount           numeric(15, 2) not null default 0,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists forecasts_budget_line_id_idx
  on public.forecasts (budget_line_id);

create trigger forecasts_set_updated_at
  before update on public.forecasts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row-level security
--
-- Sprint 1 policy: a single allowlisted email can do everything. We use a
-- GUC ('app.allowed_email') set at the database level via
-- `alter database postgres set app.allowed_email = 'you@example.com';`
-- so the policy stays declarative and doesn't hardcode the email in SQL.
--
-- Anyone not signed in, or signed in with a different email, gets nothing.
-- ---------------------------------------------------------------------------

alter table public.projects            enable row level security;
alter table public.budget_categories   enable row level security;
alter table public.budget_groups       enable row level security;
alter table public.budget_lines        enable row level security;
alter table public.contracts           enable row level security;
alter table public.contract_sections   enable row level security;
alter table public.contract_milestones enable row level security;
alter table public.variations          enable row level security;
alter table public.payment_claims      enable row level security;
alter table public.forecasts           enable row level security;

create or replace function public.is_app_owner()
returns boolean
language sql
stable
as $$
  select
    auth.uid() is not null
    and coalesce(
      auth.jwt() ->> 'email',
      ''
    ) = coalesce(current_setting('app.allowed_email', true), '');
$$;

do $$
declare
  tbl text;
  tables text[] := array[
    'projects',
    'budget_categories',
    'budget_groups',
    'budget_lines',
    'contracts',
    'contract_sections',
    'contract_milestones',
    'variations',
    'payment_claims',
    'forecasts'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'drop policy if exists %I_owner_all on public.%I',
      tbl, tbl
    );
    execute format(
      'create policy %I_owner_all on public.%I
         for all
         using (public.is_app_owner())
         with check (public.is_app_owner())',
      tbl, tbl
    );
  end loop;
end $$;

commit;
