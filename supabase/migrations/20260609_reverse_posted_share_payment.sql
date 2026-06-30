-- =========================================================
-- CAPDCOOP Super Admin Reverse Posted Share Payment
-- Purpose:
-- Reverse a posted share purchase safely after it has entered
-- the share ledger and affected member balances.
--
-- This does NOT delete records. It marks ledger/payment records
-- as reversed and subtracts the posted shares from balances.
-- =========================================================

create or replace function public.admin_reverse_posted_share_payment(
  p_payment_id uuid,
  p_reason text,
  p_reversed_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();

  v_payment public.payments%rowtype;
  v_member public.members%rowtype;
  v_share_tx public.share_transactions%rowtype;

  v_new_member_total_shares integer := 0;
  v_new_member_portfolio_value numeric := 0;
  v_new_balance_total_shares integer := 0;
  v_new_balance_total_value numeric := 0;

  v_old_data jsonb;
  v_new_data jsonb;
begin
  perform public.require_super_admin();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated Super Admin required.';
  end if;

  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'Reversal reason is required and must be at least 10 characters.';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment % not found.', p_payment_id;
  end if;

  if coalesce(v_payment.is_deleted, false) = true then
    raise exception 'Deleted payments cannot be reversed through this workflow.';
  end if;

  if v_payment.payment_type <> 'share_purchase' then
    raise exception 'Only share purchase payments can be reversed by this function. Payment type is %.', v_payment.payment_type;
  end if;

  if v_payment.payment_status = 'reversed' then
    raise exception 'This payment is already reversed.';
  end if;

  if v_payment.payment_status <> 'approved' then
    raise exception 'Only approved share payments can be reversed. Current status is %.', v_payment.payment_status;
  end if;

  select *
  into v_member
  from public.members
  where id = v_payment.member_id
  for update;

  if not found then
    raise exception 'Member linked to this payment was not found.';
  end if;

  select *
  into v_share_tx
  from public.share_transactions
  where source_type = 'member_payment'
    and source_id = p_payment_id
    and status = 'posted'
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No posted share ledger transaction found for this payment.';
  end if;

  if coalesce(v_share_tx.status, '') = 'reversed' then
    raise exception 'The linked share transaction is already reversed.';
  end if;

  v_old_data := jsonb_build_object(
    'payment_id', v_payment.id,
    'payment_status', v_payment.payment_status,
    'member_id', v_member.id,
    'member_number', v_member.member_number,
    'member_name', v_member.full_name,
    'payment_amount', v_payment.amount,
    'share_transaction_id', v_share_tx.id,
    'amount_paid', v_share_tx.amount_paid,
    'share_price', v_share_tx.share_price,
    'shares_purchased', v_share_tx.shares_purchased,
    'member_total_shares_before', coalesce(v_member.total_shares, 0),
    'member_portfolio_value_before', coalesce(v_member.portfolio_value, 0)
  );

  v_new_member_total_shares :=
    greatest(coalesce(v_member.total_shares, 0) - coalesce(v_share_tx.shares_purchased, 0), 0);

  v_new_member_portfolio_value :=
    greatest(coalesce(v_member.portfolio_value, 0) - coalesce(v_share_tx.amount_paid, 0), 0);

  update public.share_transactions
  set
    status = 'reversed',
    reversed_by = v_actor,
    reversed_at = now(),
    reversal_reason = trim(p_reason),
    updated_at = now()
  where id = v_share_tx.id;

  update public.members
  set
    total_shares = v_new_member_total_shares,
    portfolio_value = v_new_member_portfolio_value,
    updated_at = now()
  where id = v_member.id;

  update public.member_share_balances
  set
    total_shares = greatest(coalesce(total_shares, 0) - coalesce(v_share_tx.shares_purchased, 0), 0),
    total_share_value = greatest(coalesce(total_share_value, 0) - coalesce(v_share_tx.amount_paid, 0), 0),
    updated_at = now(),
    last_transaction_at = now()
  where member_id = v_member.id
  returning total_shares, total_share_value
  into v_new_balance_total_shares, v_new_balance_total_value;

  if not found then
    raise exception 'Member share balance record not found.';
  end if;

  update public.payments
  set
    payment_status = 'reversed',
    updated_at = now(),
    updated_by = v_actor,
    edit_reason = trim(p_reason)
  where id = v_payment.id;

  v_new_data := jsonb_build_object(
    'payment_id', v_payment.id,
    'payment_status', 'reversed',
    'member_id', v_member.id,
    'member_number', v_member.member_number,
    'member_name', v_member.full_name,
    'share_transaction_id', v_share_tx.id,
    'amount_reversed', v_share_tx.amount_paid,
    'shares_reversed', v_share_tx.shares_purchased,
    'member_total_shares_after', v_new_member_total_shares,
    'member_portfolio_value_after', v_new_member_portfolio_value,
    'ledger_total_shares_after', v_new_balance_total_shares,
    'ledger_total_share_value_after', v_new_balance_total_value,
    'reversal_reason', trim(p_reason)
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
    'posted_share_payment_reversed',
    'payments',
    'payments',
    v_payment.id,
    v_member.id,
    v_share_tx.amount_paid,
    v_old_data,
    v_new_data,
    trim(p_reason),
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'member_id', v_member.id,
    'member_number', v_member.member_number,
    'member_name', v_member.full_name,
    'amount_reversed', v_share_tx.amount_paid,
    'shares_reversed', v_share_tx.shares_purchased,
    'new_total_shares', v_new_member_total_shares,
    'new_portfolio_value', v_new_member_portfolio_value,
    'message', 'Posted share payment reversed successfully.'
  );
end;
$$;

revoke all on function public.admin_reverse_posted_share_payment(uuid, text, uuid) from public;
revoke all on function public.admin_reverse_posted_share_payment(uuid, text, uuid) from anon;
grant execute on function public.admin_reverse_posted_share_payment(uuid, text, uuid) to authenticated;