-- =========================================================
-- CAPDCOOP Collection Posting Function Security Hardening
-- Purpose:
-- Harden Aid, Savings, and Share collection posting functions.
--
-- Rules:
-- - Only finance/admin/super_admin can post collections.
-- - Anonymous users cannot execute posting functions.
-- - The database uses auth.uid() as the real actor.
-- =========================================================


-- =========================================================
-- 1. Remove unsafe grants
-- =========================================================

revoke execute on function public.post_approved_aid_collection(uuid, uuid) from public;
revoke execute on function public.post_approved_aid_collection(uuid, uuid) from anon;

revoke execute on function public.post_approved_savings_collection(uuid, uuid) from public;
revoke execute on function public.post_approved_savings_collection(uuid, uuid) from anon;

revoke execute on function public.post_approved_share_collection(uuid, uuid) from public;
revoke execute on function public.post_approved_share_collection(uuid, uuid) from anon;

grant execute on function public.post_approved_aid_collection(uuid, uuid) to authenticated;
grant execute on function public.post_approved_savings_collection(uuid, uuid) to authenticated;
grant execute on function public.post_approved_share_collection(uuid, uuid) to authenticated;


-- =========================================================
-- 2. Harden Aid collection posting function
-- =========================================================

create or replace function public.post_approved_aid_collection(
  p_collection_id uuid,
  p_approved_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection public.collections%rowtype;
  v_aid public.loans%rowtype;
  v_schedule record;

  v_actor uuid := auth.uid();

  v_remaining_amount numeric := 0;
  v_total_applied numeric := 0;
  v_amount_to_apply numeric := 0;
  v_schedule_due numeric := 0;
  v_new_schedule_paid numeric := 0;
  v_new_schedule_arrears numeric := 0;
  v_new_schedule_status text := 'pending';

  v_previous_repaid numeric := 0;
  v_previous_balance numeric := 0;
  v_new_repaid numeric := 0;
  v_new_balance numeric := 0;

  v_active_aid_count integer := 0;
begin
  perform public.require_finance_operator();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated finance/admin user required.';
  end if;

  select *
  into v_collection
  from public.collections
  where id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection % not found', p_collection_id;
  end if;

  if coalesce(v_collection.status, '') <> 'pending' then
    raise exception 'Only pending collections can be posted. Current status is %', v_collection.status;
  end if;

  if v_collection.collection_type <> 'loan' then
    raise exception 'This function only posts aid repayment collections. Collection type is %', v_collection.collection_type;
  end if;

  if v_collection.member_id is null then
    raise exception 'Collection has no member_id';
  end if;

  if coalesce(v_collection.collected_amount, 0) <= 0 then
    raise exception 'Collected amount must be greater than zero';
  end if;

  v_remaining_amount := coalesce(v_collection.collected_amount, 0);

  if v_collection.reference_id is not null then
    select *
    into v_aid
    from public.loans
    where id = v_collection.reference_id
      and member_id = v_collection.member_id
      and status = 'active'
      and coalesce(is_deleted, false) = false
    for update;

    if not found then
      raise exception 'No active aid facility found for collection reference_id %', v_collection.reference_id;
    end if;
  else
    select count(*)
    into v_active_aid_count
    from public.loans
    where member_id = v_collection.member_id
      and status = 'active'
      and coalesce(is_deleted, false) = false;

    if v_active_aid_count = 0 then
      raise exception 'No active aid facility found for this member';
    end if;

    if v_active_aid_count > 1 then
      raise exception 'Member has more than one active aid facility. reference_id is required.';
    end if;

    select *
    into v_aid
    from public.loans
    where member_id = v_collection.member_id
      and status = 'active'
      and coalesce(is_deleted, false) = false
    for update;
  end if;

  v_previous_repaid := coalesce(v_aid.amount_repaid, 0);
  v_previous_balance :=
    case
      when coalesce(v_aid.outstanding_balance, 0) > 0 then coalesce(v_aid.outstanding_balance, 0)
      else coalesce(v_aid.total_expected_repayment, 0) - coalesce(v_aid.amount_repaid, 0)
    end;

  for v_schedule in
    select *
    from public.loan_repayment_schedule
    where loan_id = v_aid.id
      and member_id = v_collection.member_id
      and status in ('pending', 'partial', 'overdue')
    order by due_date asc, installment_number asc
    for update
  loop
    exit when v_remaining_amount <= 0;

    v_schedule_due :=
      greatest(
        coalesce(v_schedule.expected_amount, 0) - coalesce(v_schedule.paid_amount, 0),
        0
      );

    if v_schedule_due <= 0 then
      continue;
    end if;

    v_amount_to_apply := least(v_remaining_amount, v_schedule_due);

    v_new_schedule_paid := coalesce(v_schedule.paid_amount, 0) + v_amount_to_apply;
    v_new_schedule_arrears := greatest(coalesce(v_schedule.expected_amount, 0) - v_new_schedule_paid, 0);

    if v_new_schedule_arrears <= 0 then
      v_new_schedule_status := 'paid';
    elsif v_schedule.due_date < current_date then
      v_new_schedule_status := 'overdue';
    else
      v_new_schedule_status := 'partial';
    end if;

    update public.loan_repayment_schedule
    set
      paid_amount = v_new_schedule_paid,
      arrears_amount = v_new_schedule_arrears,
      status = v_new_schedule_status,
      updated_at = now()
    where id = v_schedule.id;

    insert into public.aid_payments (
      aid_facility_id,
      member_id,
      collection_id,
      schedule_id,
      payment_date,
      amount,
      payment_method,
      reference,
      collected_by_agent_id,
      approved_by,
      approved_at,
      status,
      notes
    )
    values (
      v_aid.id,
      v_collection.member_id,
      v_collection.id,
      v_schedule.id,
      coalesce(v_collection.collection_date, current_date),
      v_amount_to_apply,
      v_collection.payment_method,
      v_collection.reference,
      v_collection.agent_id,
      v_actor,
      now(),
      'posted',
      'Posted from approved aid collection'
    );

    insert into public.collection_allocations (
      collection_id,
      member_id,
      allocation_type,
      target_table,
      target_record_id,
      amount,
      status,
      posted_at,
      posted_by,
      notes
    )
    values (
      v_collection.id,
      v_collection.member_id,
      'aid_repayment',
      'loan_repayment_schedule',
      v_schedule.id,
      v_amount_to_apply,
      'posted',
      now(),
      v_actor,
      'Applied to aid repayment schedule'
    );

    v_remaining_amount := v_remaining_amount - v_amount_to_apply;
    v_total_applied := v_total_applied + v_amount_to_apply;
  end loop;

  if v_remaining_amount > 0 then
    insert into public.aid_payments (
      aid_facility_id,
      member_id,
      collection_id,
      schedule_id,
      payment_date,
      amount,
      payment_method,
      reference,
      collected_by_agent_id,
      approved_by,
      approved_at,
      status,
      notes
    )
    values (
      v_aid.id,
      v_collection.member_id,
      v_collection.id,
      null,
      coalesce(v_collection.collection_date, current_date),
      v_remaining_amount,
      v_collection.payment_method,
      v_collection.reference,
      v_collection.agent_id,
      v_actor,
      now(),
      'posted',
      'Posted as aid advance because no unpaid schedule row remained'
    );

    insert into public.collection_allocations (
      collection_id,
      member_id,
      allocation_type,
      target_table,
      target_record_id,
      amount,
      status,
      posted_at,
      posted_by,
      notes
    )
    values (
      v_collection.id,
      v_collection.member_id,
      'aid_repayment',
      'loans',
      v_aid.id,
      v_remaining_amount,
      'posted',
      now(),
      v_actor,
      'Applied directly to outstanding aid balance'
    );

    v_total_applied := v_total_applied + v_remaining_amount;
    v_remaining_amount := 0;
  end if;

  v_new_repaid := v_previous_repaid + v_total_applied;
  v_new_balance := greatest(v_previous_balance - v_total_applied, 0);

  update public.loans
  set
    amount_repaid = v_new_repaid,
    outstanding_balance = v_new_balance,
    last_payment_date = now(),
    status = case when v_new_balance <= 0 then 'closed' else status end,
    updated_at = now(),
    updated_by = v_actor
  where id = v_aid.id;

  update public.collections
  set
    status = 'approved',
    approved_by = v_actor,
    approved_at = now(),
    updated_at = now()
  where id = v_collection.id;

  insert into public.financial_event_logs (
    event_type,
    module_name,
    entity_table,
    entity_id,
    member_id,
    agent_id,
    amount,
    old_data,
    new_data,
    reason,
    performed_by,
    performed_at
  )
  values (
    'aid_collection_posted',
    'collections',
    'collections',
    v_collection.id,
    v_collection.member_id,
    v_collection.agent_id,
    v_total_applied,
    to_jsonb(v_collection),
    jsonb_build_object(
      'aid_facility_id', v_aid.id,
      'aid_number', v_aid.loan_number,
      'amount_applied', v_total_applied,
      'new_amount_repaid', v_new_repaid,
      'new_outstanding_balance', v_new_balance,
      'performed_by_role', public.current_admin_role()
    ),
    'Posted pending aid collection into aid ledger',
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'collection_id', v_collection.id,
    'aid_facility_id', v_aid.id,
    'aid_number', v_aid.loan_number,
    'amount_applied', v_total_applied,
    'new_amount_repaid', v_new_repaid,
    'new_outstanding_balance', v_new_balance
  );
end;
$$;


-- =========================================================
-- 3. Harden Savings collection posting function
-- =========================================================

create or replace function public.post_approved_savings_collection(
  p_collection_id uuid,
  p_approved_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection public.collections%rowtype;
  v_savings public.savings_accounts%rowtype;
  v_member public.members%rowtype;
  v_agent_name text;
  v_actor uuid := auth.uid();
  v_total_saved numeric := 0;
  v_amount numeric := 0;
begin
  perform public.require_finance_operator();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated finance/admin user required.';
  end if;

  select *
  into v_collection
  from public.collections
  where id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection % not found', p_collection_id;
  end if;

  if coalesce(v_collection.status, '') <> 'pending' then
    raise exception 'Only pending collections can be posted. Current status is %', v_collection.status;
  end if;

  if v_collection.collection_type <> 'savings' then
    raise exception 'This function only posts savings collections. Collection type is %', v_collection.collection_type;
  end if;

  if v_collection.member_id is null then
    raise exception 'Collection has no member_id';
  end if;

  v_amount := coalesce(v_collection.collected_amount, 0);

  if v_amount <= 0 then
    raise exception 'Savings amount must be greater than zero';
  end if;

  select *
  into v_member
  from public.members
  where id = v_collection.member_id;

  if not found then
    raise exception 'Member % not found', v_collection.member_id;
  end if;

  select full_name
  into v_agent_name
  from public.agents
  where id = v_collection.agent_id;

  v_agent_name := coalesce(v_agent_name, 'Admin');

  select *
  into v_savings
  from public.savings_accounts
  where member_id = v_collection.member_id
    and coalesce(status, 'active') = 'active'
  order by created_at desc
  limit 1
  for update;

  if not found then
    insert into public.savings_accounts (
      member_id,
      client_name,
      phone,
      national_id,
      address,
      account_number,
      agent_name,
      start_date,
      monthly_fee_percent,
      total_saved,
      total_withdrawn,
      status,
      notes,
      created_by,
      created_at,
      updated_at,
      updated_by
    )
    values (
      v_collection.member_id,
      v_member.full_name,
      v_member.phone,
      coalesce(v_member.national_id, v_member.national_id_number, v_member.id_card_number),
      v_member.address,
      'SAV-' || extract(epoch from now())::bigint::text,
      v_agent_name,
      current_date,
      2,
      0,
      0,
      'active',
      'Created automatically from approved savings collection.',
      v_actor,
      now(),
      now(),
      v_actor
    )
    returning *
    into v_savings;
  end if;

  v_total_saved := coalesce(v_savings.total_saved, 0) + v_amount;

  insert into public.savings_transactions (
    savings_account_id,
    amount,
    payment_method,
    reference,
    transaction_type,
    collected_by,
    created_by,
    created_at
  )
  values (
    v_savings.id,
    v_amount,
    v_collection.payment_method,
    v_collection.reference,
    'deposit',
    v_agent_name,
    v_actor,
    now()
  );

  update public.savings_accounts
  set
    total_saved = v_total_saved,
    updated_at = now(),
    updated_by = v_actor
  where id = v_savings.id;

  update public.collections
  set
    status = 'approved',
    approved_by = v_actor,
    approved_at = now(),
    updated_at = now()
  where id = v_collection.id;

  insert into public.financial_event_logs (
    event_type,
    module_name,
    entity_table,
    entity_id,
    member_id,
    agent_id,
    amount,
    old_data,
    new_data,
    reason,
    performed_by,
    performed_at
  )
  values (
    'savings_collection_posted',
    'collections',
    'collections',
    v_collection.id,
    v_collection.member_id,
    v_collection.agent_id,
    v_amount,
    to_jsonb(v_collection),
    jsonb_build_object(
      'savings_account_id', v_savings.id,
      'amount_posted', v_amount,
      'new_total_saved', v_total_saved,
      'performed_by_role', public.current_admin_role()
    ),
    'Posted pending savings collection into savings ledger',
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'collection_id', v_collection.id,
    'member_id', v_collection.member_id,
    'savings_account_id', v_savings.id,
    'amount_posted', v_amount,
    'new_total_saved', v_total_saved
  );
end;
$$;


-- =========================================================
-- 4. Harden Share collection posting function
-- =========================================================

create or replace function public.post_approved_share_collection(
  p_collection_id uuid,
  p_approved_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection public.collections%rowtype;
  v_member public.members%rowtype;
  v_product public.share_products%rowtype;
  v_balance public.member_share_balances%rowtype;
  v_actor uuid := auth.uid();
  v_shares integer := 0;
  v_share_value numeric := 0;
begin
  perform public.require_finance_operator();

  if v_actor is null then
    raise exception 'Permission denied. Authenticated finance/admin user required.';
  end if;

  select *
  into v_collection
  from public.collections
  where id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection % not found', p_collection_id;
  end if;

  if coalesce(v_collection.status, '') <> 'pending' then
    raise exception 'Only pending collections can be posted';
  end if;

  if v_collection.collection_type <> 'share' then
    raise exception 'This function only posts share collections';
  end if;

  if v_collection.member_id is null then
    raise exception 'Collection has no member_id';
  end if;

  select *
  into v_member
  from public.members
  where id = v_collection.member_id
  for update;

  if not found then
    raise exception 'Member % not found', v_collection.member_id;
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

  v_shares := floor(coalesce(v_collection.collected_amount, 0) / v_product.share_price);
  v_share_value := v_shares * v_product.share_price;

  if v_shares <= 0 then
    raise exception 'Collection amount is below the active share price.';
  end if;

  if exists (
    select 1
    from public.share_transactions
    where source_type = 'collection'
      and source_id = v_collection.id
      and status = 'posted'
  ) then
    raise exception 'This share collection has already been posted.';
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
    created_at
  )
  values (
    v_member.id,
    v_product.id,
    'collection',
    v_collection.id,
    coalesce(v_collection.collection_date, current_date),
    v_share_value,
    v_product.share_price,
    v_shares,
    v_collection.payment_method,
    v_collection.reference,
    'posted',
    v_actor,
    now(),
    now()
  );

  select *
  into v_balance
  from public.member_share_balances
  where member_id = v_member.id
  for update;

  if not found then
    insert into public.member_share_balances (
      member_id,
      total_shares,
      total_share_value,
      last_transaction_at,
      created_at
    )
    values (
      v_member.id,
      v_shares,
      v_share_value,
      now(),
      now()
    )
    returning *
    into v_balance;
  else
    update public.member_share_balances
    set total_shares = total_shares + v_shares,
        total_share_value = total_share_value + v_share_value,
        last_transaction_at = now(),
        updated_at = now()
    where id = v_balance.id;
  end if;

  update public.members
  set total_shares = coalesce(total_shares, 0) + v_shares,
      portfolio_value = coalesce(portfolio_value, 0) + v_share_value
  where id = v_member.id;

  update public.collections
  set status = 'approved',
      approved_by = v_actor,
      approved_at = now(),
      updated_at = now()
  where id = v_collection.id;

  insert into public.financial_event_logs (
    event_type,
    module_name,
    entity_table,
    entity_id,
    member_id,
    agent_id,
    amount,
    old_data,
    new_data,
    performed_by,
    performed_at
  )
  values (
    'share_collection_posted',
    'collections',
    'collections',
    v_collection.id,
    v_member.id,
    v_collection.agent_id,
    v_share_value,
    to_jsonb(v_collection),
    jsonb_build_object(
      'shares_purchased', v_shares,
      'share_value', v_share_value,
      'member_share_balance_id', v_balance.id,
      'performed_by_role', public.current_admin_role()
    ),
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'collection_id', v_collection.id,
    'member_id', v_member.id,
    'shares_purchased', v_shares,
    'share_value', v_share_value
  );

end;
$$;