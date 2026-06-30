-- =========================================================
-- CAPDCOOP Collection Status Reversal Support
-- Purpose:
-- Allow approved collections to be reversed safely by
-- Super Admin reversal workflows.
-- =========================================================

alter table public.collections
drop constraint if exists collections_status_check;

alter table public.collections
add constraint collections_status_check
check (
  status = any (
    array[
      'pending'::text,
      'approved'::text,
      'rejected'::text,
      'reversed'::text
    ]
  )
);