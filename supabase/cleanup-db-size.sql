-- ============================================================
-- DON DUNG LUONG DB (KHAN CAP) — sua loi khong dang nhap duoc
-- ============================================================
-- Trieu chung: DB Size 1.7/0.5 GB (340%) -> DB gan day -> GHI bi loi
--   -> dang nhap (ghi refresh token) bao "Database error granting user".
-- Thu pham chinh: bang koc_history (~1 trieu dong) do trigger ghi lai
--   TOAN BO dong cu + moi (JSONB) moi lan sua; import ghi de hang loat
--   nen phinh rat nhanh.
-- Chay tren Supabase -> SQL Editor. Chay TUNG BUOC.
-- ============================================================


-- BUOC 1: Xem bang nao chiem dung luong nhat (de xac nhan thu pham)
select relname as bang,
       pg_size_pretty(pg_total_relation_size(relid)) as tong_size,
       n_live_tup as so_dong
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 15;


-- BUOC 2: GIAI PHONG — xoa toan bo lich su (audit log).
-- TRUNCATE nhanh, giai phong dung luong ngay, khong can them dia trong.
-- (Mat lich su chinh sua cu — chap nhan de cuu dang nhap.)
truncate table koc_history;
truncate table bookings_history;

-- --- (TUY CHON) Neu muon GIU lich su 7 ngay gan nhat thay vi xoa het:
--    thay 2 lenh truncate o tren bang 2 lenh delete duoi day:
-- delete from koc_history      where changed_at < now() - interval '7 days';
-- delete from bookings_history where changed_at < now() - interval '7 days';


-- BUOC 3: Thu hoi dung luong dia thuc su (bat buoc sau truncate/delete)
vacuum full koc_history;
vacuum full bookings_history;
-- Neu van con lon, vacuum ca bang chinh:
-- vacuum full koc;
-- vacuum full bookings;


-- BUOC 4: Kiem tra lai
select relname as bang, pg_size_pretty(pg_total_relation_size(relid)) as tong_size
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 10;
-- Sau do thu DANG NHAP lai. (% Database Size tren trang billing co the mat
--  toi 1 gio moi cap nhat, nhung dung luong dia da duoc giai phong ngay.)


-- ============================================================
-- CHONG PHINH LAI (chon 1 trong 3 — ban quyet dinh sau khi login OK)
-- ============================================================
-- (A) TAT hoan toan ghi lich su (don gian nhat, mat tinh nang Lich su):
--   drop trigger if exists trg_koc_history on koc;
--   drop trigger if exists trg_bookings_history on bookings;
--
-- (B) GIU lich su nhung don dinh ky (chay tay moi tuan / dat cron):
--   delete from koc_history      where changed_at < now() - interval '14 days';
--   delete from bookings_history where changed_at < now() - interval '14 days';
--
-- (C) Nang goi Supabase (Pro) de tang quota DB.
-- ============================================================
