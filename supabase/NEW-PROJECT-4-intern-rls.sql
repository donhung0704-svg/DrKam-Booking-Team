-- ============================================================
-- QUYEN "TTS BOOKING" (role = intern) — gan voi 1 PIC theo EMAIL
-- ============================================================
-- Chay 1 lan trong SQL Editor cua PROJECT MOI (BookingV2), SAU
-- NEW-PROJECT-2-shipper-rls.sql.
--
-- intern (vd booking.famidoc@gmail.com):
--   - XEM tat ca (koc, bookings, employees, campaigns).
--   - THEM / SUA koc & bookings CHI khi employee_id = PIC cua ban than.
--   - KHONG xoa; KHONG sua cua PIC khac; KHONG sua employees/campaigns.
--
-- "PIC cua ban than" = employee co EMAIL trung email dang nhap cua intern.
--   -> Khi tao them PIC moi va dat email = booking.famidoc@gmail.com thi
--      tai khoan TTS tu dong gan voi PIC do (khong can sua gi them).
-- ============================================================

-- ---------------- Ham nhan biet intern + PIC cua ho ----------------
create or replace function public.is_intern()
returns boolean language sql stable set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'intern', false);
$$;

-- Tap employee_id ma intern nay duoc phep (khop email dang nhap)
create or replace function public.intern_employee_ids()
returns setof uuid language sql stable set search_path = public as $$
  select e.id from public.employees e
  where btrim(coalesce(e.email, '')) <> ''
    and lower(btrim(e.email)) = lower(btrim(auth.jwt() ->> 'email'));
$$;


-- ---------------- KOC ----------------
alter table public.koc enable row level security;
-- Admin (khong phai shipper, khong phai intern): toan quyen
drop policy if exists koc_admin_all on public.koc;
create policy koc_admin_all on public.koc
  for all to authenticated
  using (not public.is_shipper() and not public.is_intern())
  with check (not public.is_shipper() and not public.is_intern());
-- intern: XEM tat ca
drop policy if exists koc_intern_select on public.koc;
create policy koc_intern_select on public.koc
  for select to authenticated using (public.is_intern());
-- intern: THEM chi khi PIC = cua minh
drop policy if exists koc_intern_insert on public.koc;
create policy koc_intern_insert on public.koc
  for insert to authenticated
  with check (public.is_intern() and employee_id in (select public.intern_employee_ids()));
-- intern: SUA chi dong co PIC = cua minh, va giu nguyen PIC do
drop policy if exists koc_intern_update on public.koc;
create policy koc_intern_update on public.koc
  for update to authenticated
  using (public.is_intern() and employee_id in (select public.intern_employee_ids()))
  with check (public.is_intern() and employee_id in (select public.intern_employee_ids()));
-- (khong co policy DELETE cho intern -> khong xoa duoc)


-- ---------------- BOOKINGS ----------------
alter table public.bookings enable row level security;
drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings
  for all to authenticated
  using (not public.is_shipper() and not public.is_intern())
  with check (not public.is_shipper() and not public.is_intern());
drop policy if exists bookings_intern_select on public.bookings;
create policy bookings_intern_select on public.bookings
  for select to authenticated using (public.is_intern());
drop policy if exists bookings_intern_insert on public.bookings;
create policy bookings_intern_insert on public.bookings
  for insert to authenticated
  with check (public.is_intern() and employee_id in (select public.intern_employee_ids()));
drop policy if exists bookings_intern_update on public.bookings;
create policy bookings_intern_update on public.bookings
  for update to authenticated
  using (public.is_intern() and employee_id in (select public.intern_employee_ids()))
  with check (public.is_intern() and employee_id in (select public.intern_employee_ids()));


-- ---------------- EMPLOYEES (intern chi doc) ----------------
alter table public.employees enable row level security;
drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all on public.employees
  for all to authenticated
  using (not public.is_shipper() and not public.is_intern())
  with check (not public.is_shipper() and not public.is_intern());
drop policy if exists employees_intern_select on public.employees;
create policy employees_intern_select on public.employees
  for select to authenticated using (public.is_intern());


-- ---------------- CAMPAIGNS (intern chi doc) ----------------
alter table public.campaigns enable row level security;
drop policy if exists campaigns_admin_all on public.campaigns;
create policy campaigns_admin_all on public.campaigns
  for all to authenticated
  using (not public.is_shipper() and not public.is_intern())
  with check (not public.is_shipper() and not public.is_intern());
drop policy if exists campaigns_intern_select on public.campaigns;
create policy campaigns_intern_select on public.campaigns
  for select to authenticated using (public.is_intern());


-- ---------------- Kiem tra ----------------
select tablename, policyname, cmd from pg_policies
where schemaname='public'
  and tablename in ('bookings','koc','employees','campaigns')
order by tablename, policyname;
