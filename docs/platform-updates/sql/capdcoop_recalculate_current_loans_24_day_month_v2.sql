-- CAPDCOOP one-time Aid recalculation script - v2
-- Fixes:
--   1. Uses 24 collection days as one Aid month for interest.
--   2. Rebuilds active Aid schedules using Monday-Friday collection dates only.
--   3. Reapplies existing repayments to today's installment first, then old arrears, then future installments.
--   4. Uses a normal protected work table instead of an ON COMMIT DROP temp table,
--      because Supabase SQL Editor can lose temp tables between execution steps.
--
-- Run only after confirming you have a database backup.

begin;

alter table public.loans
add column if not exists repayment_start_date date;

-- Backup tables. These remain in the database so you can recover the pre-recalculation state.
create table if not exists public.loans_backup_24_day_recalc as
select
  now()::timestamptz as backup_created_at,
  l.*
from public.loans l
where false;

alter table public.loans_backup_24_day_recalc enable row level security;

create table if not exists public.loan_repayment_schedule_backup_24_day_recalc as
select
  now()::timestamptz as backup_created_at,
  s.*
from public.loan_repayment_schedule s
where false;

alter table public.loan_repayment_schedule_backup_24_day_recalc enable row level security;

-- Use a normal work table rather than a temp table. It is dropped before commit.
drop table if exists public.aid_recalc_targets_24_day_work;

create table public.aid_recalc_targets_24_day_work as
with base as (
  select
    l.id,
    l.member_id,
    l.status as original_status,
    coalesce(l.loan_amount, 0)::numeric as loan_amount,
    greatest(coalesce(l.duration_days, 0), 0)::integer as duration_days,
    coalesce(l.amount_repaid, 0)::numeric as amount_repaid,
    (coalesce(l.loan_amount, 0)::numeric * 0.025) as insurance_fee,
    5000::numeric as registration_fee,
    (coalesce(l.loan_amount, 0)::numeric * 0.03 * (greatest(coalesce(l.duration_days, 0), 0)::numeric / 24::numeric)) as total_interest,
    (
      coalesce(l.loan_amount, 0)::numeric
      + (coalesce(l.loan_amount, 0)::numeric * 0.025)
      + 5000::numeric
      + (coalesce(l.loan_amount, 0)::numeric * 0.03 * (greatest(coalesce(l.duration_days, 0), 0)::numeric / 24::numeric))
    ) as total_expected_repayment,
    case
      when greatest(coalesce(l.duration_days, 0), 0) > 0 then
        (
          coalesce(l.loan_amount, 0)::numeric
          + (coalesce(l.loan_amount, 0)::numeric * 0.025)
          + 5000::numeric
          + (coalesce(l.loan_amount, 0)::numeric * 0.03 * (greatest(coalesce(l.duration_days, 0), 0)::numeric / 24::numeric))
        ) / greatest(coalesce(l.duration_days, 0), 0)::numeric
      else 0::numeric
    end as daily_payment_amount,
    coalesce(
      l.repayment_start_date,
      l.start_date::date,
      l.disbursed_at::date,
      current_date
    ) as raw_start_date
  from public.loans l
  where l.status in ('pending', 'approved', 'active')
    and coalesce(l.is_deleted, false) = false
)
select
  base.*,
  (
    base.raw_start_date
    + case extract(isodow from base.raw_start_date)::integer
        when 6 then 2
        when 7 then 1
        else 0
      end
  )::date as first_due_date
from base;

alter table public.aid_recalc_targets_24_day_work enable row level security;

-- Back up affected loans and their schedules before changing anything.
insert into public.loans_backup_24_day_recalc
select
  now()::timestamptz as backup_created_at,
  l.*
from public.loans l
join public.aid_recalc_targets_24_day_work t on t.id = l.id;

insert into public.loan_repayment_schedule_backup_24_day_recalc
select
  now()::timestamptz as backup_created_at,
  s.*
from public.loan_repayment_schedule s
join public.aid_recalc_targets_24_day_work t on t.id = s.loan_id;

-- Recalculate loan totals.
update public.loans l
set
  insurance_fee = t.insurance_fee,
  registration_fee = t.registration_fee,
  total_interest = t.total_interest,
  total_expected_repayment = t.total_expected_repayment,
  daily_payment_amount = t.daily_payment_amount,
  outstanding_balance = case
    when t.original_status = 'active' then greatest(t.total_expected_repayment - t.amount_repaid, 0)
    else t.total_expected_repayment
  end,
  repayment_start_date = case
    when t.original_status = 'active' then t.first_due_date
    else l.repayment_start_date
  end,
  status = case
    when t.original_status = 'active'
      and greatest(t.total_expected_repayment - t.amount_repaid, 0) <= 0.01
      then 'closed'
    else l.status
  end,
  updated_at = now()
from public.aid_recalc_targets_24_day_work t
where t.id = l.id;

-- Rebuild schedules only for loans that were active before recalculation.
delete from public.loan_repayment_schedule s
using public.aid_recalc_targets_24_day_work t
where t.id = s.loan_id
  and t.original_status = 'active';

with schedule_dates as (
  select
    t.id as loan_id,
    t.member_id,
    t.duration_days,
    t.amount_repaid,
    t.daily_payment_amount,
    gs.due_date,
    gs.weekday_index::integer as installment_number
  from public.aid_recalc_targets_24_day_work t
  cross join lateral (
    select
      d::date as due_date,
      row_number() over (order by d asc) as weekday_index
    from generate_series(
      t.first_due_date,
      t.first_due_date + ((t.duration_days * 2 + 60)::text || ' days')::interval,
      interval '1 day'
    ) d
    where extract(isodow from d)::integer between 1 and 5
  ) gs
  where t.original_status = 'active'
    and t.member_id is not null
    and t.duration_days > 0
    and gs.weekday_index <= t.duration_days
), allocation_order as (
  select
    sd.*,
    case
      when sd.due_date = current_date then 0
      when sd.due_date < current_date then 1
      else 2
    end as payment_priority
  from schedule_dates sd
), allocated as (
  select
    ao.*,
    coalesce(
      sum(ao.daily_payment_amount) over (
        partition by ao.loan_id
        order by ao.payment_priority asc, ao.due_date asc, ao.installment_number asc
        rows between unbounded preceding and 1 preceding
      ),
      0
    ) as paid_before
  from allocation_order ao
), final_schedule as (
  select
    a.*,
    least(
      a.daily_payment_amount,
      greatest(a.amount_repaid - a.paid_before, 0)
    ) as paid_amount
  from allocated a
)
insert into public.loan_repayment_schedule (
  loan_id,
  member_id,
  installment_number,
  due_date,
  expected_amount,
  paid_amount,
  arrears_amount,
  status
)
select
  fs.loan_id,
  fs.member_id,
  fs.installment_number,
  fs.due_date,
  fs.daily_payment_amount,
  fs.paid_amount,
  greatest(fs.daily_payment_amount - fs.paid_amount, 0) as arrears_amount,
  case
    when greatest(fs.daily_payment_amount - fs.paid_amount, 0) <= 0.0001 then 'paid'
    when fs.paid_amount > 0 then 'partial'
    when fs.due_date < current_date then 'overdue'
    else 'pending'
  end as status
from final_schedule fs
order by fs.loan_id, fs.installment_number;

-- Make fully repaid loans clean in the schedule.
update public.loan_repayment_schedule s
set
  paid_amount = coalesce(s.expected_amount, 0),
  arrears_amount = 0,
  status = 'paid'
from public.loans l
where l.id = s.loan_id
  and l.status = 'closed'
  and l.id in (
    select id
    from public.aid_recalc_targets_24_day_work
    where original_status = 'active'
  );

-- Remove the work table. Backup tables remain.
drop table if exists public.aid_recalc_targets_24_day_work;

commit;

-- Validation queries to run after the transaction:
--
-- select
--   loan_number,
--   loan_amount,
--   duration_days,
--   total_interest,
--   daily_payment_amount,
--   total_expected_repayment,
--   amount_repaid,
--   outstanding_balance,
--   status,
--   repayment_start_date
-- from public.loans
-- where coalesce(is_deleted, false) = false
-- order by created_at desc;
--
-- select
--   count(*) as weekend_schedule_rows
-- from public.loan_repayment_schedule
-- where extract(isodow from due_date)::integer in (6, 7);
--
-- select
--   l.loan_number,
--   l.duration_days,
--   count(s.id) as schedule_rows,
--   min(s.due_date) as first_due_date,
--   max(s.due_date) as last_due_date
-- from public.loans l
-- left join public.loan_repayment_schedule s on s.loan_id = l.id
-- where l.status in ('active', 'closed')
--   and coalesce(l.is_deleted, false) = false
-- group by l.loan_number, l.duration_days
-- order by l.loan_number;
