-- ============================================================
-- DON KOC BI TRUNG (ID TikTok/Ten FB) - BAN GON, AN TOAN
-- ============================================================
-- Chay tren Supabase SQL Editor cua PROJECT MOI (BookingV2).
-- Trung = cung ID TikTok/Ten FB (khong phan biet hoa/thuong + khoang trang dau/cuoi).
-- Nguyen tac: moi nhom trung GIU LAI 1 dong nhieu du lieu nhat,
--            CHUYEN booking cua cac dong thua sang dong giu (khong mat booking),
--            roi XOA cac dong thua. Cuoi cung tao unique index chan trung tai phat.
--
-- CACH CHAY (moi buoc boi den roi bam Run):
--   BUOC 1: xem truoc so luong (PHAN A)
--   BUOC 2: chuyen booking (PHAN B1)
--   BUOC 3: xoa dong thua (PHAN B2)
--   BUOC 4: tao unique index chan trung (PHAN B3)
--   BUOC 5: kiem tra (PHAN C) -> phai tra ve 0 dong
-- Cac cau dung CTE tu chua (khong dung bang tam) nen chay rieng tung cau deu OK.
-- Thu hang GIONG NHAU o B1 va B2 nen giu/xoa nhat quan.
-- ============================================================


-- =================== PHAN A: XEM TRUOC ===================
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


-- =================== PHAN B1: CHUYEN BOOKING sang dong GIU ===================
WITH trung AS (
  SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan
  FROM koc
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
  GROUP BY 1 HAVING count(*) > 1
),
xep_hang AS (
  SELECT k.id, lower(btrim(k."Id_tiktok_Ten_fb")) AS id_chuan,
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
        ) DESC, k.created_at ASC, k.id ASC
    ) AS thu_tu
  FROM koc k JOIN trung t ON t.id_chuan = lower(btrim(k."Id_tiktok_Ten_fb"))
),
giu AS (SELECT id_chuan, id FROM xep_hang WHERE thu_tu = 1),
bo  AS (SELECT id_chuan, id FROM xep_hang WHERE thu_tu > 1)
UPDATE bookings b
SET koc_id = giu.id
FROM bo JOIN giu ON giu.id_chuan = bo.id_chuan
WHERE b.koc_id = bo.id;


-- =================== PHAN B2: XOA cac dong thua ===================
-- (Chay SAU PHAN B1. Khong hoan tac duoc.)
WITH trung AS (
  SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan
  FROM koc
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
  GROUP BY 1 HAVING count(*) > 1
),
xep_hang AS (
  SELECT k.id,
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
        ) DESC, k.created_at ASC, k.id ASC
    ) AS thu_tu
  FROM koc k JOIN trung t ON t.id_chuan = lower(btrim(k."Id_tiktok_Ten_fb"))
)
DELETE FROM koc
WHERE id IN (SELECT id FROM xep_hang WHERE thu_tu > 1);


-- =================== PHAN B3: CHAN TRUNG TAI PHAT ===================
CREATE UNIQUE INDEX IF NOT EXISTS koc_id_tiktok_ten_fb_unique
  ON koc (lower(btrim("Id_tiktok_Ten_fb")))
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> '';


-- =================== PHAN C: KIEM TRA (phai tra ve 0 dong) ===================
SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan, count(*)
FROM koc
WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
GROUP BY 1
HAVING count(*) > 1;
