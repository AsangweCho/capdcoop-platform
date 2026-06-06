-- =========================================================
-- CAPDCOOP Members RLS Hardening
-- Purpose:
-- Replace broad/duplicate member policies with clearer access rules.
--
-- Rules:
-- - Active admins can read, insert, and update members.
-- - Members can read their own record.
-- - Members can create their own pending member record.
-- - Members can update their own record temporarily.
-- - Agents can read members they registered.
-- =========================================================

alter table public.members enable row level security;


-- =========================================================
-- 1. Drop old broad or duplicate policies
-- =========================================================

drop policy if exists "Admins can insert members"
on public.members;

drop policy if exists "Admins can read all members"
on public.members;

drop policy if exists "Admins can read members"
on public.members;

drop policy if exists "Admins can update members"
on public.members;

drop policy if exists "Agents can read their registered members"
on public.members;

drop policy if exists "Members can read own record"
on public.members;

drop policy if exists "Members can update own password flag"
on public.members;

drop policy if exists "Members can update own profile"
on public.members;

drop policy if exists "Users can create their own pending member record"
on public.members;


-- =========================================================
-- 2. Admin policies
-- =========================================================

create policy "Active admins can read members"
on public.members
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert members"
on public.members
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update members"
on public.members
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


-- =========================================================
-- 3. Member self-service policies
-- =========================================================

create policy "Members can read own member record"
on public.members
for select
to authenticated
using (auth.uid() = auth_user_id);


create policy "Members can create own pending member record"
on public.members
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
  and membership_status = 'pending'
);


create policy "Members can update own member record"
on public.members
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);


-- =========================================================
-- 4. Agent visibility policy
-- =========================================================

create policy "Agents can read their registered members"
on public.members
for select
to authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.auth_user_id = auth.uid()
      and a.id = members.registered_by_agent_id
      and coalesce(a.status, 'active') = 'active'
  )
);