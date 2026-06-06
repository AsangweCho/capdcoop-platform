-- =========================================================
-- CAPDCOOP Savings Collection Posting Function
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
  v_total_saved numeric := 0;
begin
  -- 1. Lock collection
  select *
  into v_collection
  from public.collections
  where id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection % not found', p_collection_id;
  end if;

  if v_collection.status <> 'pending' then
    raise exception 'Only pending collections can be posted. Status=%', v_collection.status;
  end if;

  if v_collection.collection_type <> 'savings' then
    raise exception 'This function only posts savings collections. Type=%', v_collection.collection_type;
  end if;

  if v_collection.member_id is null then
    raise exception 'Collection has no member_id';
  end if;

  -- 2. Find member savings account
  select *
  into v_savings
  from public.savings_accounts
  where member_id = v_collection.member_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'No active savings account for member %', v_collection.member_id;
  end if;

  v_total_saved := coalesce(v_savings.total_saved, 0) + coalesce(v_collection.collected_amount, 0);

  -- 3. Insert savings transaction
  insert into public.savings_transactions(
    savings_account_id,
    amount,
    payment_method,
    reference,
    transaction_type,
    collected_by,
    created_by,
    created_at
  ) values (
    v_savings.id,
    v_collection.collected_amount,
    v_collection.payment_method,
    v_collection.reference,
    'deposit',
    v_collection.agent_id,
    p_approved_by,
    now()
  );

  -- 4. Update savings account
  update public.savings_accounts
  set total_saved = v_total_saved,
      updated_at = now(),
      updated_by = p_approved_by
  where id = v_savings.id;

  -- 5. Mark collection approved
  update public.collections
  set status = 'approved',
      approved_by = p_approved_by,
      approved_at = now(),
      updated_at = now()
  where id = v_collection.id;

  -- 6. Write financial log
  insert into public.financial_event_logs(
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
  ) values (
    'savings_collection_posted',
    'collections',
    'collections',
    v_collection.id,
    v_collection.member_id,
    v_collection.agent_id,
    v_collection.collected_amount,
    to_jsonb(v_collection),
    jsonb_build_object('total_saved', v_total_saved),
    p_approved_by,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'collection_id', v_collection.id,
    'member_id', v_collection.member_id,
    'amount', v_collection.collected_amount,
    'total_saved', v_total_saved
  );
end;
$$;

comment on function public.post_approved_savings_collection(uuid, uuid) is
'Safely posts one pending savings collection into savings_transactions, updates savings account and logs the event.';

grant execute on function public.post_approved_savings_collection(uuid, uuid) to authenticated;