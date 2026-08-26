-- ============================================================
-- DON KOC BI TRUNG (ID TikTok/Ten FB) - BAN GON, AN TOAN
-- ============================================================
-- Chay tren Supabase SQL Editor cua PROJECT MOI (BookingV2).
-- Trung = cung ID TikTok/Ten FB (khong phan biet hoa/thuong + khoang trang dau/cuoi).
-- Nguyen tac: moi nhom trung GIU LAI 1 dong nhieu du lieu nhat,
--            CHUYEN booking cua cac dong thua sang dong giu (khong mat booking),
--            roi XOA cac dong thua. Cuoi cung tao unique index chan trung tai phat.
--
-- LAM 2 BUOC:
--   1) Chay PHAN A (xem truoc) de biet co bao nhieu nhom/dong se xoa.
--   2) Chay PHAN B (thuc thi) de don. PHAN B khong hoan tac duoc.
-- (Trong SQL Editor: boi den phan can chay roi bam Run.)
-- ============================================================


-- =================== PHAN A: XEM TRUOC ===================
-- Bao nhieu nhom trung va bao nhieu dong thua se bi xoa?
SELECT
  count(*)                 AS so_nhom_trung,
  sum(so_dong)             AS tong_dong_lien_quan,
  sum(so_dong) - count(*)  AS so_dong_thua_se_xoa
FROM (
  SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan, count(*) AS so_dong
  FROM koc
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
  GROUP BY 1
  HAVING count(*) > 1
) t;


-- =================== PHAN B: THUC THI (don trung) ===================
-- Boi den TU dong "BEGIN;" DEN het roi bam Run.
BEGIN;

-- Xep hang trong moi nhom trung: dong nhieu du lieu nhat -> thu_tu = 1 (GIU)
CREATE TEMP TABLE _dedupe ON COMMIT DROP AS
WITH trung AS (
  SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan
  FROM koc
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
  GROUP BY 1
  HAVING count(*) > 1
)
SELECT
  k.id,
  lower(btrim(k."Id_tiktok_Ten_fb")) AS id_chuan,
  row_number() OVER (
    PARTITION BY lower(btrim(k."Id_tiktok_Ten_fb"))
    ORDER BY
      ( (k.gmv            IS NOT NULL AND k.gmv::text            <> '' AND k.gmv::text            <> '0')::int
      + (k.gmv_thang      IS NOT NULL AND k.gmv_thang::text      <> '' AND k.gmv_thang::text      <> '0')::int
      + (k.monthly_videos IS NOT NULL AND k.monthly_videos::text <> '' AND k.monthly_videos::text <> '0')::int
      + (k.employee_id    IS NOT NULL)::int
      + (k.booking_date   IS NOT NULL)::int
      + (btrim(coalesce(k.name,  '')) <> '')::int
      + (btrim(coalesce(k.phone, '')) <> '')::int
      ) DESC,
      k.created_at ASC
  ) AS thu_tu
FROM koc k
JOIN trung t ON t.id_chuan = lower(btrim(k."Id_tiktok_Ten_fb"));

-- Chuyen Booking cua cac dong SE XOA sang dong duoc GIU
UPDATE bookings b
SET koc_id = g.id
FROM _dedupe d
JOIN _dedupe g ON g.id_chuan = d.id_chuan AND g.thu_tu = 1
WHERE d.thu_tu > 1 AND b.koc_id = d.id;

-- Xoa cac dong thua
DELETE FROM koc WHERE id IN (SELECT id FROM _dedupe WHERE thu_tu > 1);

-- Chan trung TAI PHAT: cung ID (khong phan biet hoa/thuong + trim) chi 1 dong
CREATE UNIQUE INDEX IF NOT EXISTS koc_id_tiktok_ten_fb_unique
  ON koc (lower(btrim("Id_tiktok_Ten_fb")))
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> '';

COMMIT;


-- =================== KIEM TRA (phai tra ve 0 dong) ===================
SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan, count(*)
FROM koc
WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
GROUP BY 1
HAVING count(*) > 1;
