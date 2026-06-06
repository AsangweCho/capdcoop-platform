-- =========================================================
-- CAPDCOOP Collections RLS Hardening
-- Purpose:
-- Replace broad collections access with role-based rules.
--
-- Rules:
-- - Active admins can read, insert, update collections.
-- - Agents can insert collections only as themselves.
-- - Agents can read collections they recorded.
-- - Members can read their own collections.
-- - Deletes are not allowed through normal frontend policies.
-- =========================================================

alter table public.collections enable row level security;


-- =========================================================
-- 1. Drop old broad policies
-- =========================================================

drop policy if exists "Admins can manage collections"
on public.collections;


-- =========================================================
-- 2. Admin policies
-- =========================================================

create policy "Active admins can read collections"
on public.collections
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert collections"
on public.collections
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update collections"
on public.collections
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


-- =========================================================
-- 3. Agent policies
-- Agents can create/read collections tied to their own agent profile.
-- =========================================================

create policy "Agents can insert own collections"
on public.collections
for insert
to authenticated
with check (
  exists (
    select 1
    from public.agents a
    where a.auth_user_id = auth.uid()
      and a.id = collections.agent_id
      and coalesce(a.status, 'active') = 'active'
  )
);


create policy "Agents can read own collections"
on public.collections
for select
to authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.auth_user_id = auth.uid()
      and a.id = collections.agent_id
      and coalesce(a.status, 'active') = 'active'
  )
);


-- =========================================================
-- 4. Member read policy
-- Members can read collections linked to their own member record.
-- =========================================================

create policy "Members can read own collections"
on public.collections
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);