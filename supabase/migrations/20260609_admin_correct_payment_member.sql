-- =========================================================
-- CAPDCOOP Super Admin Payment Member Correction Function
-- Purpose:
-- Safely correct a payment that was assigned to the wrong member
-- before it is posted into a financial ledger.
--
-- This is for operational correction, not reversal.
-- Posted ledger entries must be reversed through reversal functions.
-- =========================================================

create or replace function public.admin_correct_payment_member(
  p_payment_id uuid,
  p_new_member_id uuid,
  p_reason text,
  p_corrected_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();

  v_payment public.payments%rowtype;
  v_old_member public.members%rowtype;
  v_new_member public.members%rowtype;

  v_has_share_ledger boolean := false;
  v_has_savings_ledger boolean := false;
  v_has_aid_ledger boolean := false;

  v_old_data jsonb;
  v_new_data jsonb;
begin
  -- Super Admin only
  perform public.require_super_admin();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated Super Admin required.';
  end if;

  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'Correction reason is required and must be at least 10 characters.';
  end if;

  -- Lock payment
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment % not found.', p_payment_id;
  end if;

  if coalesce(v_payment.is_deleted, false) = true then
    raise exception 'Deleted payments cannot be corrected.';
  end if;

  -- Old member
  select *
  into v_old_member
  from public.members
  where id = v_payment.member_id;

  if not found then
    raise exception 'Current payment member record not found.';
  end if;

  -- New member
  select *
  into v_new_member
  from public.members
  where id = p_new_member_id;

  if not found then
    raise exception 'New member % not found.', p_new_member_id;
  end if;

  if v_payment.member_id = p_new_member_id then
    raise exception 'Payment already belongs to this member.';
  end if;

  -- Block if payment has already posted into share ledger
  select exists (
    select 1
    from public.share_transactions st
    where st.source_type = 'member_payment'
      and st.source_id = p_payment_id
      and coalesce(st.status, '') <> 'reversed'
  )
  into v_has_share_ledger;

  if v_has_share_ledger then
    raise exception 'This payment has already posted to the share ledger. Use a reversal workflow instead.';
  end if;

  -- Optional safety check: savings ledger, if the source_payment_id column exists
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'savings_transactions'
      and column_name = 'source_payment_id'
  ) then
    execute '
      select exists (
        select 1
        from public.savings_transactions
        where source_payment_id = $1
          and coalesce(status, '''') <> ''reversed''
      )
    '
    into v_has_savings_ledger
    using p_payment_id;
  end if;

  if v_has_savings_ledger then
    raise exception 'This payment has already posted to the savings ledger. Use a reversal workflow instead.';
  end if;

  -- Optional safety check: aid ledger, if the source_payment_id column exists
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'aid_payments'
      and column_name = 'source_payment_id'
  ) then
    execute '
      select exists (
        select 1
        from public.aid_payments
        where source_payment_id = $1
          and coalesce(status, '''') <> ''reversed''
      )
    '
    into v_has_aid_ledger
    using p_payment_id;
  end if;

  if v_has_aid_ledger then
    raise exception 'This payment has already posted to the aid ledger. Use a reversal workflow instead.';
  end if;

  v_old_data := jsonb_build_object(
    'payment_id', v_payment.id,
    'old_member_id', v_old_member.id,
    'old_member_number', v_old_member.member_number,
    'old_member_name', v_old_member.full_name,
    'amount', v_payment.amount,
    'payment_type', v_payment.payment_type,
    'payment_status', v_payment.payment_status,
    'payment_method', v_payment.payment_method,
    'reference', v_payment.reference
  );

  -- Correct payment member
  update public.payments
  set
    member_id = p_new_member_id,
    updated_at = now(),
    updated_by = v_actor,
    edit_reason = trim(p_reason)
  where id = p_payment_id;

  v_new_data := jsonb_build_object(
    'payment_id', v_payment.id,
    'new_member_id', v_new_member.id,
    'new_member_number', v_new_member.member_number,
    'new_member_name', v_new_member.full_name,
    'amount', v_payment.amount,
    'payment_type', v_payment.payment_type,
    'payment_status', v_payment.payment_status,
    'payment_method', v_payment.payment_method,
    'reference', v_payment.reference,
    'correction_reason', trim(p_reason)
  );

  insert into public.financial_event_logs (
    event_type,
    module_name,
    entity_table,
    entity_id,
    member_id,
    amount,
    old_data,
    new_data,
    reason,
    performed_by,
    performed_at
  )
  values (
    'payment_member_corrected',
    'payments',
    'payments',
    p_payment_id,
    p_new_member_id,
    v_payment.amount,
    v_old_data,
    v_new_data,
    trim(p_reason),
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'old_member_id', v_old_member.id,
    'old_member_number', v_old_member.member_number,
    'old_member_name', v_old_member.full_name,
    'new_member_id', v_new_member.id,
    'new_member_number', v_new_member.member_number,
    'new_member_name', v_new_member.full_name,
    'amount', v_payment.amount,
    'payment_type', v_payment.payment_type,
    'payment_status', v_payment.payment_status,
    'message', 'Payment member corrected successfully.'
  );
end;
$$;

revoke all on function public.admin_correct_payment_member(uuid, uuid, text, uuid) from public;
revoke all on function public.admin_correct_payment_member(uuid, uuid, text, uuid) from anon;
grant execute on function public.admin_correct_payment_member(uuid, uuid, text, uuid) to authenticated;