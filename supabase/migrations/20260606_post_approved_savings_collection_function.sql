-- =========================================================
-- CAPDCOOP Savings Collection Posting Function
-- Purpose:
-- Safely post optional savings collections after finance approval.
--
-- Savings are not compulsory and do not create arrears.
-- This function only posts money that has actually been recorded
-- and approved as a savings collection.
-- =========================================================

alter table public.savings_accounts
add column if not exists updated_at timestamptz,
add column if not exists updated_by uuid;

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
  v_total_saved numeric := 0;
  v_amount numeric := 0;
begin
  -- 1. Lock and load collection
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

  -- 2. Load member
  select *
  into v_member
  from public.members
  where id = v_collection.member_id;

  if not found then
    raise exception 'Member % not found', v_collection.member_id;
  end if;

  -- 3. Get agent name if available
  select full_name
  into v_agent_name
  from public.agents
  where id = v_collection.agent_id;

  v_agent_name := coalesce(v_agent_name, 'Admin');

  -- 4. Find active savings account
  select *
  into v_savings
  from public.savings_accounts
  where member_id = v_collection.member_id
    and coalesce(status, 'active') = 'active'
  order by created_at desc
  limit 1
  for update;

  -- 5. If no savings account exists, create one
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
      p_approved_by,
      now(),
      now(),
      p_approved_by
    )
    returning *
    into v_savings;
  end if;

  v_total_saved := coalesce(v_savings.total_saved, 0) + v_amount;

  -- 6. Insert savings transaction
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
    p_approved_by,
    now()
  );

  -- 7. Update savings account balance summary
  update public.savings_accounts
  set
    total_saved = v_total_saved,
    updated_at = now(),
    updated_by = p_approved_by
  where id = v_savings.id;

  -- 8. Mark collection approved
  update public.collections
  set
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = now(),
    updated_at = now()
  where id = v_collection.id;

  -- 9. Write financial event log
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
      'new_total_saved', v_total_saved
    ),
    'Posted pending savings collection into savings ledger',
    p_approved_by,
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

comment on function public.post_approved_savings_collection(uuid, uuid) is
'Safely posts one optional pending savings collection into savings_transactions, updates savings account balance, approves the collection, and writes financial logs.';

grant execute on function public.post_approved_savings_collection(uuid, uuid) to authenticated;