-- =========================================================
-- CAPDCOOP Super Admin Reverse Approved Savings Collection
-- Purpose:
-- Safely reverse an approved savings collection.
--
-- Supports:
-- 1. New collections linked through collection_allocations
-- 2. Legacy approved collections without allocation links,
--    using a strict member + amount + approved_at timestamp match.
-- =========================================================

alter table public.savings_transactions
add column if not exists status text not null default 'posted';

alter table public.savings_transactions
add column if not exists reversed_by uuid;

alter table public.savings_transactions
add column if not exists reversed_at timestamp with time zone;

alter table public.savings_transactions
add column if not exists reversal_reason text;

alter table public.savings_transactions
add column if not exists updated_at timestamp with time zone;

create or replace function public.admin_reverse_approved_savings_collection(
  p_collection_id uuid,
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

  v_collection public.collections%rowtype;
  v_member public.members%rowtype;
  v_account public.savings_accounts%rowtype;
  v_transaction public.savings_transactions%rowtype;
  v_allocation public.collection_allocations%rowtype;

  v_match_count integer := 0;
  v_total_reversed numeric := 0;
  v_new_total_saved numeric := 0;

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
  into v_collection
  from public.collections
  where id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection % not found.', p_collection_id;
  end if;

  if v_collection.collection_type <> 'savings' then
    raise exception 'Only savings collections can be reversed by this function. Collection type is %.', v_collection.collection_type;
  end if;

  if v_collection.status = 'reversed' then
    raise exception 'This collection is already reversed.';
  end if;

  if v_collection.status <> 'approved' then
    raise exception 'Only approved savings collections can be reversed. Current status is %.', v_collection.status;
  end if;

  select *
  into v_member
  from public.members
  where id = v_collection.member_id;

  if not found then
    raise exception 'Member linked to this collection was not found.';
  end if;

  -- First try the modern allocation link.
  select *
  into v_allocation
  from public.collection_allocations
  where collection_id = p_collection_id
    and allocation_type = 'savings_deposit'
    and target_table = 'savings_transactions'
    and status = 'posted'
  order by created_at desc
  limit 1
  for update;

  if found then
    select *
    into v_transaction
    from public.savings_transactions
    where id = v_allocation.target_record_id
      and status = 'posted'
    for update;

    if not found then
      raise exception 'Linked savings transaction was not found or is not posted.';
    end if;
  else
    -- Legacy fallback:
    -- Match by member, amount, deposit type, and approved_at close to transaction created_at.
    select count(*)
    into v_match_count
    from public.savings_transactions st
    join public.savings_accounts sa on sa.id = st.savings_account_id
    where sa.member_id = v_collection.member_id
      and st.amount = v_collection.collected_amount
      and coalesce(st.transaction_type, '') = 'deposit'
      and coalesce(st.status, 'posted') = 'posted'
      and v_collection.approved_at is not null
      and abs(extract(epoch from (st.created_at - v_collection.approved_at))) <= 300;

    if v_match_count = 0 then
      raise exception 'No matching posted savings transaction found for this legacy collection.';
    end if;

    if v_match_count > 1 then
      raise exception 'More than one matching savings transaction found. Manual review required before reversal.';
    end if;

    select st.*
    into v_transaction
    from public.savings_transactions st
    join public.savings_accounts sa on sa.id = st.savings_account_id
    where sa.member_id = v_collection.member_id
      and st.amount = v_collection.collected_amount
      and coalesce(st.transaction_type, '') = 'deposit'
      and coalesce(st.status, 'posted') = 'posted'
      and v_collection.approved_at is not null
      and abs(extract(epoch from (st.created_at - v_collection.approved_at))) <= 300
    order by st.created_at desc
    limit 1
    for update;
  end if;

  select *
  into v_account
  from public.savings_accounts
  where id = v_transaction.savings_account_id
  for update;

  if not found then
    raise exception 'Savings account linked to transaction was not found.';
  end if;

  v_total_reversed := coalesce(v_transaction.amount, 0);

  if v_total_reversed <= 0 then
    raise exception 'Savings transaction amount must be greater than zero.';
  end if;

  v_old_data := jsonb_build_object(
    'collection_id', v_collection.id,
    'collection_status', v_collection.status,
    'member_id', v_member.id,
    'member_number', v_member.member_number,
    'member_name', v_member.full_name,
    'collection_amount', v_collection.collected_amount,
    'savings_account_id', v_account.id,
    'savings_transaction_id', v_transaction.id,
    'transaction_amount', v_transaction.amount,
    'total_saved_before', coalesce(v_account.total_saved, 0)
  );

  v_new_total_saved := greatest(coalesce(v_account.total_saved, 0) - v_total_reversed, 0);

  update public.savings_transactions
  set
    status = 'reversed',
    reversed_by = v_actor,
    reversed_at = now(),
    reversal_reason = trim(p_reason),
    updated_at = now()
  where id = v_transaction.id;

  update public.savings_accounts
  set
    total_saved = v_new_total_saved,
    updated_at = now(),
    updated_by = v_actor
  where id = v_account.id;

  -- Mark existing allocation reversed if it exists.
  update public.collection_allocations
  set
    status = 'reversed',
    reversed_at = now(),
    reversed_by = v_actor,
    reversal_reason = trim(p_reason),
    updated_at = now()
  where collection_id = p_collection_id
    and allocation_type = 'savings_deposit'
    and status = 'posted';

  -- For legacy records with no allocation, create a reversed allocation trail.
  if not exists (
    select 1
    from public.collection_allocations
    where collection_id = p_collection_id
      and allocation_type = 'savings_deposit'
  ) then
    insert into public.collection_allocations (
      collection_id,
      member_id,
      allocation_type,
      target_table,
      target_record_id,
      amount,
      status,
      posted_at,
      reversed_at,
      reversed_by,
      reversal_reason,
      notes
    )
    values (
      v_collection.id,
      v_collection.member_id,
      'savings_deposit',
      'savings_transactions',
      v_transaction.id,
      v_total_reversed,
      'reversed',
      coalesce(v_collection.approved_at, v_transaction.created_at),
      now(),
      v_actor,
      trim(p_reason),
      'Legacy savings reversal trail created because original collection had no allocation record.'
    );
  end if;

  update public.collections
  set
    status = 'reversed',
    updated_at = now()
  where id = v_collection.id;

  v_new_data := jsonb_build_object(
    'collection_id', v_collection.id,
    'collection_status', 'reversed',
    'member_id', v_member.id,
    'member_number', v_member.member_number,
    'member_name', v_member.full_name,
    'savings_account_id', v_account.id,
    'savings_transaction_id', v_transaction.id,
    'amount_reversed', v_total_reversed,
    'total_saved_after', v_new_total_saved,
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
    'approved_savings_collection_reversed',
    'collections',
    'collections',
    v_collection.id,
    v_collection.member_id,
    v_total_reversed,
    v_old_data,
    v_new_data,
    trim(p_reason),
    v_actor,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'collection_id', v_collection.id,
    'member_id', v_member.id,
    'member_number', v_member.member_number,
    'member_name', v_member.full_name,
    'savings_account_id', v_account.id,
    'savings_transaction_id', v_transaction.id,
    'amount_reversed', v_total_reversed,
    'new_total_saved', v_new_total_saved,
    'message', 'Approved savings collection reversed successfully.'
  );
end;
$$;

revoke all on function public.admin_reverse_approved_savings_collection(uuid, text, uuid) from public;
revoke all on function public.admin_reverse_approved_savings_collection(uuid, text, uuid) from anon;
grant execute on function public.admin_reverse_approved_savings_collection(uuid, text, uuid) to authenticated;