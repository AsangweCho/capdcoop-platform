-- =========================================================
-- CAPDCOOP Savings RLS Hardening
-- Purpose:
-- Replace broad savings policies with role-based access.
--
-- Rules:
-- - Active admins can manage savings accounts, transactions, and withdrawals.
-- - Members can read only their own savings records.
-- - Members cannot directly insert/update savings transactions.
-- - Savings deposits are posted through protected functions.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.savings_accounts enable row level security;
alter table public.savings_transactions enable row level security;
alter table public.savings_withdrawals enable row level security;


-- =========================================================
-- 2. Drop old broad policies
-- =========================================================

drop policy if exists "Admins can manage savings accounts"
on public.savings_accounts;

drop policy if exists "Admins can manage savings transactions"
on public.savings_transactions;

drop policy if exists "Admins can manage savings withdrawals"
on public.savings_withdrawals;


-- =========================================================
-- 3. Savings Accounts Policies
-- =========================================================

create policy "Active admins can read savings accounts"
on public.savings_accounts
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert savings accounts"
on public.savings_accounts
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update savings accounts"
on public.savings_accounts
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Members can read own savings accounts"
on public.savings_accounts
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
-- 4. Savings Transactions Policies
-- Direct insert/update should remain admin-only for now.
-- Deposits should flow through post_approved_savings_collection().
-- =========================================================

create policy "Active admins can read savings transactions"
on public.savings_transactions
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert savings transactions"
on public.savings_transactions
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update savings transactions"
on public.savings_transactions
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Members can read own savings transactions"
on public.savings_transactions
for select
to authenticated
using (
  savings_account_id in (
    select sa.id
    from public.savings_accounts sa
    join public.members m on m.id = sa.member_id
    where m.auth_user_id = auth.uid()
  )
);


-- =========================================================
-- 5. Savings Withdrawals Policies
-- Withdrawals are sensitive and should be approved by admins.
-- Member request flow can be added later through a controlled function.
-- =========================================================

create policy "Active admins can read savings withdrawals"
on public.savings_withdrawals
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert savings withdrawals"
on public.savings_withdrawals
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update savings withdrawals"
on public.savings_withdrawals
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Members can read own savings withdrawals"
on public.savings_withdrawals
for select
to authenticated
using (
  savings_account_id in (
    select sa.id
    from public.savings_accounts sa
    join public.members m on m.id = sa.member_id
    where m.auth_user_id = auth.uid()
  )
);