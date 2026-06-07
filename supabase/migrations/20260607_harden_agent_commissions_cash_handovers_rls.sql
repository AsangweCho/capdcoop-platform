-- =========================================================
-- CAPDCOOP Agent Commissions and Cash Handovers RLS Hardening
-- Purpose:
-- Restrict access to agent earnings and cash reconciliation records.
--
-- Rules:
-- - Active admins can manage all agent commissions.
-- - Agents can read only their own commissions.
-- - Active admins can manage all cash handovers.
-- - Agents can read their own handovers.
-- - Agents can insert their own handovers if required by workflow.
-- - No broad authenticated ALL true access.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.agent_commissions enable row level security;
alter table public.cash_handovers enable row level security;


-- =========================================================
-- 2. Drop old broad policies
-- =========================================================

drop policy if exists "Admins can manage agent commissions"
on public.agent_commissions;

drop policy if exists "Admins can manage cash handovers"
on public.cash_handovers;


-- =========================================================
-- 3. Agent Commissions policies
-- =========================================================

create policy "Active admins can read agent commissions"
on public.agent_commissions
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert agent commissions"
on public.agent_commissions
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update agent commissions"
on public.agent_commissions
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Agents can read own commissions"
on public.agent_commissions
for select
to authenticated
using (
  agent_id in (
    select a.id
    from public.agents a
    where a.auth_user_id = auth.uid()
      and coalesce(a.status, 'active') = 'active'
  )
);


-- =========================================================
-- 4. Cash Handovers policies
-- =========================================================

create policy "Active admins can read cash handovers"
on public.cash_handovers
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert cash handovers"
on public.cash_handovers
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update cash handovers"
on public.cash_handovers
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Agents can read own cash handovers"
on public.cash_handovers
for select
to authenticated
using (
  agent_id in (
    select a.id
    from public.agents a
    where a.auth_user_id = auth.uid()
      and coalesce(a.status, 'active') = 'active'
  )
);


create policy "Agents can insert own cash handovers"
on public.cash_handovers
for insert
to authenticated
with check (
  agent_id in (
    select a.id
    from public.agents a
    where a.auth_user_id = auth.uid()
      and coalesce(a.status, 'active') = 'active'
  )
);