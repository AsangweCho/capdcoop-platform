-- =========================================================
-- CAPDCOOP Aid Ledger Foundation
-- Purpose:
-- Create safe future-facing ledger tables without deleting
-- or renaming existing loan-related tables.
-- =========================================================


-- =========================================================
-- 1. Aid Payments
-- Approved aid repayment ledger.
-- This will eventually replace loan_repayments.
-- =========================================================

create table if not exists public.aid_payments (
  id uuid primary key default gen_random_uuid(),

  aid_facility_id uuid,
  member_id uuid,

  collection_id uuid,
  schedule_id uuid,

  payment_date date not null default current_date,
  amount numeric not null default 0,

  payment_method text,
  reference text,

  collected_by_agent_id uuid,
  approved_by uuid,
  approved_at timestamptz,

  status text not null default 'posted',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.aid_payments
add constraint aid_payments_status_check
check (status in ('posted', 'reversed', 'adjusted'));

create index if not exists idx_aid_payments_aid_facility_id
on public.aid_payments (aid_facility_id);

create index if not exists idx_aid_payments_member_id
on public.aid_payments (member_id);

create index if not exists idx_aid_payments_collection_id
on public.aid_payments (collection_id);

create index if not exists idx_aid_payments_schedule_id
on public.aid_payments (schedule_id);

create index if not exists idx_aid_payments_payment_date
on public.aid_payments (payment_date);


-- =========================================================
-- 2. Collection Allocations
-- Allows one recorded collection to be split across aid,
-- savings, shares, fees, or other approved financial uses.
-- =========================================================

create table if not exists public.collection_allocations (
  id uuid primary key default gen_random_uuid(),

  collection_id uuid not null,
  member_id uuid,

  allocation_type text not null,
  target_table text,
  target_record_id uuid,

  amount numeric not null default 0,

  status text not null default 'pending',

  posted_at timestamptz,
  posted_by uuid,

  reversed_at timestamptz,
  reversed_by uuid,
  reversal_reason text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.collection_allocations
add constraint collection_allocations_allocation_type_check
check (
  allocation_type in (
    'aid_repayment',
    'savings_deposit',
    'share_purchase',
    'registration_fee',
    'insurance_fee',
    'service_charge',
    'other'
  )
);

alter table public.collection_allocations
add constraint collection_allocations_status_check
check (status in ('pending', 'posted', 'reversed'));

create index if not exists idx_collection_allocations_collection_id
on public.collection_allocations (collection_id);

create index if not exists idx_collection_allocations_member_id
on public.collection_allocations (member_id);

create index if not exists idx_collection_allocations_allocation_type
on public.collection_allocations (allocation_type);

create index if not exists idx_collection_allocations_status
on public.collection_allocations (status);


-- =========================================================
-- 3. Financial Event Logs
-- General financial audit trail for sensitive money events.
-- =========================================================

create table if not exists public.financial_event_logs (
  id uuid primary key default gen_random_uuid(),

  event_type text not null,
  module_name text not null,

  entity_table text,
  entity_id uuid,

  member_id uuid,
  agent_id uuid,

  amount numeric,

  old_data jsonb,
  new_data jsonb,
  metadata jsonb,

  reason text,

  performed_by uuid,
  performed_at timestamptz not null default now()
);

create index if not exists idx_financial_event_logs_event_type
on public.financial_event_logs (event_type);

create index if not exists idx_financial_event_logs_module_name
on public.financial_event_logs (module_name);

create index if not exists idx_financial_event_logs_entity
on public.financial_event_logs (entity_table, entity_id);

create index if not exists idx_financial_event_logs_member_id
on public.financial_event_logs (member_id);

create index if not exists idx_financial_event_logs_agent_id
on public.financial_event_logs (agent_id);

create index if not exists idx_financial_event_logs_performed_at
on public.financial_event_logs (performed_at);


-- =========================================================
-- 4. Comments
-- =========================================================

comment on table public.aid_payments is
'Approved aid repayment ledger. Future replacement for loan_repayments.';

comment on table public.collection_allocations is
'Allocation records showing how a recorded collection is applied across aid, savings, shares, fees, or other uses.';

comment on table public.financial_event_logs is
'General financial audit trail for money-related events across CAPDCOOP.';