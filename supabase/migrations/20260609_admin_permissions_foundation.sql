-- =========================================================
-- CAPDCOOP Admin Permissions Foundation
-- Purpose:
-- Allow Super Admin to assign multiple task permissions
-- to each admin officer using checkbox-based controls.
--
-- Corrected for current admin_users schema:
-- - auth_user_id
-- - is_active
-- =========================================================

create table if not exists public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  permission_key text not null,
  is_enabled boolean not null default true,
  granted_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  unique (admin_user_id, permission_key)
);

alter table public.admin_permissions enable row level security;

drop policy if exists "Super admins can manage admin permissions" on public.admin_permissions;
create policy "Super admins can manage admin permissions"
on public.admin_permissions
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Admins can read own permissions" on public.admin_permissions;
create policy "Admins can read own permissions"
on public.admin_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.id = admin_permissions.admin_user_id
      and au.auth_user_id = auth.uid()
      and au.is_active = true
  )
  or public.is_super_admin()
);

create or replace function public.has_admin_permission(
  p_permission_key text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.admin_users au
      join public.admin_permissions ap on ap.admin_user_id = au.id
      where au.auth_user_id = auth.uid()
        and au.is_active = true
        and ap.permission_key = p_permission_key
        and ap.is_enabled = true
    );
$$;

revoke all on function public.has_admin_permission(text) from public;
revoke all on function public.has_admin_permission(text) from anon;
grant execute on function public.has_admin_permission(text) to authenticated;

create or replace function public.admin_set_permissions(
  p_admin_user_id uuid,
  p_permissions text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_admin public.admin_users%rowtype;
  v_permission text;
begin
  perform public.require_super_admin();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated Super Admin required.';
  end if;

  select *
  into v_admin
  from public.admin_users
  where id = p_admin_user_id
  for update;

  if not found then
    raise exception 'Admin user % not found.', p_admin_user_id;
  end if;

  -- Protect Super Admin accounts from accidental permission stripping.
  -- Super Admin already has full access through is_super_admin().
  if upper(v_admin.role) = 'SUPER_ADMIN' then
    raise exception 'Protected Super Admin permissions cannot be edited from this function.';
  end if;

  update public.admin_permissions
  set
    is_enabled = false,
    updated_at = now()
  where admin_user_id = p_admin_user_id;

  if p_permissions is not null then
    foreach v_permission in array p_permissions
    loop
      insert into public.admin_permissions (
        admin_user_id,
        permission_key,
        is_enabled,
        granted_by,
        created_at,
        updated_at
      )
      values (
        p_admin_user_id,
        v_permission,
        true,
        v_actor,
        now(),
        now()
      )
      on conflict (admin_user_id, permission_key)
      do update set
        is_enabled = true,
        granted_by = excluded.granted_by,
        updated_at = now();
    end loop;
  end if;

  insert into public.financial_event_logs (
    event_type,
    module_name,
    entity_table,
    entity_id,
    amount,
    old_data,
    new_data,
    reason,
    performed_by,
    performed_at
  )
  values (
    'admin_permissions_updated',
    'admin',
    'admin_users',
    p_admin_user_id,
    0,
    jsonb_build_object(
      'admin_user_id', p_admin_user_id,
      'admin_name', v_admin.full_name,
      'admin_email', v_admin.email
    ),
    jsonb_build_object(
      'admin_user_id', p_admin_user_id,
      'admin_name', v_admin.full_name,
      'admin_email', v_admin.email,
      'permissions', p_permissions
    ),
    'Super Admin updated admin permissions',
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'admin_user_id', p_admin_user_id,
    'admin_name', v_admin.full_name,
    'admin_email', v_admin.email,
    'permissions', p_permissions,
    'message', 'Admin permissions updated successfully.'
  );
end;
$$;

revoke all on function public.admin_set_permissions(uuid, text[]) from public;
revoke all on function public.admin_set_permissions(uuid, text[]) from anon;
grant execute on function public.admin_set_permissions(uuid, text[]) to authenticated;