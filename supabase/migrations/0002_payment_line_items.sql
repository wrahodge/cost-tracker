-- Sprint 2+: Payment line items — per-milestone and per-variation
-- breakdown for each payment claim. Required for the Payment Schedule
-- PDF report and the Line Items tab in the Add/Edit Payment modal.

begin;

-- ---------------------------------------------------------------------------
-- payment_line_items — one row per (payment_claim, contract_milestone)
-- ---------------------------------------------------------------------------

create table if not exists public.payment_line_items (
  id                     uuid primary key default gen_random_uuid(),
  payment_claim_id       uuid not null references public.payment_claims(id) on delete cascade,
  contract_milestone_id  uuid not null references public.contract_milestones(id) on delete cascade,
  approved_value         numeric(15, 2) not null default 0,   -- milestone original_value snapshot
  this_payment           numeric(15, 2) not null default 0,   -- amount claimed this payment
  previous_total         numeric(15, 2) not null default 0,   -- cumulative prior payments
  percent_complete       numeric(5, 2) not null default 0,    -- cumulative % complete
  submitted_amount       numeric(15, 2),                      -- submitted (raw) for this line
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists payment_line_items_claim_idx
  on public.payment_line_items (payment_claim_id);

create index if not exists payment_line_items_milestone_idx
  on public.payment_line_items (contract_milestone_id);

create trigger payment_line_items_set_updated_at
  before update on public.payment_line_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payment_variation_items — one row per (payment_claim, variation)
-- ---------------------------------------------------------------------------

create table if not exists public.payment_variation_items (
  id                     uuid primary key default gen_random_uuid(),
  payment_claim_id       uuid not null references public.payment_claims(id) on delete cascade,
  variation_id           uuid not null references public.variations(id) on delete cascade,
  approved_value         numeric(15, 2) not null default 0,   -- variation_amount snapshot
  this_payment           numeric(15, 2) not null default 0,
  previous_total         numeric(15, 2) not null default 0,
  percent_complete       numeric(5, 2) not null default 0,
  submitted_amount       numeric(15, 2),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists payment_variation_items_claim_idx
  on public.payment_variation_items (payment_claim_id);

create index if not exists payment_variation_items_variation_idx
  on public.payment_variation_items (variation_id);

create trigger payment_variation_items_set_updated_at
  before update on public.payment_variation_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — same owner-only policy as every other table
-- ---------------------------------------------------------------------------

alter table public.payment_line_items      enable row level security;
alter table public.payment_variation_items enable row level security;

create policy payment_line_items_owner_all
  on public.payment_line_items
  for all
  using (public.is_app_owner())
  with check (public.is_app_owner());

create policy payment_variation_items_owner_all
  on public.payment_variation_items
  for all
  using (public.is_app_owner())
  with check (public.is_app_owner());

commit;
