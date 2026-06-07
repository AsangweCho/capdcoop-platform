-- =========================================================
-- CAPDCOOP Aid Repayment Schedule RLS Hardening
-- Purpose:
-- Replace broad authenticated access to repayment schedules
-- with role-based access.
--
-- Current table name remains loan_repayment_schedule until
-- the future migration to aid_repayment_schedule.
--
-- Rules:
-- - Active admins can read, insert, and update schedules.
-- - Members can read only their own schedule rows.
-- - Agents can read schedules for members they registered.
-- - No delete policy for normal frontend use.
-- =========================================================

alter table public.loan_repayment_schedule enable row level security;


-- =========================================================
-- 1. Drop old broad policy
-- =========================================================

drop policy if exists "Authenticated users can manage repayment schedules"
on public.loan_repayment_schedule;


-- =========================================================
-- 2. Admin policies
-- =========================================================

create policy "Active admins can read aid repayment schedules"
on public.loan_repayment_schedule
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert aid repayment schedules"
on public.loan_repayment_schedule
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update aid repayment schedules"
on public.loan_repayment_schedule
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


-- =========================================================
-- 3. Member read policy
-- =========================================================

create policy "Members can read own aid repayment schedules"
on public.loan_repayment_schedule
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
-- 4. Agent read policy
-- Agents can read schedules for members they registered.
-- =========================================================

create policy "Agents can read assigned aid repayment schedules"
on public.loan_repayment_schedule
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    join public.agents a on a.id = m.registered_by_agent_id
    where a.auth_user_id = auth.uid()
      and coalesce(a.status, 'active') = 'active'
  )
);