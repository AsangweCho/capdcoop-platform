-- =========================================================
-- CAPDCOOP Super Admin Reverse Approved Aid Collection
-- Purpose:
-- Safely reverse an approved Aid repayment collection after it
-- has posted into aid_payments, collection_allocations,
-- loan_repayment_schedule, and loans.
--
-- This does NOT delete records.
-- It marks records reversed, restores schedule balances,
-- adjusts the Aid facility balance, and writes an audit log.
-- =========================================================

create or replace function public.admin_reverse_approved_aid_collection(
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
  v_aid public.loans%rowtype;
  v_member public.members%rowtype;

  v_payment record;

  v_total_reversed numeric := 0;
  v_rows_reversed integer := 0;
  v_schedule_rows_touched integer := 0;

  v_new_schedule_paid numeric := 0;
  v_new_schedule_arrears numeric := 0;
  v_new_schedule_status text := 'pending';

  v_new_amount_repaid numeric := 0;
  v_new_outstanding_balance numeric := 0;

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

  if v_collection.collection_type <> 'loan' then
    raise exception 'Only Aid repayment collections can be reversed by this function. Collection type is %.', v_collection.collection_type;
  end if;

  if v_collection.status = 'reversed' then
    raise exception 'This collection is already reversed.';
  end if;

  if v_collection.status <> 'approved' then
    raise exception 'Only approved Aid collections can be reversed. Current status is %.', v_collection.status;
  end if;

  select *
  into v_member
  from public.members
  where id = v_collection.member_id;

  if not found then
    raise exception 'Member linked to this collection was not found.';
  end if;

  select l.*
  into v_aid
  from public.loans l
  join public.aid_payments ap on ap.aid_facility_id = l.id
  where ap.collection_id = p_collection_id
    and ap.status = 'posted'
  order by ap.created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'No active posted Aid ledger payment found for this collection.';
  end if;

  v_old_data := jsonb_build_object(
    'collection_id', v_collection.id,
    'collection_status', v_collection.status,
    'member_id', v_member.id,
    'member_number', v_member.member_number,
    'member_name', v_member.full_name,
    'collection_amount', v_collection.collected_amount,
    'aid_facility_id', v_aid.id,
    'aid_number', v_aid.loan_number,
    'amount_repaid_before', coalesce(v_aid.amount_repaid, 0),
    'outstanding_balance_before', coalesce(v_aid.outstanding_balance, 0)
  );

  for v_payment in
    select *
    from public.aid_payments
    where collection_id = p_collection_id
      and status = 'posted'
    order by created_at asc
    for update
  loop
    v_total_reversed := v_total_reversed + coalesce(v_payment.amount, 0);
    v_rows_reversed := v_rows_reversed + 1;

    if v_payment.schedule_id is not null then
      update public.loan_repayment_schedule s
      set
        paid_amount = greatest(coalesce(s.paid_amount, 0) - coalesce(v_payment.amount, 0), 0),
        arrears_amount = greatest(
          coalesce(s.expected_amount, 0) -
          greatest(coalesce(s.paid_amount, 0) - coalesce(v_payment.amount, 0), 0),
          0
        ),
        status = case
          when greatest(coalesce(s.paid_amount, 0) - coalesce(v_payment.amount, 0), 0) <= 0
               and s.due_date < current_date
            then 'overdue'
          when greatest(coalesce(s.paid_amount, 0) - coalesce(v_payment.amount, 0), 0) <= 0
            then 'pending'
          when greatest(coalesce(s.paid_amount, 0) - coalesce(v_payment.amount, 0), 0) < coalesce(s.expected_amount, 0)
               and s.due_date < current_date
            then 'overdue'
          when greatest(coalesce(s.paid_amount, 0) - coalesce(v_payment.amount, 0), 0) < coalesce(s.expected_amount, 0)
            then 'partial'
          else 'paid'
        end,
        updated_at = now()
      where s.id = v_payment.schedule_id;

      v_schedule_rows_touched := v_schedule_rows_touched + 1;
    end if;

    update public.aid_payments
    set
      status = 'reversed',
      notes = concat(
        coalesce(notes, ''),
        case when notes is null or notes = '' then '' else ' | ' end,
        'Reversed by Super Admin. Reason: ',
        trim(p_reason)
      ),
      updated_at = now()
    where id = v_payment.id;
  end loop;

  if v_total_reversed <= 0 then
    raise exception 'No posted Aid payment amount found to reverse.';
  end if;

  update public.collection_allocations
  set
    status = 'reversed',
    reversed_at = now(),
    reversed_by = v_actor,
    reversal_reason = trim(p_reason),
    updated_at = now()
  where collection_id = p_collection_id
    and allocation_type = 'aid_repayment'
    and status = 'posted';

  v_new_amount_repaid := greatest(coalesce(v_aid.amount_repaid, 0) - v_total_reversed, 0);

  v_new_outstanding_balance :=
    case
      when coalesce(v_aid.total_expected_repayment, 0) > 0 then
        greatest(coalesce(v_aid.total_expected_repayment, 0) - v_new_amount_repaid, 0)
      else
        coalesce(v_aid.outstanding_balance, 0) + v_total_reversed
    end;

  update public.loans
  set
    amount_repaid = v_new_amount_repaid,
    outstanding_balance = v_new_outstanding_balance,
    status = case
      when status = 'closed' and v_new_outstanding_balance > 0 then 'active'
      else status
    end,
    updated_at = now(),
    updated_by = v_actor,
    edit_reason = trim(p_reason)
  where id = v_aid.id;

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
    'aid_facility_id', v_aid.id,
    'aid_number', v_aid.loan_number,
    'amount_reversed', v_total_reversed,
    'aid_payment_rows_reversed', v_rows_reversed,
    'schedule_rows_touched', v_schedule_rows_touched,
    'amount_repaid_after', v_new_amount_repaid,
    'outstanding_balance_after', v_new_outstanding_balance,
    'reversal_reason', trim(p_reason)
  );

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
    'approved_aid_collection_reversed',
    'collections',
    'collections',
    v_collection.id,
    v_collection.member_id,
    v_collection.agent_id,
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
    'aid_facility_id', v_aid.id,
    'aid_number', v_aid.loan_number,
    'amount_reversed', v_total_reversed,
    'aid_payment_rows_reversed', v_rows_reversed,
    'schedule_rows_touched', v_schedule_rows_touched,
    'new_amount_repaid', v_new_amount_repaid,
    'new_outstanding_balance', v_new_outstanding_balance,
    'message', 'Approved Aid collection reversed successfully.'
  );
end;
$$;

revoke all on function public.admin_reverse_approved_aid_collection(uuid, text, uuid) from public;
revoke all on function public.admin_reverse_approved_aid_collection(uuid, text, uuid) from anon;
grant execute on function public.admin_reverse_approved_aid_collection(uuid, text, uuid) to authenticated;