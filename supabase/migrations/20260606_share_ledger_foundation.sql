-- =========================================================
-- CAPDCOOP Share Ledger Foundation
-- Purpose:
-- Create proper share products, share transactions,
-- and member share balances.
--
-- This supports both:
-- 1. Admin/agent recorded share collections
-- 2. Member portal share purchase submissions
-- =========================================================


-- =========================================================
-- 1. Share Products
-- =========================================================

create table if not exists public.share_products (
  id uuid primary key default gen_random_uuid(),

  product_name text not null default 'CAPDCOOP Ordinary Share',
  share_price numeric not null default 10000,

  currency text not null default 'XAF',
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'share_products_status_check'
      and conrelid = 'public.share_products'::regclass
  ) then
    alter table public.share_products
    add constraint share_products_status_check
    check (status in ('active', 'inactive'));
  end if;
end $$;

insert into public.share_products (
  product_name,
  share_price,
  currency,
  status
)
select
  'CAPDCOOP Ordinary Share',
  10000,
  'XAF',
  'active'
where not exists (
  select 1
  from public.share_products
  where product_name = 'CAPDCOOP Ordinary Share'
);


-- =========================================================
-- 2. Share Transactions
-- Official ledger of approved share purchases.
-- =========================================================

create table if not exists public.share_transactions (
  id uuid primary key default gen_random_uuid(),

  member_id uuid not null,
  share_product_id uuid,

  source_type text not null,
  source_id uuid,

  transaction_date date not null default current_date,

  amount_paid numeric not null default 0,
  share_price numeric not null default 10000,
  shares_purchased integer not null default 0,

  payment_method text,
  reference text,

  status text not null default 'posted',

  approved_by uuid,
  approved_at timestamptz,

  reversed_by uuid,
  reversed_at timestamptz,
  reversal_reason text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'share_transactions_source_type_check'
      and conrelid = 'public.share_transactions'::regclass
  ) then
    alter table public.share_transactions
    add constraint share_transactions_source_type_check
    check (source_type in ('collection', 'member_payment', 'manual_adjustment'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'share_transactions_status_check'
      and conrelid = 'public.share_transactions'::regclass
  ) then
    alter table public.share_transactions
    add constraint share_transactions_status_check
    check (status in ('posted', 'reversed', 'adjusted'));
  end if;
end $$;

create index if not exists idx_share_transactions_member_id
on public.share_transactions (member_id);

create index if not exists idx_share_transactions_source
on public.share_transactions (source_type, source_id);

create index if not exists idx_share_transactions_status
on public.share_transactions (status);

create index if not exists idx_share_transactions_transaction_date
on public.share_transactions (transaction_date);


-- =========================================================
-- 3. Member Share Balances
-- Summary of member shareholding.
-- =========================================================

create table if not exists public.member_share_balances (
  id uuid primary key default gen_random_uuid(),

  member_id uuid not null unique,

  total_shares integer not null default 0,
  total_share_value numeric not null default 0,
  declared_dividends numeric not null default 0,

  last_transaction_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_member_share_balances_member_id
on public.member_share_balances (member_id);


-- =========================================================
-- 4. Seed balances from existing members table
-- This is safe and does not remove existing member summary fields.
-- =========================================================

insert into public.member_share_balances (
  member_id,
  total_shares,
  total_share_value,
  declared_dividends,
  created_at,
  updated_at
)
select
  id,
  coalesce(total_shares, 0),
  coalesce(portfolio_value, 0),
  coalesce(declared_dividends, 0),
  now(),
  now()
from public.members
where not exists (
  select 1
  from public.member_share_balances b
  where b.member_id = members.id
);


-- =========================================================
-- 5. Comments
-- =========================================================

comment on table public.share_products is
'Defines CAPDCOOP share products and official share price.';

comment on table public.share_transactions is
'Official ledger of approved member share purchases from collections, member portal payments, or manual adjustments.';

comment on table public.member_share_balances is
'Summary table of each member shareholding, seeded from members.total_shares and members.portfolio_value.';