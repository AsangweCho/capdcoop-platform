-- =========================================================
-- CAPDCOOP Business Applications and Documents RLS Hardening
-- Purpose:
-- Secure financial aid application records and uploaded documents.
--
-- Rules:
-- - Authenticated users can submit their own applications.
-- - Members can read their own applications.
-- - Active admins can read and update all applications.
-- - Users can upload/read documents only for their own applications.
-- - Active admins can manage all application documents and general documents.
-- =========================================================


-- =========================================================
-- 1. Enable RLS
-- =========================================================

alter table public.business_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.documents enable row level security;


-- =========================================================
-- 2. Drop old broad / profile-based policies
-- =========================================================

drop policy if exists "Admins can read business applications"
on public.business_applications;

drop policy if exists "Admins can update business applications"
on public.business_applications;

drop policy if exists "Anyone can submit business applications"
on public.business_applications;

drop policy if exists "Members can read their own business applications"
on public.business_applications;

drop policy if exists "Admins can read application documents"
on public.application_documents;

drop policy if exists "Anyone can insert application documents"
on public.application_documents;


-- Documents table may not currently have policies, but these drops are safe.
drop policy if exists "Active admins can read documents"
on public.documents;

drop policy if exists "Active admins can insert documents"
on public.documents;

drop policy if exists "Active admins can update documents"
on public.documents;

drop policy if exists "Active admins can delete documents"
on public.documents;

drop policy if exists "Members can read own documents"
on public.documents;


-- =========================================================
-- 3. Business Applications policies
-- =========================================================

create policy "Active admins can read business applications"
on public.business_applications
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can update business applications"
on public.business_applications
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Members can submit own business applications"
on public.business_applications
for insert
to authenticated
with check (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
  or email = (auth.jwt() ->> 'email')
);


create policy "Members can read own business applications"
on public.business_applications
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
  or email = (auth.jwt() ->> 'email')
);


-- =========================================================
-- 4. Application Documents policies
-- =========================================================

create policy "Active admins can read application documents"
on public.application_documents
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert application documents"
on public.application_documents
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update application documents"
on public.application_documents
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Active admins can delete application documents"
on public.application_documents
for delete
to authenticated
using (public.is_active_admin());


create policy "Members can insert own application documents"
on public.application_documents
for insert
to authenticated
with check (
  application_id in (
    select ba.id
    from public.business_applications ba
    where
      ba.member_id in (
        select m.id
        from public.members m
        where m.auth_user_id = auth.uid()
      )
      or ba.email = (auth.jwt() ->> 'email')
  )
);


create policy "Members can read own application documents"
on public.application_documents
for select
to authenticated
using (
  application_id in (
    select ba.id
    from public.business_applications ba
    where
      ba.member_id in (
        select m.id
        from public.members m
        where m.auth_user_id = auth.uid()
      )
      or ba.email = (auth.jwt() ->> 'email')
  )
);


-- =========================================================
-- 5. General Documents policies
-- This table is simple and will later be replaced by member_documents.
-- =========================================================

create policy "Active admins can read documents"
on public.documents
for select
to authenticated
using (public.is_active_admin());


create policy "Active admins can insert documents"
on public.documents
for insert
to authenticated
with check (public.is_active_admin());


create policy "Active admins can update documents"
on public.documents
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());


create policy "Active admins can delete documents"
on public.documents
for delete
to authenticated
using (public.is_active_admin());


create policy "Members can read own documents"
on public.documents
for select
to authenticated
using (
  member_id in (
    select m.id
    from public.members m
    where m.auth_user_id = auth.uid()
  )
);