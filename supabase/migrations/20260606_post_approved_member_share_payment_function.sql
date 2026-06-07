-- =========================================================
-- CAPDCOOP Member Share Payment Posting Function
-- Purpose:
-- Safely post member-submitted share purchase payments from
-- the payments table into the share ledger.
--
-- Supports:
-- - Member portal share purchases
-- - Payments module approvals
--
-- Does not mass-post old approved payments.
-- =========================================================

create or replace function public.post_approved_member_share_payment(
  p_payment_id uuid,
  p_approved_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_member public.members%rowtype;
  v_product public.share_products%rowtype;
  v_balance public.member_share_balances%rowtype;

  v_amount numeric := 0;
  v_shares integer := 0;
  v_share_value numeric := 0;

  v_new_total_shares integer := 0;
  v_new_total_share_value numeric := 0;
begin
  -- 1. Lock and load payment
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;

  -- 2. Validate payment
  if coalesce(v_payment.payment_status, '') <> 'pending' then
    raise exception 'Only pending payments can be posted. Current status is %', v_payment.payment_status;
  end if;

  if v_payment.payment_type <> 'share_purchase' then
    raise exception 'This function only posts share purchase payments. Payment type is %', v_payment.payment_type;
  end if;

  if v_payment.member_id is null then
    raise exception 'Payment has no member_id';
  end if;

  v_amount := coalesce(v_payment.amount, 0);

  if v_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  -- 3. Load member
  select *
  into v_member
  from public.members
  where id = v_payment.member_id
  for update;

  if not found then
    raise exception 'Member % not found', v_payment.member_id;
  end if;

  -- 4. Load active share product
  select *
  into v_product
  from public.share_products
  where status = 'active'
  order by created_at asc
  limit 1;

  if not found then
    raise exception 'No active share product found';
  end if;

  -- 5. Calculate shares
  v_shares := floor(v_amount / v_product.share_price);
  v_share_value := v_shares * v_product.share_price;

  if v_shares <= 0 then
    raise exception 'Payment amount % is below the active share price %', v_amount, v_product.share_price;
  end if;

  -- 6. Prevent duplicate posting
  if exists (
    select 1
    from public.share_transactions
    where source_type = 'member_payment'
      and source_id = v_payment.id
      and status = 'posted'
  ) then
    raise exception 'This payment has already been posted to share transactions';
  end if;

  -- 7. Insert share transaction ledger entry
  insert into public.share_transactions (
    member_id,
    share_product_id,
    source_type,
    source_id,
    transaction_date,
    amount_paid,
    share_price,
    shares_purchased,
    payment_method,
    reference,
    status,
    approved_by,
    approved_at,
    notes,
    created_at
  )
  values (
    v_payment.member_id,
    v_product.id,
    'member_payment',
    v_payment.id,
    current_date,
    v_share_value,
    v_product.share_price,
    v_shares,
    v_payment.payment_method,
    v_payment.reference,
    'posted',
    p_approved_by,
    now(),
    'Posted from approved member share payment',
    now()
  );

  -- 8. Load or create member share balance
  select *
  into v_balance
  from public.member_share_balances
  where member_id = v_payment.member_id
  for update;

  if not found then
    insert into public.member_share_balances (
      member_id,
      total_shares,
      total_share_value,
      declared_dividends,
      last_transaction_at,
      created_at,
      updated_at
    )
    values (
      v_payment.member_id,
      0,
      0,
      0,
      now(),
      now(),
      now()
    )
    returning *
    into v_balance;
  end if;

  v_new_total_shares := coalesce(v_balance.total_shares, 0) + v_shares;
  v_new_total_share_value := coalesce(v_balance.total_share_value, 0) + v_share_value;

  update public.member_share_balances
  set
    total_shares = v_new_total_shares,
    total_share_value = v_new_total_share_value,
    last_transaction_at = now(),
    updated_at = now()
  where id = v_balance.id;

  -- 9. Update old members summary fields temporarily for current UI compatibility
  update public.members
  set
    total_shares = coalesce(total_shares, 0) + v_shares,
    portfolio_value = coalesce(portfolio_value, 0) + v_share_value
  where id = v_payment.member_id;

  -- 10. Mark payment approved
  update public.payments
  set
    payment_status = 'approved'
  where id = v_payment.id;

  -- 11. Write financial event log
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
    'member_share_payment_posted',
    'payments',
    'payments',
    v_payment.id,
    v_payment.member_id,
    v_share_value,
    to_jsonb(v_payment),
    jsonb_build_object(
      'share_product_id', v_product.id,
      'share_price', v_product.share_price,
      'shares_purchased', v_shares,
      'amount_posted', v_share_value,
      'member_share_balance_id', v_balance.id,
      'new_total_shares', v_new_total_shares,
      'new_total_share_value', v_new_total_share_value
    ),
    'Posted pending member share purchase payment into share ledger',
    p_approved_by,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'member_id', v_payment.member_id,
    'shares_purchased', v_shares,
    'amount_posted', v_share_value,
    'new_total_shares', v_new_total_shares,
    'new_total_share_value', v_new_total_share_value
  );
end;
$$;

comment on function public.post_approved_member_share_payment(uuid, uuid) is
'Safely posts one pending member share purchase payment into share_transactions, updates member_share_balances and member summary fields, approves the payment, and writes financial logs.';

grant execute on function public.post_approved_member_share_payment(uuid, uuid) to authenticated;