-- =========================================================
-- CAPDCOOP Misc Operational RLS Hardening
-- Purpose:
-- Secure notices, daily_collections, and legacy repayment table.
--
-- Notes:
-- - daily_collections is currently legacy/import-oriented.
-- - loan_repayments is legacy and will later be replaced by aid_payments.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.notices enable row level security;
alter table public.daily_collections enable row level security;
alter table public.loan_repayments enable row level security;


-- =========================================================
-- 2. Drop old policies where they exist
-- =========================================================

drop policy if exists "Admins can insert daily collections"
on public.daily_collections;

drop policy if exists "Admins can read daily collections"
on public.daily_collections;

drop policy if exists "Admins can update daily collections"
on public.daily_collections;

drop policy if exists "Admins can insert repayments"
on public.loan_repayments;

drop policy if exists "Admins can read repayments"
on public.loan_repayments;

drop policy if exists "Admins can update repayments"
on public.loan_repayments;


-- =========================================================
-- 3. Notices policies
-- =========================================================

drop policy if exists "Authenticated users can read notices"
on public.notices;

drop policy if exists "Active admins can insert notices"
on public.notices;

drop policy if exists "Active admins can update notices"
on public.notices;

drop policy if exists "Active admins can delete notices"
on public.notices;


create policy "Authenticated users can read notices"
on public.notices
for select
to authenticated
using (true);


create policy "Active admins can insert notices"
on public.notices
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update notices"
on public.notices
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Active admins can delete notices"
on public.notices
for delete
to authenticated
using (public.is_active_admin());


-- =========================================================
-- 4. Daily Collections policies
-- =========================================================

create policy "Active admins can read daily collections"
on public.daily_collections
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert daily collections"
on public.daily_collections
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update daily collections"
on public.daily_collections
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


-- =========================================================
-- 5. Legacy Loan Repayments policies
-- This table is legacy. New aid repayments should use aid_payments.
-- =========================================================

create policy "Active admins can read legacy repayments"
on public.loan_repayments
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert legacy repayments"
on public.loan_repayments
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update legacy repayments"
on public.loan_repayments
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Members can read own legacy repayments"
on public.loan_repayments
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);