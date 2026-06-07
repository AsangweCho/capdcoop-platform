-- =========================================================
-- CAPDCOOP Aid Recovery and Audit RLS Hardening
-- Purpose:
-- Protect sensitive aid recovery notes and aid audit logs.
--
-- Current table names still use loan_* until later migration.
--
-- Rules:
-- - Active admins can read recovery notes and audit logs.
-- - Active admins can insert/update recovery notes.
-- - Active admins can insert audit logs.
-- - Audit logs should not be updated or deleted from the frontend.
-- - Members should not read recovery/audit logs directly.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.loan_recovery_notes enable row level security;
alter table public.loan_audit_logs enable row level security;


-- =========================================================
-- 2. Drop old broad recovery policy
-- =========================================================

drop policy if exists "Authenticated users can manage recovery notes"
on public.loan_recovery_notes;


-- =========================================================
-- 3. Recovery notes policies
-- =========================================================

create policy "Active admins can read aid recovery notes"
on public.loan_recovery_notes
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert aid recovery notes"
on public.loan_recovery_notes
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update aid recovery notes"
on public.loan_recovery_notes
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


-- =========================================================
-- 4. Audit logs policies
-- =========================================================

drop policy if exists "Active admins can read aid audit logs"
on public.loan_audit_logs;

drop policy if exists "Active admins can insert aid audit logs"
on public.loan_audit_logs;


create policy "Active admins can read aid audit logs"
on public.loan_audit_logs
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert aid audit logs"
on public.loan_audit_logs
for insert
to authenticated
with check (public.is_active_admin());