-- ============================================================
-- SUA DU LIEU CU: created_at cua bookings bi lech +7h (nhay +1 ngay)
-- ============================================================
-- Boi canh:
--   Truoc ban va (deploy c5de375), form "Tao Booking" luu created_at bang
--   GIO VIET NAM treo (khong kem mui gio) vao cot timestamptz -> Postgres
--   hieu la UTC -> luc hien thi doi sang gio VN (+7h) -> booking tao sau 17h
--   gio VN bi nhay sang NGAY HOM SAU.
--
--   Cach sua: lui created_at lai 7 gio -> tro ve dung moc UTC that.
--   - Booking tao buoi toi: duoc sua dung ngay.
--   - Booking tao ban ngay & booking import (luu ngay-don-thuan 00:00):
--     NGAY hien thi GIU NGUYEN -> an toan.
--
-- !!! QUAN TRONG:
--   * CHAY DUNG 1 LAN, NGAY BAY GIO, TRUOC khi tao them booking moi.
--     (Sau ban va, booking moi da luu UTC dung; neu tre thi khong con
--      phan biet duoc cu/moi bang gia tri thoi gian.)
--   * File nay co CHOT CHAN chong chay 2 lan (bang _migrations_done).
--     Chay lai lan 2 se tu dong bo qua.
-- ============================================================

-- Xem thu vai dong TRUOC khi sua (tuy chon):
-- select id, koc_id, created_at,
--        (created_at at time zone 'Asia/Ho_Chi_Minh')::date as ngay_hien_thi_hien_tai
-- from bookings
-- order by created_at desc
-- limit 20;

create table if not exists _migrations_done (
  name text primary key,
  done_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from _migrations_done
    where name = 'bookings_created_at_minus_7h'
  ) then
    update bookings
    set created_at = created_at - interval '7 hours';

    insert into _migrations_done(name) values ('bookings_created_at_minus_7h');

    raise notice 'DA SUA: lui created_at cua toan bo bookings lai 7 gio.';
  else
    raise notice 'BO QUA: migration nay da chay truoc do roi.';
  end if;
end $$;

-- Kiem tra lai SAU khi sua (tuy chon):
-- select id, koc_id, created_at,
--        (created_at at time zone 'Asia/Ho_Chi_Minh')::date as ngay_hien_thi_sau_sua
-- from bookings
-- order by created_at desc
-- limit 20;
