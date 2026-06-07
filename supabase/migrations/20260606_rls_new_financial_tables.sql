-- =========================================================
-- CAPDCOOP RLS for New Financial Foundation Tables
-- Purpose:
-- Add safe read policies for new ledger/foundation tables.
--
-- Principle:
-- - Members read only their own records.
-- - Active admins/finance/super_admin can read operational records.
-- - Direct insert/update/delete remains blocked for normal frontend use.
-- - Posting is done through protected SECURITY DEFINER functions.
-- =========================================================


-- =========================================================
-- 1. Ensure RLS is enabled
-- =========================================================

alter table public.aid_payments enable row level security;
alter table public.collection_allocations enable row level security;
alter table public.financial_event_logs enable row level security;
alter table public.share_transactions enable row level security;
alter table public.member_share_balances enable row level security;
alter table public.share_products enable row level security;


-- =========================================================
-- 2. Drop existing policies if rerun
-- =========================================================

drop policy if exists "Admins can read aid payments" on public.aid_payments;
drop policy if exists "Members can read own aid payments" on public.aid_payments;

drop policy if exists "Admins can read collection allocations" on public.collection_allocations;

drop policy if exists "Admins can read financial event logs" on public.financial_event_logs;

drop policy if exists "Admins can read share transactions" on public.share_transactions;
drop policy if exists "Members can read own share transactions" on public.share_transactions;

drop policy if exists "Admins can read member share balances" on public.member_share_balances;
drop policy if exists "Members can read own share balance" on public.member_share_balances;

drop policy if exists "Authenticated users can read active share products" on public.share_products;
drop policy if exists "Admins can manage share products" on public.share_products;


-- =========================================================
-- 3. Aid Payments
-- =========================================================

create policy "Admins can read aid payments"
on public.aid_payments
for select
to authenticated
using (public.is_active_admin());

create policy "Members can read own aid payments"
on public.aid_payments
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);


-- =========================================================
-- 4. Collection Allocations
-- Admin/finance operational visibility only.
-- Members should not see internal allocation mechanics yet.
-- =========================================================

create policy "Admins can read collection allocations"
on public.collection_allocations
for select
to authenticated
using (public.is_active_admin());


-- =========================================================
-- 5. Financial Event Logs
-- Admin/finance/auditor visibility later.
-- For now: active admins only.
-- =========================================================

create policy "Admins can read financial event logs"
on public.financial_event_logs
for select
to authenticated
using (public.is_active_admin());


-- =========================================================
-- 6. Share Transactions
-- =========================================================

create policy "Admins can read share transactions"
on public.share_transactions
for select
to authenticated
using (public.is_active_admin());

create policy "Members can read own share transactions"
on public.share_transactions
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);


-- =========================================================
-- 7. Member Share Balances
-- =========================================================

create policy "Admins can read member share balances"
on public.member_share_balances
for select
to authenticated
using (public.is_active_admin());

create policy "Members can read own share balance"
on public.member_share_balances
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);


-- =========================================================
-- 8. Share Products
-- Share product pricing can be read by all authenticated users.
-- Only active admins should manage it later.
-- =========================================================

create policy "Authenticated users can read active share products"
on public.share_products
for select
to authenticated
using (status = 'active');

create policy "Admins can manage share products"
on public.share_products
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());