-- =========================================================
-- CAPDCOOP Share Certificates RLS Hardening
-- Purpose:
-- Restrict certificate visibility and management.
--
-- Rules:
-- - Members can read only their own certificates.
-- - Active admins can read/manage all certificates.
-- - Ordinary authenticated users cannot update/delete all certificates.
-- =========================================================

alter table public.share_certificates enable row level security;


-- =========================================================
-- 1. Remove overly broad existing policies
-- =========================================================

drop policy if exists "Allow authenticated users to delete share certificates"
on public.share_certificates;

drop policy if exists "Allow authenticated users to insert share certificates"
on public.share_certificates;

drop policy if exists "Allow authenticated users to read share certificates"
on public.share_certificates;

drop policy if exists "Allow authenticated users to update share certificates"
on public.share_certificates;

drop policy if exists "Members can view own certificates"
on public.share_certificates;


-- =========================================================
-- 2. Admin policies
-- =========================================================

create policy "Admins can read all share certificates"
on public.share_certificates
for select
to authenticated
using (public.is_active_admin());


create policy "Admins can insert share certificates"
on public.share_certificates
for insert
to authenticated
with check (public.is_active_admin());


create policy "Admins can update share certificates"
on public.share_certificates
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Admins can delete share certificates"
on public.share_certificates
for delete
to authenticated
using (public.is_active_admin());


-- =========================================================
-- 3. Member read-only policy
-- =========================================================

create policy "Members can read own share certificates"
on public.share_certificates
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);