-- ==============================================================================
-- EAGLE CREDIT (PVT) LTD - FIELD COLLECTION POS SUPABASE BACKEND SCHEMA
-- Hardware target: Sunmi V2 (Android 7.1.1, 58mm Thermal Printer)
-- Security: Zero-Trust, Default Deny RLS, Security Definer RPC, Append-only Audit
-- ==============================================================================

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Drop existing objects cleanly if rebuilding
drop function if exists public.post_field_payment(text, text, numeric, timestamptz);
drop function if exists public.log_reprint(text, text);
drop function if exists public.log_login_event(text);

-- ==============================================================================
-- TABLES DEFINITION
-- ==============================================================================

-- 2.1 Staff Profiles & Roles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  officer_code text unique not null,
  role text not null check (role in ('officer', 'admin')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

-- 2.2 Customers (Assigned to Field Officers)
create table if not exists public.customers (
  id text primary key, -- e.g. 'EC-000124'
  name text not null,
  nic text unique not null,
  address text not null,
  phone text not null,
  phone2 text,
  occupation text not null,
  assigned_officer_id uuid references auth.users(id),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

-- 2.3 Facilities (Loan and Leasing Contracts)
create table if not exists public.facilities (
  facility_no text primary key, -- e.g. 'E26-03-11ACPL'
  customer_id text not null references public.customers(id) on delete restrict,
  product text not null,
  original_amount numeric(12,2) not null check (original_amount > 0),
  balance numeric(12,2) not null check (balance >= 0),
  installment numeric(12,2) not null check (installment > 0),
  frequency text not null default 'Monthly',
  tenor text not null,
  rate text not null,
  arrears numeric(12,2) not null default 0 check (arrears >= 0),
  arrears_rentals integer not null default 0 check (arrears_rentals >= 0),
  start_date text not null,
  maturity_date text not null,
  purpose text not null,
  has_asset boolean not null default false,
  vehicle text,
  make text,
  model text,
  year text,
  market_value numeric(12,2),
  color text,
  status text not null default 'Active' check (status in ('Active', 'Closed', 'Defaulted')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

-- 2.4 Guarantors
create table if not exists public.guarantors (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers(id) on delete cascade,
  facility_no text references public.facilities(facility_no) on delete set null,
  name text not null,
  relationship text not null,
  address text not null,
  phone text not null,
  nic text not null,
  created_at timestamptz not null default clock_timestamp()
);

-- 2.5 Payments (Idempotent collection records)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  receipt_no text unique not null, -- Unique idempotency receipt key (e.g. 'RC-000128')
  facility_no text not null references public.facilities(facility_no) on delete restrict,
  customer_id text not null references public.customers(id) on delete restrict,
  officer_id uuid not null references auth.users(id),
  amount numeric(12,2) not null check (amount > 0),
  status text not null check (status in ('Confirmed', 'Rejected')),
  rejection_reason text,
  collected_at timestamptz not null,
  synced_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp()
);

-- 2.6 Audit Logs (Strictly append-only)
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('LOGIN', 'LOGOUT', 'PAYMENT_POSTED', 'REPRINT', 'CUSTOMER_CHANGE', 'FACILITY_CHANGE', 'UNAUTHORIZED_ACCESS_ATTEMPT')),
  user_id uuid references auth.users(id),
  officer_code text,
  receipt_no text,
  facility_no text,
  customer_id text,
  ip_address text,
  details text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default clock_timestamp()
);

-- ==============================================================================
-- STRICT APPEND-ONLY AUDIT LOG ENFORCEMENT
-- ==============================================================================

-- Revoke dangerous permissions on audit_logs
revoke update, delete, truncate on public.audit_logs from public, anon, authenticated;

-- Function & Trigger to prevent any modification or deletion of audit logs
create or replace function public.prevent_audit_log_modification()
returns trigger as $$
begin
  raise exception 'Audit logs are strictly append-only. Modification, truncation, or deletion is prohibited by Eagle Credit compliance rules.';
end;
$$ language plpgsql security definer;

drop trigger if exists trg_audit_logs_no_update_delete on public.audit_logs;
create trigger trg_audit_logs_no_update_delete
before update or delete or truncate on public.audit_logs
for each statement execute function public.prevent_audit_log_modification();

-- Also revoke direct update and delete on payments to ensure payments are immutable
revoke update, delete on public.payments from public, anon, authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - DEFAULT DENY
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.facilities enable row level security;
alter table public.guarantors enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles RLS
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view and manage all profiles"
  on public.profiles for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Customers RLS: Officers only see assigned customers
create policy "Officers view assigned customers"
  on public.customers for select
  using (
    assigned_officer_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins manage customers"
  on public.customers for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Facilities RLS: Officers view facilities for assigned customers
create policy "Officers view facilities of assigned customers"
  on public.facilities for select
  using (
    customer_id in (select id from public.customers where assigned_officer_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins manage facilities"
  on public.facilities for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Guarantors RLS: Officers view guarantors of assigned customers
create policy "Officers view guarantors of assigned customers"
  on public.guarantors for select
  using (
    customer_id in (select id from public.customers where assigned_officer_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Payments RLS: Officers view their own payments
create policy "Officers view their payments"
  on public.payments for select
  using (
    officer_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Officers insert their payments"
  on public.payments for insert
  with check (
    officer_id = auth.uid() and
    facility_no in (
      select f.facility_no from public.facilities f
      join public.customers c on c.id = f.customer_id
      where c.assigned_officer_id = auth.uid()
    )
  );

-- Audit Logs RLS: Officers can insert audit logs for actions; read is admin-only
create policy "Officers insert audit logs"
  on public.audit_logs for insert
  with check (user_id = auth.uid());

create policy "Admins view audit logs"
  on public.audit_logs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ==============================================================================
-- POSTGRES RPC: POST FIELD PAYMENT (Security Definer)
-- Atomically processes payment, validates balance & assignment, updates ledger,
-- writes append-only audit log, and returns Confirmed/Rejected status.
-- ==============================================================================
create or replace function public.post_field_payment(
  p_receipt_no text,
  p_facility_no text,
  p_amount numeric,
  p_collected_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id text;
  v_assigned_officer uuid;
  v_current_balance numeric(12,2);
  v_current_arrears numeric(12,2);
  v_new_balance numeric(12,2);
  v_new_arrears numeric(12,2);
  v_facility_status text;
  v_existing_payment record;
begin
  -- 1. Ensure user is authenticated
  if v_user_id is null then
    return jsonb_build_object(
      'status', 'Rejected',
      'reason', 'Unauthorized: Authentication required'
    );
  end if;

  -- 2. Validate input parameters
  if p_receipt_no is null or trim(p_receipt_no) = '' then
    return jsonb_build_object(
      'status', 'Rejected',
      'reason', 'Invalid receipt number'
    );
  end if;

  if p_amount is null or p_amount <= 0 or round(p_amount, 2) != p_amount then
    return jsonb_build_object(
      'status', 'Rejected',
      'reason', 'Payment amount must be greater than zero with at most two decimal places'
    );
  end if;

  -- 3. Idempotency Check: if receipt already exists, return existing status safely without duplicate charge
  select * into v_existing_payment from public.payments where receipt_no = p_receipt_no;
  if found then
    return jsonb_build_object(
      'status', v_existing_payment.status,
      'receipt_no', v_existing_payment.receipt_no,
      'amount', v_existing_payment.amount,
      'is_duplicate', true,
      'synced_at', v_existing_payment.synced_at,
      'reason', v_existing_payment.rejection_reason
    );
  end if;

  -- 4. Lock facility row FOR UPDATE to prevent concurrency and race conditions
  select f.customer_id, f.balance, f.arrears, f.status, c.assigned_officer_id
  into v_customer_id, v_current_balance, v_current_arrears, v_facility_status, v_assigned_officer
  from public.facilities f
  join public.customers c on c.id = f.customer_id
  where f.facility_no = p_facility_no
  for update of f;

  if not found then
    return jsonb_build_object(
      'status', 'Rejected',
      'reason', 'Facility not found'
    );
  end if;

  -- 5. Validate Officer Ownership / Assignment (Unless admin)
  if v_assigned_officer is distinct from v_user_id and not exists (
    select 1 from public.profiles where id = v_user_id and role = 'admin'
  ) then
    insert into public.audit_logs (event_type, user_id, receipt_no, facility_no, customer_id, details)
    values ('UNAUTHORIZED_ACCESS_ATTEMPT', v_user_id, p_receipt_no, p_facility_no, v_customer_id, 'Attempted to post payment to unassigned customer facility');

    return jsonb_build_object(
      'status', 'Rejected',
      'reason', 'Access denied: Facility belongs to another field officer'
    );
  end if;

  -- 6. Validate facility status
  if v_facility_status != 'Active' then
    insert into public.payments (receipt_no, facility_no, customer_id, officer_id, amount, status, rejection_reason, collected_at)
    values (p_receipt_no, p_facility_no, v_customer_id, v_user_id, p_amount, 'Rejected', 'Facility is ' || v_facility_status, coalesce(p_collected_at, clock_timestamp()));

    return jsonb_build_object(
      'status', 'Rejected',
      'reason', 'Facility is inactive or closed (' || v_facility_status || ')'
    );
  end if;

  -- 7. Validate Amount vs Outstanding Balance
  if p_amount > v_current_balance then
    insert into public.payments (receipt_no, facility_no, customer_id, officer_id, amount, status, rejection_reason, collected_at)
    values (p_receipt_no, p_facility_no, v_customer_id, v_user_id, p_amount, 'Rejected', 'Amount exceeds outstanding balance', coalesce(p_collected_at, clock_timestamp()));

    return jsonb_build_object(
      'status', 'Rejected',
      'reason', 'Payment amount (Rs. ' || p_amount || ') exceeds outstanding balance (Rs. ' || v_current_balance || ')'
    );
  end if;

  -- 8. Apply deduction
  v_new_balance := v_current_balance - p_amount;
  v_new_arrears := greatest(0::numeric, v_current_arrears - p_amount);

  update public.facilities
  set balance = v_new_balance,
      arrears = v_new_arrears,
      updated_at = clock_timestamp()
  where facility_no = p_facility_no;

  -- 9. Insert payment record as Confirmed
  insert into public.payments (
    receipt_no,
    facility_no,
    customer_id,
    officer_id,
    amount,
    status,
    collected_at,
    synced_at
  )
  values (
    p_receipt_no,
    p_facility_no,
    v_customer_id,
    v_user_id,
    p_amount,
    'Confirmed',
    coalesce(p_collected_at, clock_timestamp()),
    clock_timestamp()
  );

  -- 10. Audit log entry for posted payment
  insert into public.audit_logs (
    event_type,
    user_id,
    receipt_no,
    facility_no,
    customer_id,
    details,
    old_values,
    new_values
  )
  values (
    'PAYMENT_POSTED',
    v_user_id,
    p_receipt_no,
    p_facility_no,
    v_customer_id,
    'Payment of Rs. ' || p_amount || ' posted and confirmed on Sunmi V2 terminal',
    jsonb_build_object('balance', v_current_balance, 'arrears', v_current_arrears),
    jsonb_build_object('balance', v_new_balance, 'arrears', v_new_arrears, 'amount', p_amount)
  );

  return jsonb_build_object(
    'status', 'Confirmed',
    'receipt_no', p_receipt_no,
    'facility_no', p_facility_no,
    'customer_id', v_customer_id,
    'amount', p_amount,
    'previous_balance', v_current_balance,
    'remaining_balance', v_new_balance,
    'synced_at', clock_timestamp()
  );
end;
$$;

-- ==============================================================================
-- POSTGRES RPC: LOG REPRINT
-- Records duplicate receipt print on thermal printer into audit log
-- ==============================================================================
create or replace function public.log_reprint(
  p_receipt_no text,
  p_reason text default 'Customer duplicate receipt requested'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment record;
begin
  select * into v_payment from public.payments where receipt_no = p_receipt_no;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Receipt not found');
  end if;

  insert into public.audit_logs (
    event_type,
    user_id,
    receipt_no,
    facility_no,
    customer_id,
    details
  )
  values (
    'REPRINT',
    v_user_id,
    p_receipt_no,
    v_payment.facility_no,
    v_payment.customer_id,
    'DUPLICATE receipt printed on 58mm thermal POS. Reason: ' || coalesce(p_reason, 'Customer request')
  );

  return jsonb_build_object('success', true, 'receipt_no', p_receipt_no);
end;
$$;

-- ==============================================================================
-- POSTGRES RPC: LOG LOGIN
-- Records officer authentication event into audit log
-- ==============================================================================
create or replace function public.log_login_event(
  p_officer_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  insert into public.audit_logs (
    event_type,
    user_id,
    officer_code,
    details
  )
  values (
    'LOGIN',
    v_user_id,
    p_officer_code,
    'Officer authenticated on Sunmi V2 field POS device'
  );

  return jsonb_build_object('success', true);
end;
$$;

-- ==============================================================================
-- DATABASE AUDIT TRIGGERS ON CUSTOMERS & FACILITIES
-- ==============================================================================

create or replace function public.trg_audit_customer_changes()
returns trigger as $$
begin
  insert into public.audit_logs (
    event_type,
    user_id,
    customer_id,
    details,
    old_values,
    new_values
  )
  values (
    'CUSTOMER_CHANGE',
    auth.uid(),
    coalesce(NEW.id, OLD.id),
    TG_OP || ' on customer ' || coalesce(NEW.name, OLD.name),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

drop trigger if exists customer_audit_trg on public.customers;
create trigger customer_audit_trg
after insert or update on public.customers
for each row execute function public.trg_audit_customer_changes();

create or replace function public.trg_audit_facility_changes()
returns trigger as $$
begin
  insert into public.audit_logs (
    event_type,
    user_id,
    facility_no,
    customer_id,
    details,
    old_values,
    new_values
  )
  values (
    'FACILITY_CHANGE',
    auth.uid(),
    coalesce(NEW.facility_no, OLD.facility_no),
    coalesce(NEW.customer_id, OLD.customer_id),
    TG_OP || ' on facility ' || coalesce(NEW.facility_no, OLD.facility_no),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

drop trigger if exists facility_audit_trg on public.facilities;
create trigger facility_audit_trg
after insert or update on public.facilities
for each row execute function public.trg_audit_facility_changes();

-- ==============================================================================
-- STORAGE BUCKETS (Private Only)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Authenticated users read receipts"
  on storage.objects for select
  using (bucket_id in ('receipts', 'documents') and auth.role() = 'authenticated');

create policy "Officers upload receipts"
  on storage.objects for insert
  with check (bucket_id in ('receipts', 'documents') and auth.role() = 'authenticated');
