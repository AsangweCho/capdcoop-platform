-- =========================================================
-- CAPDCOOP Payment Function Security Hardening
-- Purpose:
-- Protect sensitive financial payment functions from being
-- called by ordinary authenticated users or anonymous clients.
-- =========================================================


-- =========================================================
-- 1. Admin role helper functions
-- These read from public.admin_users using auth.uid().
-- =========================================================

create or replace function public.current_admin_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select au.role
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
  limit 1;
$$;


create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  );
$$;


create or replace function public.is_finance_operator()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('super_admin', 'admin', 'finance')
  );
$$;


create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role = 'super_admin'
  );
$$;


create or replace function public.require_finance_operator()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_finance_operator() then
    raise exception 'Permission denied. Finance, Admin, or Super Admin role required.';
  end if;
end;
$$;


create or replace function public.require_super_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Permission denied. Super Admin role required.';
  end if;
end;
$$;


-- =========================================================
-- 2. Remove dangerous broad function execution grants
-- =========================================================

revoke execute on function public.post_approved_member_share_payment(uuid, uuid) from public;
revoke execute on function public.post_approved_member_share_payment(uuid, uuid) from anon;

revoke execute on function public.admin_update_payment(uuid, numeric, text, text, text, text, text, uuid) from public;
revoke execute on function public.admin_update_payment(uuid, numeric, text, text, text, text, text, uuid) from anon;

revoke execute on function public.admin_soft_delete_payment(uuid, text, uuid) from public;
revoke execute on function public.admin_soft_delete_payment(uuid, text, uuid) from anon;

grant execute on function public.post_approved_member_share_payment(uuid, uuid) to authenticated;
grant execute on function public.admin_update_payment(uuid, numeric, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_soft_delete_payment(uuid, text, uuid) to authenticated;

grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.is_finance_operator() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.require_finance_operator() to authenticated;
grant execute on function public.require_super_admin() to authenticated;


-- =========================================================
-- 3. Replace member share payment posting function
-- Security change:
-- - Requires finance/admin/super_admin role
-- - Uses auth.uid() as the real actor
-- - Does not trust a caller-supplied approved_by value
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

  v_actor uuid := auth.uid();

  v_amount numeric := 0;
  v_shares integer := 0;
  v_share_value numeric := 0;

  v_new_total_shares integer := 0;
  v_new_total_share_value numeric := 0;
begin
  perform public.require_finance_operator();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated admin user required.';
  end if;

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
    v_actor,
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
    approved_by = v_actor,
    updated_at = now(),
    updated_by = v_actor
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
      'new_total_share_value', v_new_total_share_value,
      'performed_by_role', public.current_admin_role()
    ),
    'Posted pending member share purchase payment into share ledger',
    v_actor,
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
-- 4. Replace Super Admin payment edit function
-- Security change:
-- - Requires Super Admin role from admin_users table
-- - Uses auth.uid() as the real actor
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
  v_actor uuid := auth.uid();
begin
  perform public.require_super_admin();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated Super Admin required.';
  end if;

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
    updated_by = v_actor
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
      'payment_status', p_payment_status,
      'performed_by_role', public.current_admin_role()
    ),
    p_edit_reason,
    v_actor,
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
-- 5. Replace Super Admin payment soft delete function
-- Security change:
-- - Requires Super Admin role from admin_users table
-- - Uses auth.uid() as the real actor
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
  v_actor uuid := auth.uid();
begin
  perform public.require_super_admin();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated Super Admin required.';
  end if;

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
    deleted_by = v_actor,
    delete_reason = p_delete_reason,
    updated_at = now(),
    updated_by = v_actor
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
      'deleted_at', now(),
      'performed_by_role', public.current_admin_role()
    ),
    p_delete_reason,
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'message', 'Payment deleted successfully'
  );
end;
$$;