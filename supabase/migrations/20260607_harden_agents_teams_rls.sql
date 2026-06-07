-- =========================================================
-- CAPDCOOP Agents and Agent Teams RLS Hardening
-- Purpose:
-- Protect staff/field-agent records and team structures.
--
-- Rules:
-- - Active admins can read, insert, and update agents.
-- - Agents can read their own agent profile.
-- - Active admins can read, insert, and update agent teams.
-- - Agents can read their own assigned team.
-- - No broad authenticated ALL true access.
-- - No normal frontend delete policy.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.agents enable row level security;
alter table public.agent_teams enable row level security;


-- =========================================================
-- 2. Drop old broad policies
-- =========================================================

drop policy if exists "Admins can manage agents"
on public.agents;

drop policy if exists "Agents can read own profile"
on public.agents;

drop policy if exists "Admins can manage agent teams"
on public.agent_teams;


-- =========================================================
-- 3. Agents policies
-- =========================================================

create policy "Active admins can read agents"
on public.agents
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert agents"
on public.agents
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update agents"
on public.agents
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Agents can read own profile"
on public.agents
for select
to authenticated
using (
  auth_user_id = auth.uid()
  and coalesce(status, 'active') = 'active'
);


-- =========================================================
-- 4. Agent Teams policies
-- =========================================================

create policy "Active admins can read agent teams"
on public.agent_teams
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert agent teams"
on public.agent_teams
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update agent teams"
on public.agent_teams
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Agents can read own team"
on public.agent_teams
for select
to authenticated
using (
  id in (
    select a.team_id
    from public.agents a
    where a.auth_user_id = auth.uid()
      and coalesce(a.status, 'active') = 'active'
      and a.team_id is not null
  )
);