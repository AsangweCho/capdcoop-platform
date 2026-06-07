-- =========================================================
-- CAPDCOOP Admin Users and Profiles RLS Hardening
-- Purpose:
-- Replace auth.role()-based policies with CAPDCOOP role checks
-- from public.admin_users.
--
-- Rules:
-- - Users can read their own admin record.
-- - Super Admin can read, insert, and update admin users.
-- - Users can read/create their own profile.
-- - Users can update their own profile only if role remains unchanged.
-- - Active admins can read profiles.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;


-- =========================================================
-- 2. Drop old admin_users policies
-- =========================================================

drop policy if exists "Admins can read own record"
on public.admin_users;

drop policy if exists "Allow super admins to read all admin users"
on public.admin_users;

drop policy if exists "Allow super_admin to insert admin users"
on public.admin_users;

drop policy if exists "Allow super_admin to select all admin users"
on public.admin_users;

drop policy if exists "Allow super_admin to update admin users"
on public.admin_users;

drop policy if exists "Allow users to read their own admin record"
on public.admin_users;

drop policy if exists "Super admins can insert admin users"
on public.admin_users;


-- =========================================================
-- 3. New admin_users policies
-- =========================================================

create policy "Users can read own admin record"
on public.admin_users
for select
to authenticated
using (auth_user_id = auth.uid());


create policy "Super Admin can read all admin users"
on public.admin_users
for select
to authenticated
using (public.is_super_admin());


create policy "Super Admin can insert admin users"
on public.admin_users
for insert
to authenticated
with check (public.is_super_admin());


create policy "Super Admin can update admin users"
on public.admin_users
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());


-- =========================================================
-- 4. Drop old profiles policies
-- =========================================================

drop policy if exists "Users can create their own profile"
on public.profiles;

drop policy if exists "Users can read own profile"
on public.profiles;

drop policy if exists "Users can update own profile"
on public.profiles;

drop policy if exists "Active admins can read profiles"
on public.profiles;


-- =========================================================
-- 5. New profiles policies
-- =========================================================

create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());


create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());


create policy "Active admins can read profiles"
on public.profiles
for select
to authenticated
using (public.is_active_admin());


-- This policy allows a user to update their own profile only if
-- they are not changing the stored role value.
-- The role column should later be moved fully under admin control.
create policy "Users can update own profile without role escalation"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  )
);