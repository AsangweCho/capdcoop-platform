-- =========================================================
-- CAPDCOOP Payment Admin Controls
-- Purpose:
-- Add safe correction controls for payments and update
-- member share payment posting to include approval metadata.
-- =========================================================


-- =========================================================
-- 1. Add payment correction fields
-- =========================================================

alter table public.payments
add column if not exists approved_at timestamptz,
add column if not exists approved_by uuid,
add column if not exists updated_at timestamptz,
add column if not exists updated_by uuid,
add column if not exists edit_reason text,
add column if not exists is_deleted boolean not null default false,
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid,
add column if not exists delete_reason text;

create index if not exists idx_payments_is_deleted
on public.payments (is_deleted);

create index if not exists idx_payments_status_type
on public.payments (payment_status, payment_type);


-- =========================================================
-- 2. Replace member share payment posting function
-- Adds approved_at, approved_by, updated_at, updated_by.
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
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
    and coalesce(is_deleted, false) = false
  for update;

  if not found then
    raise exception 'Payment % not found or deleted', p_payment_id;
  end if;

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

  select *
  into v_member
  from public.members
  where id = v_payment.member_id
  for update;

  if not found then
    raise exception 'Member % not found', v_payment.member_id;
  end if;

  select *
  into v_product
  from public.share_products
  where status = 'active'
  order by created_at asc
  limit 1;

  if not found then
    raise exception 'No active share product found';
  end if;

  v_shares := floor(v_amount / v_product.share_price);
  v_share_value := v_shares * v_product.share_price;

  if v_shares <= 0 then
    raise exception 'Payment amount % is below the active share price %', v_amount, v_product.share_price;
  end if;

  if exists (
    select 1
    from public.share_transactions
    where source_type = 'member_payment'
      and source_id = v_payment.id
      and status = 'posted'
  ) then
    raise exception 'This payment has already been posted to share transactions';
  end if;

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

  update public.members
  set
    total_shares = coalesce(total_shares, 0) + v_shares,
    portfolio_value = coalesce(portfolio_value, 0) + v_share_value
  where id = v_payment.member_id;

  update public.payments
  set
    payment_status = 'approved',
    approved_at = now(),
    approved_by = p_approved_by,
    updated_at = now(),
    updated_by = p_approved_by
  where id = v_payment.id;

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


-- =========================================================
-- 3. Super Admin payment edit function
-- This blocks edits to payments already posted into share ledger.
-- =========================================================

create or replace function public.admin_update_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_type text,
  p_reference text,
  p_payment_status text,
  p_edit_reason text,
  p_performed_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
    and coalesce(is_deleted, false) = false
  for update;

  if not found then
    raise exception 'Payment % not found or deleted', p_payment_id;
  end if;

  if exists (
    select 1
    from public.share_transactions
    where source_type = 'member_payment'
      and source_id = p_payment_id
      and status = 'posted'
  ) then
    raise exception 'This payment has already been posted to the share ledger. Use reversal workflow instead of editing.';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if coalesce(trim(p_edit_reason), '') = '' then
    raise exception 'Edit reason is required';
  end if;

  update public.payments
  set
    amount = p_amount,
    payment_method = p_payment_method,
    payment_type = p_payment_type,
    reference = nullif(trim(coalesce(p_reference, '')), ''),
    payment_status = p_payment_status,
    edit_reason = p_edit_reason,
    updated_at = now(),
    updated_by = p_performed_by
  where id = p_payment_id;

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
    'payment_admin_updated',
    'payments',
    'payments',
    p_payment_id,
    v_payment.member_id,
    p_amount,
    to_jsonb(v_payment),
    jsonb_build_object(
      'amount', p_amount,
      'payment_method', p_payment_method,
      'payment_type', p_payment_type,
      'reference', p_reference,
      'payment_status', p_payment_status
    ),
    p_edit_reason,
    p_performed_by,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'message', 'Payment updated successfully'
  );
end;
$$;


-- =========================================================
-- 4. Super Admin payment soft delete function
-- This blocks deletes to payments already posted into share ledger.
-- =========================================================

create or replace function public.admin_soft_delete_payment(
  p_payment_id uuid,
  p_delete_reason text,
  p_performed_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
    and coalesce(is_deleted, false) = false
  for update;

  if not found then
    raise exception 'Payment % not found or already deleted', p_payment_id;
  end if;

  if exists (
    select 1
    from public.share_transactions
    where source_type = 'member_payment'
      and source_id = p_payment_id
      and status = 'posted'
  ) then
    raise exception 'This payment has already been posted to the share ledger. Use reversal workflow instead of deleting.';
  end if;

  if coalesce(trim(p_delete_reason), '') = '' then
    raise exception 'Delete reason is required';
  end if;

  update public.payments
  set
    is_deleted = true,
    deleted_at = now(),
    deleted_by = p_performed_by,
    delete_reason = p_delete_reason,
    updated_at = now(),
    updated_by = p_performed_by
  where id = p_payment_id;

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
    'payment_admin_deleted',
    'payments',
    'payments',
    p_payment_id,
    v_payment.member_id,
    v_payment.amount,
    to_jsonb(v_payment),
    jsonb_build_object(
      'is_deleted', true,
      'deleted_at', now()
    ),
    p_delete_reason,
    p_performed_by,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'message', 'Payment deleted successfully'
  );
end;
$$;


grant execute on function public.post_approved_member_share_payment(uuid, uuid) to authenticated;
grant execute on function public.admin_update_payment(uuid, numeric, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_soft_delete_payment(uuid, text, uuid) to authenticated;