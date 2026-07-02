-- CAPDCOOP Aid posting fix
-- Purpose:
-- 1) Approve Aid collections only against an active loan.
-- 2) Apply lump-sum repayments to today's installment first.
-- 3) Use the remaining amount to reduce old arrears, then future installments.
-- 4) Close the Aid automatically when the balance reaches zero.

alter table public.loans
add column if not exists repayment_start_date date;

create or replace function public.post_approved_aid_collection(
  p_collection_id uuid,
  p_approved_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection public.collections%rowtype;
  v_loan public.loans%rowtype;
  v_collected_amount numeric := 0;
  v_amount_to_apply numeric := 0;
  v_remaining numeric := 0;
  v_schedule_due numeric := 0;
  v_applied_to_row numeric := 0;
  v_amount_applied numeric := 0;
  v_installments_touched integer := 0;
  v_installments_fully_paid integer := 0;
  v_installments_partially_paid integer := 0;
  v_new_amount_repaid numeric := 0;
  v_new_outstanding numeric := 0;
  v_unapplied_amount numeric := 0;
  v_row record;
begin
  select c.*
    into v_collection
  from public.collections c
  where c.id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection not found.';
  end if;

  if v_collection.status = 'approved' then
    return jsonb_build_object(
      'already_approved', true,
      'amount_applied', 0,
      'unapplied_amount', 0,
      'installments_touched', 0,
      'installments_fully_paid', 0,
      'installments_partially_paid', 0,
      'loan_closed', false
    );
  end if;

  if v_collection.status = 'rejected' then
    raise exception 'Rejected collections cannot be approved.';
  end if;

  if v_collection.collection_type <> 'loan' then
    raise exception 'This collection is not an Aid repayment collection.';
  end if;

  if v_collection.member_id is null then
    raise exception 'Aid collection is not linked to a member.';
  end if;

  v_collected_amount := coalesce(v_collection.collected_amount, 0);

  if v_collected_amount <= 0 then
    raise exception 'Collected amount must be greater than zero.';
  end if;

  select l.*
    into v_loan
  from public.loans l
  where l.member_id = v_collection.member_id
    and l.status = 'active'
    and coalesce(l.is_deleted, false) = false
    and coalesce(l.outstanding_balance, 0) > 0
  order by coalesce(l.disbursed_at, l.approved_at, l.created_at) asc nulls last
  limit 1
  for update;

  if not found then
    raise exception 'Rejected: this member has no active Aid facility.';
  end if;

  v_amount_to_apply := least(
    v_collected_amount,
    greatest(coalesce(v_loan.outstanding_balance, 0), 0)
  );

  v_unapplied_amount := greatest(v_collected_amount - v_amount_to_apply, 0);
  v_remaining := v_amount_to_apply;

  if v_amount_to_apply <= 0 then
    raise exception 'This Aid facility has no outstanding balance to receive repayment.';
  end if;

  update public.collections
  set
    status = 'approved',
    approved_at = now(),
    approved_by = p_approved_by
  where id = p_collection_id;

  -- Allocation order:
  -- 1. Today's scheduled installment
  -- 2. Old arrears, oldest first
  -- 3. Future installments, earliest first
  for v_row in
    select s.*
    from public.loan_repayment_schedule s
    where s.loan_id = v_loan.id
      and coalesce(s.expected_amount, 0) > coalesce(s.paid_amount, 0)
    order by
      case
        when s.due_date = current_date then 0
        when s.due_date < current_date then 1
        else 2
      end,
      s.due_date asc,
      s.installment_number asc
    for update
  loop
    exit when v_remaining <= 0;

    v_schedule_due := greatest(
      coalesce(v_row.expected_amount, 0) - coalesce(v_row.paid_amount, 0),
      0
    );

    if v_schedule_due <= 0 then
      continue;
    end if;

    v_applied_to_row := least(v_remaining, v_schedule_due);

    update public.loan_repayment_schedule
    set
      paid_amount = coalesce(paid_amount, 0) + v_applied_to_row,
      arrears_amount = greatest(
        coalesce(expected_amount, 0) - (coalesce(paid_amount, 0) + v_applied_to_row),
        0
      ),
      status = case
        when greatest(
          coalesce(expected_amount, 0) - (coalesce(paid_amount, 0) + v_applied_to_row),
          0
        ) <= 0.0001 then 'paid'
        when (coalesce(paid_amount, 0) + v_applied_to_row) > 0 then 'partial'
        when due_date < current_date then 'overdue'
        else 'pending'
      end
    where id = v_row.id;

    v_remaining := v_remaining - v_applied_to_row;
    v_amount_applied := v_amount_applied + v_applied_to_row;
    v_installments_touched := v_installments_touched + 1;

    if v_applied_to_row >= v_schedule_due - 0.0001 then
      v_installments_fully_paid := v_installments_fully_paid + 1;
    else
      v_installments_partially_paid := v_installments_partially_paid + 1;
    end if;
  end loop;

  -- Keep overdue/pending status clean for this Aid facility after the allocation.
  update public.loan_repayment_schedule s
  set
    arrears_amount = greatest(coalesce(s.expected_amount, 0) - coalesce(s.paid_amount, 0), 0),
    status = case
      when greatest(coalesce(s.expected_amount, 0) - coalesce(s.paid_amount, 0), 0) <= 0.0001 then 'paid'
      when coalesce(s.paid_amount, 0) > 0 then 'partial'
      when s.due_date < current_date then 'overdue'
      else 'pending'
    end
  where s.loan_id = v_loan.id;

  v_new_amount_repaid := coalesce(v_loan.amount_repaid, 0) + v_amount_to_apply;
  v_new_outstanding := greatest(
    coalesce(v_loan.total_expected_repayment, 0) - v_new_amount_repaid,
    0
  );

  update public.loans
  set
    amount_repaid = v_new_amount_repaid,
    outstanding_balance = v_new_outstanding,
    last_payment_date = coalesce(v_collection.collection_date, current_date),
    repayment_start_date = coalesce(
      repayment_start_date,
      coalesce(v_collection.collection_date, current_date)
    ),
    status = case
      when v_new_outstanding <= 0.01 then 'closed'
      else status
    end,
    updated_at = now(),
    updated_by = p_approved_by
  where id = v_loan.id;

  if v_new_outstanding <= 0.01 then
    update public.loan_repayment_schedule
    set
      paid_amount = coalesce(expected_amount, 0),
      arrears_amount = 0,
      status = 'paid'
    where loan_id = v_loan.id;
  end if;

  return jsonb_build_object(
    'already_approved', false,
    'loan_id', v_loan.id,
    'loan_number', v_loan.loan_number,
    'amount_applied', v_amount_to_apply,
    'unapplied_amount', v_unapplied_amount,
    'installments_touched', v_installments_touched,
    'installments_fully_paid', v_installments_fully_paid,
    'installments_partially_paid', v_installments_partially_paid,
    'loan_closed', v_new_outstanding <= 0.01
  );
end;
$$;

grant execute on function public.post_approved_aid_collection(uuid, uuid) to authenticated;
