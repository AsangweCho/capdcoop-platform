-- =========================================================
-- CAPDCOOP Share Collection Posting Function
-- Purpose: safely post share purchases recorded in Collections
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
  v_shares integer := 0;
  v_share_value numeric := 0;
begin
  -- 1. Load collection
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

  -- 2. Load member
  select *
  into v_member
  from public.members
  where id = v_collection.member_id;

  -- 3. Load share product (assume first active product)
  select *
  into v_product
  from public.share_products
  where status = 'active'
  order by created_at asc
  limit 1;

  -- 4. Calculate shares purchased
  v_shares := floor(coalesce(v_collection.collected_amount, 0) / v_product.share_price);
  v_share_value := v_shares * v_product.share_price;

  -- 5. Insert share transaction
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
  ) values (
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
    p_approved_by,
    now(),
    now()
  );

  -- 6. Update member share balances
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

  -- 7. Update old members table for temporary display
  update public.members
  set total_shares = coalesce(total_shares, 0) + v_shares,
      portfolio_value = coalesce(portfolio_value, 0) + v_share_value,
      updated_at = now()
  where id = v_member.id;

  -- 8. Mark collection approved
  update public.collections
  set status = 'approved',
      approved_by = p_approved_by,
      approved_at = now(),
      updated_at = now()
  where id = v_collection.id;

  -- 9. Write financial log
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
  ) values (
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
      'member_share_balance_id', v_balance.id
    ),
    p_approved_by,
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

comment on function public.post_approved_share_collection(uuid, uuid) is
'Safely posts share collections from Collections module, updates member share balances and ledger, writes financial log.';

grant execute on function public.post_approved_share_collection(uuid, uuid) to authenticated;