-- =========================================================
-- CAPDCOOP Payment Method Details RLS Hardening
-- Purpose:
-- Protect payment instructions while allowing members to
-- view active payment channels.
--
-- Rules:
-- - Authenticated users can read active payment methods.
-- - Active admins can read all payment methods.
-- - Active admins can insert, update, and delete payment methods.
-- - Ordinary users cannot change payment instructions.
-- =========================================================

alter table public.payment_method_details enable row level security;


-- =========================================================
-- 1. Drop old broad policies
-- =========================================================

drop policy if exists "Admins can manage payment details"
on public.payment_method_details;

drop policy if exists "Authenticated users can read payment details"
on public.payment_method_details;


-- =========================================================
-- 2. Read policies
-- =========================================================

create policy "Authenticated users can read active payment details"
on public.payment_method_details
for select
to authenticated
using (is_active = true);


create policy "Active admins can read all payment details"
on public.payment_method_details
for select
to authenticated
using (public.is_active_admin());


-- =========================================================
-- 3. Admin management policies
-- =========================================================

create policy "Active admins can insert payment details"
on public.payment_method_details
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update payment details"
on public.payment_method_details
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Active admins can delete payment details"
on public.payment_method_details
for delete
to authenticated
using (public.is_active_admin());