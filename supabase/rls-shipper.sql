-- ============================================================================
-- PHÂN QUYỀN TẦNG DATABASE (RLS) CHO TÀI KHOẢN "shipper" — DrKam CRM
--
-- Mục tiêu:
--   - shipper: CHỈ đọc Danh sách Booking + CHỈ sửa 3 cột
--              (ship_date, tracking_code, order_status)
--   - shipper: KHÔNG thêm/xóa booking, KHÔNG sửa gì ở koc/employees/campaigns
--   - admin (mọi tài khoản khác): giữ nguyên toàn quyền như hiện tại
--
-- LƯU Ý: RLS chỉ chặn theo HÀNG, không chặn theo CỘT
--        -> dùng thêm TRIGGER để giới hạn đúng 3 cột.
--
-- Chạy trong: Supabase → SQL Editor
-- ============================================================================


-- ----------------------------------------------------------------------------
-- BƯỚC 0 (BẮT BUỘC KIỂM TRA TRƯỚC): xem policy đang có
-- Nếu đã tồn tại policy "cho phép tất cả" (vd: using (true)) thì PHẢI xóa nó,
-- vì các policy được cộng dồn (OR) -> shipper sẽ lọt qua policy cũ.
-- ----------------------------------------------------------------------------
-- select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--  where schemaname = 'public'
--    and tablename in ('bookings', 'koc', 'employees', 'campaigns');
--
-- Xem bảng nào đang bật RLS:
-- select relname, relrowsecurity
--   from pg_class
--  where relname in ('bookings', 'koc', 'employees', 'campaigns');


-- ----------------------------------------------------------------------------
-- BƯỚC 1: Hàm nhận biết tài khoản shipper (đọc role từ JWT)
-- Role được gán bằng: raw_app_meta_data = {"role":"shipper"}
-- ----------------------------------------------------------------------------
create or replace function public.is_shipper()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'shipper',
    false
  );
$$;


-- ----------------------------------------------------------------------------
-- BƯỚC 2: Trigger giới hạn CỘT — shipper chỉ được đổi 3 cột
-- Cách làm: bỏ 3 cột cho phép ra khỏi cả hàng cũ và hàng mới; nếu phần còn lại
-- khác nhau nghĩa là shipper đã đụng vào cột khác -> chặn.
-- (Tự động bảo vệ cả các cột thêm mới sau này.)
-- ----------------------------------------------------------------------------
create or replace function public.enforce_shipper_booking_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_shipper() then
    if (to_jsonb(new) - 'ship_date' - 'tracking_code' - 'order_status')
       is distinct from
       (to_jsonb(old) - 'ship_date' - 'tracking_code' - 'order_status')
    then
      raise exception
        'Tài khoản giao hàng chỉ được sửa: Ngày gửi, Mã vận đơn, Tình trạng đơn hàng';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_shipper_booking_columns on public.bookings;

create trigger trg_enforce_shipper_booking_columns
  before update on public.bookings
  for each row
  execute function public.enforce_shipper_booking_columns();


-- ----------------------------------------------------------------------------
-- BƯỚC 3: RLS cho BOOKINGS
--   admin   : toàn quyền
--   shipper : chỉ SELECT + UPDATE (cột bị trigger ở BƯỚC 2 giới hạn)
--             -> không có policy INSERT/DELETE = bị chặn
-- ----------------------------------------------------------------------------
alter table public.bookings enable row level security;

drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings
  for all to authenticated
  using (not public.is_shipper())
  with check (not public.is_shipper());

drop policy if exists bookings_shipper_select on public.bookings;
create policy bookings_shipper_select on public.bookings
  for select to authenticated
  using (public.is_shipper());

drop policy if exists bookings_shipper_update on public.bookings;
create policy bookings_shipper_update on public.bookings
  for update to authenticated
  using (public.is_shipper())
  with check (public.is_shipper());


-- ----------------------------------------------------------------------------
-- BƯỚC 4: RLS cho KOC
--   admin   : toàn quyền
--   shipper : CHỈ ĐỌC — bắt buộc, vì Danh sách Booking hiển thị
--             Tên KOC / Địa chỉ / SĐT lấy từ bảng koc
-- ----------------------------------------------------------------------------
alter table public.koc enable row level security;

drop policy if exists koc_admin_all on public.koc;
create policy koc_admin_all on public.koc
  for all to authenticated
  using (not public.is_shipper())
  with check (not public.is_shipper());

drop policy if exists koc_shipper_select on public.koc;
create policy koc_shipper_select on public.koc
  for select to authenticated
  using (public.is_shipper());


-- ----------------------------------------------------------------------------
-- BƯỚC 5: RLS cho EMPLOYEES
--   admin   : toàn quyền
--   shipper : CHỈ ĐỌC — cần để hiển thị tên PIC phụ trách trên Danh sách Booking
-- ----------------------------------------------------------------------------
alter table public.employees enable row level security;

drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all on public.employees
  for all to authenticated
  using (not public.is_shipper())
  with check (not public.is_shipper());

drop policy if exists employees_shipper_select on public.employees;
create policy employees_shipper_select on public.employees
  for select to authenticated
  using (public.is_shipper());


-- ----------------------------------------------------------------------------
-- BƯỚC 6: RLS cho CAMPAIGNS — chỉ admin, shipper bị chặn hoàn toàn
-- ----------------------------------------------------------------------------
alter table public.campaigns enable row level security;

drop policy if exists campaigns_admin_all on public.campaigns;
create policy campaigns_admin_all on public.campaigns
  for all to authenticated
  using (not public.is_shipper())
  with check (not public.is_shipper());


-- ============================================================================
-- GỠ BỎ (chỉ dùng khi có sự cố, muốn quay lại như cũ)
-- ============================================================================
-- alter table public.bookings  disable row level security;
-- alter table public.koc       disable row level security;
-- alter table public.employees disable row level security;
-- alter table public.campaigns disable row level security;
-- drop trigger if exists trg_enforce_shipper_booking_columns on public.bookings;
