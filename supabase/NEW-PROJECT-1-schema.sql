-- ============================================================
-- CHUYEN SANG PROJECT SUPABASE MOI — BUOC 1: TAO SCHEMA
-- ============================================================
-- Chay 1 lan trong SQL Editor cua PROJECT MOI (project Free vua tao).
-- Tao lai cau truc bang giong project cu (suy ra tu du lieu that).
-- CO Y BO: koc_history, bookings_history + trigger ghi lich su
--          (chinh no lam phinh DB -> khong tao lai de tranh tai dien).
-- Sau khi chay xong -> bao lai de nap du lieu (BUOC 2).
-- ============================================================

-- ---------------- employees ----------------
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  role text,
  active boolean default true,
  manager_id uuid,
  employee_code text,
  created_at timestamptz default now(),
  kpi_gmv numeric,
  kpi_lien_he numeric,
  kpi_phan_hoi numeric,
  kpi_booking_moi numeric,
  kpi_thang_lien_he numeric,
  kpi_thang_phan_hoi numeric,
  kpi_thang_booking_moi numeric,
  kpi_thang_gmv numeric,
  team_type text,
  kpi_thang_koc_moi numeric,
  kpi_thang_video_moi numeric,
  kpi_thang_chi_phi numeric,
  kpi_thang_video_tru_pov numeric,
  kpi_thang_video_co_dt numeric,
  ts_thang_lien_he numeric,
  ts_thang_phan_hoi numeric,
  ts_thang_booking_moi numeric,
  ts_thang_gmv numeric,
  ts_thang_koc_moi numeric,
  ts_thang_video_moi numeric,
  ts_thang_chi_phi numeric,
  ts_thang_video_tru_pov numeric,
  ts_thang_video_co_dt numeric,
  kpi_thang_retention numeric,
  ts_thang_retention numeric
);

-- ---------------- campaigns ----------------
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name text,
  product_name text,
  start_date date,
  end_date date,
  budget numeric,
  target_video numeric,
  target_gmv numeric,
  status text,
  campaign_code text,
  note text
);

-- ---------------- koc ----------------
-- Luu y: cot "Id_tiktok_Ten_fb" viet hoa chu cai dau -> BAT BUOC dat trong "..."
create table if not exists koc (
  id uuid primary key default gen_random_uuid(),
  "Id_tiktok_Ten_fb" text,
  name text,
  tiktok_link text,
  facebook_link text,
  phone text,
  email text,
  follower numeric,
  engagement_rate numeric,
  cast_price numeric,
  address text,
  status text,
  note text,
  created_at date default current_date,
  new_contact_date date,
  date_of_birth date,
  tier text,
  number_of_videos numeric,
  campaign_id uuid,
  employee_id uuid,
  koc_code text,
  channel_type text,
  marital_status text,
  booking_date date,
  gmv numeric,
  gmv_thang numeric,
  monthly_videos numeric,
  platform text,
  videos_with_revenue numeric,
  items_sold numeric,
  items_returned numeric,
  commission_type text
);

-- ---------------- bookings ----------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid,
  cast_price numeric,
  commission numeric default 0,
  expected_post_date date,
  actual_post_date date,
  status_booking text,
  note text,
  expense numeric default 0,
  product text,
  created_at timestamptz default now(),
  booking_code text,
  koc_id uuid,
  booking_type text,
  campaign_id uuid,
  order_items jsonb,
  quantity numeric,
  order_value numeric,
  delivery_address text,
  recipient_phone text,
  ship_date date,
  tracking_code text,
  order_status text
);

-- ---------------- report_month_settings ----------------
create table if not exists report_month_settings (
  month text primary key,
  koc_vid_prev_month numeric,
  updated_at timestamptz default now()
);

-- ---------------- filter_presets ----------------
create table if not exists filter_presets (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  name text not null,
  filters jsonb not null default '[]',
  sort jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MO QUYEN cho app (anon key) — RLS + policy cho phep tat ca,
-- giong cach project cu dang chay (cong cu noi bo).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'employees','campaigns','koc','bookings','report_month_settings','filter_presets'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists allow_all on %I;', t);
    execute format('create policy allow_all on %I for all using (true) with check (true);', t);
    execute format('grant select, insert, update, delete on %I to anon, authenticated;', t);
  end loop;
end $$;

-- Kiem tra
select table_name from information_schema.tables
where table_schema='public' order by table_name;
