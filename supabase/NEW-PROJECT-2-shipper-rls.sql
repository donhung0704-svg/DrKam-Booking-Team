-- ============================================================
-- PROJECT MOI — BUOC 3: BAT GIOI HAN TAI KHOAN SHIPPER (giao hang)
-- ============================================================
-- Chay 1 lan trong SQL Editor cua PROJECT MOI, SAU KHI da chay
-- NEW-PROJECT-1-schema.sql va da nap du lieu.
--
-- shipper (booking.famidoc): CHI xem Danh sach Booking + CHI sua 3 cot
--   (ship_date, tracking_code, order_status). Khong them/xoa, khong dung
--   toi koc/employees/campaigns.
-- Moi tai khoan khac (hongnhung...): toan quyen nhu cu.
--
-- Luu y: schema project moi da tao policy "allow_all" cho moi bang.
-- File nay XOA allow_all o 4 bang lien quan roi thay bang policy phan quyen.
-- (report_month_settings & filter_presets giu allow_all - khong lien quan shipper.)
-- ============================================================

-- Ham nhan biet shipper (doc role tu JWT app_metadata)
create or replace function public.is_shipper()
returns boolean language sql stable set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'shipper', false);
$$;

-- Trigger gioi han COT — shipper chi doi 3 cot cho phep
create or replace function public.enforce_shipper_booking_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_shipper() then
    if (to_jsonb(new) - 'ship_date' - 'tracking_code' - 'order_status')
       is distinct from
       (to_jsonb(old) - 'ship_date' - 'tracking_code' - 'order_status')
    then
      raise exception
        'Tai khoan giao hang chi duoc sua: Ngay gui, Ma van don, Tinh trang don hang';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_shipper_booking_columns on public.bookings;
create trigger trg_enforce_shipper_booking_columns
  before update on public.bookings
  for each row execute function public.enforce_shipper_booking_columns();

-- ---------------- BOOKINGS ----------------
alter table public.bookings enable row level security;
drop policy if exists allow_all on public.bookings;              -- bo "mo tat ca"
drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings
  for all to authenticated
  using (not public.is_shipper()) with check (not public.is_shipper());
drop policy if exists bookings_shipper_select on public.bookings;
create policy bookings_shipper_select on public.bookings
  for select to authenticated using (public.is_shipper());
drop policy if exists bookings_shipper_update on public.bookings;
create policy bookings_shipper_update on public.bookings
  for update to authenticated
  using (public.is_shipper()) with check (public.is_shipper());

-- ---------------- KOC (shipper chi doc) ----------------
alter table public.koc enable row level security;
drop policy if exists allow_all on public.koc;
drop policy if exists koc_admin_all on public.koc;
create policy koc_admin_all on public.koc
  for all to authenticated
  using (not public.is_shipper()) with check (not public.is_shipper());
drop policy if exists koc_shipper_select on public.koc;
create policy koc_shipper_select on public.koc
  for select to authenticated using (public.is_shipper());

-- ---------------- EMPLOYEES (shipper chi doc) ----------------
alter table public.employees enable row level security;
drop policy if exists allow_all on public.employees;
drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all on public.employees
  for all to authenticated
  using (not public.is_shipper()) with check (not public.is_shipper());
drop policy if exists employees_shipper_select on public.employees;
create policy employees_shipper_select on public.employees
  for select to authenticated using (public.is_shipper());

-- ---------------- CAMPAIGNS (shipper bi chan hoan toan) ----------------
alter table public.campaigns enable row level security;
drop policy if exists allow_all on public.campaigns;
drop policy if exists campaigns_admin_all on public.campaigns;
create policy campaigns_admin_all on public.campaigns
  for all to authenticated
  using (not public.is_shipper()) with check (not public.is_shipper());

-- Kiem tra policy
select tablename, policyname, cmd from pg_policies
where schemaname='public'
  and tablename in ('bookings','koc','employees','campaigns')
order by tablename, policyname;
