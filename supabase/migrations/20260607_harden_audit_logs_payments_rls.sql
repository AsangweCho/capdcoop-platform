-- =========================================================
-- CAPDCOOP Audit Logs and Payments RLS Hardening
-- Purpose:
-- Remove remaining broad/public policies from audit_logs
-- and payments.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.audit_logs enable row level security;
alter table public.payments enable row level security;


-- =========================================================
-- 2. Audit Logs Policies
-- =========================================================

drop policy if exists "Admins can insert audit logs"
on public.audit_logs;

drop policy if exists "Super admins can read audit logs"
on public.audit_logs;


create policy "Active admins can insert audit logs"
on public.audit_logs
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can read audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_active_admin());


-- =========================================================
-- 3. Payments Policies
-- Remove old public/JWT-role based policies.
-- =========================================================

drop policy if exists "Admins can read all payments"
on public.payments;

drop policy if exists "Admins can read payments"
on public.payments;

drop policy if exists "Admins can insert payments"
on public.payments;

drop policy if exists "Admins can update payments"
on public.payments;

drop policy if exists "Members can insert own payments"
on public.payments;

drop policy if exists "Members can read own payments"
on public.payments;


-- =========================================================
-- 4. Payments Admin Policies
-- =========================================================

create policy "Active admins can read payments"
on public.payments
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert payments"
on public.payments
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update payments"
on public.payments
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


-- =========================================================
-- 5. Payments Member Policies
-- =========================================================

create policy "Members can insert own payments"
on public.payments
for insert
to authenticated
with check (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
  and coalesce(payment_status, 'pending') = 'pending'
);


create policy "Members can read own payments"
on public.payments
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);