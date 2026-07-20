-- ============================================================
-- DON KOC BI TRUNG ID TikTok/Ten FB
-- ============================================================
-- BOI CANH: cot "Id_tiktok_Ten_fb" la khoa so khop khi import KOC.
-- Import so khop bang String(value).trim() -> PHAN BIET HOA/THUONG.
-- Vi vay "Kawachan81" va "kawachan81" bi coi la 2 KOC khac nhau,
-- moi lan import lai sinh them 1 ban ghi trung.
--
-- CHAY THEO THU TU: Buoc 0 -> 1 -> 2 -> (3) -> 4 -> 5
-- QUAN TRONG: chi chay khi man hinh Import KOC da chay XONG,
-- neu khong so lieu se con thay doi trong luc dang don.
-- ============================================================


-- ------------------------------------------------------------
-- BUOC 0: Tong quan - co bao nhieu nhom trung?
-- ------------------------------------------------------------
SELECT
  count(*)                        AS so_nhom_trung,
  sum(so_dong)                    AS tong_dong_lien_quan,
  sum(so_dong) - count(*)         AS so_dong_thua_can_xoa
FROM (
  SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan, count(*) AS so_dong
  FROM koc
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
  GROUP BY 1
  HAVING count(*) > 1
) t;


-- ------------------------------------------------------------
-- BUOC 1: Liet ke cac ID bi trung (khong phan biet hoa/thuong)
-- ------------------------------------------------------------
SELECT
  lower(btrim("Id_tiktok_Ten_fb"))                    AS id_chuan,
  count(*)                                            AS so_dong,
  string_agg(DISTINCT btrim("Id_tiktok_Ten_fb"), ' | ') AS cac_kieu_viet
FROM koc
WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
GROUP BY 1
HAVING count(*) > 1
ORDER BY so_dong DESC, id_chuan;


-- ------------------------------------------------------------
-- BUOC 2: Chi tiet tung dong de QUYET DINH giu dong nao
-- Cot "de_xuat" = GIU cho dong nhieu du lieu nhat trong moi nhom.
-- ------------------------------------------------------------
WITH trung AS (
  SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan
  FROM koc
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
  GROUP BY 1
  HAVING count(*) > 1
),
xep_hang AS (
  SELECT
    k.id,
    lower(btrim(k."Id_tiktok_Ten_fb")) AS id_chuan,
    k."Id_tiktok_Ten_fb",
    k.name,
    e.full_name AS pic,
    k.status,
    k.tier,
    k.gmv,
    k.gmv_thang,
    k.monthly_videos,
    k.booking_date,
    k.created_at,
    -- Diem uu tien: cang nhieu du lieu thuc cang cao
    ( (k.gmv            IS NOT NULL AND k.gmv::text            <> '' AND k.gmv::text            <> '0')::int
    + (k.gmv_thang      IS NOT NULL AND k.gmv_thang::text      <> '' AND k.gmv_thang::text      <> '0')::int
    + (k.monthly_videos IS NOT NULL AND k.monthly_videos::text <> '' AND k.monthly_videos::text <> '0')::int
    + (k.employee_id    IS NOT NULL)::int
    + (k.booking_date   IS NOT NULL)::int
    + (btrim(coalesce(k.name,  '')) <> '')::int
    + (btrim(coalesce(k.phone, '')) <> '')::int
    ) AS diem,
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
  LEFT JOIN employees e ON e.id = k.employee_id
  JOIN trung t ON t.id_chuan = lower(btrim(k."Id_tiktok_Ten_fb"))
)
SELECT
  CASE WHEN thu_tu = 1 THEN '>> GIU' ELSE '   xoa' END AS de_xuat,
  id_chuan, "Id_tiktok_Ten_fb", name, pic, status, tier,
  gmv, gmv_thang, monthly_videos, booking_date, created_at, diem, id
FROM xep_hang
ORDER BY id_chuan, thu_tu;


-- ------------------------------------------------------------
-- BUOC 3 (TUY CHON - chay TRUOC khi xoa):
-- Chuyen Booking cua cac dong sap xoa sang dong duoc giu,
-- de khong mat lich su Booking.
-- ------------------------------------------------------------
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
        ( (k.gmv IS NOT NULL AND k.gmv::text <> '' AND k.gmv::text <> '0')::int
        + (k.gmv_thang IS NOT NULL AND k.gmv_thang::text <> '' AND k.gmv_thang::text <> '0')::int
        + (k.monthly_videos IS NOT NULL AND k.monthly_videos::text <> '' AND k.monthly_videos::text <> '0')::int
        + (k.employee_id IS NOT NULL)::int + (k.booking_date IS NOT NULL)::int
        + (btrim(coalesce(k.name,'')) <> '')::int + (btrim(coalesce(k.phone,'')) <> '')::int
        ) DESC, k.created_at ASC
    ) AS thu_tu
  FROM koc k JOIN trung t ON t.id_chuan = lower(btrim(k."Id_tiktok_Ten_fb"))
),
giu AS (SELECT id_chuan, id FROM xep_hang WHERE thu_tu = 1),
bo  AS (SELECT id_chuan, id FROM xep_hang WHERE thu_tu > 1)
UPDATE bookings b
SET koc_id = giu.id
FROM bo JOIN giu ON giu.id_chuan = bo.id_chuan
WHERE b.koc_id = bo.id;


-- ------------------------------------------------------------
-- BUOC 4: XOA cac dong thua (giu dong diem cao nhat moi nhom)
-- CHAY BUOC 2 XEM KY TRUOC KHI CHAY BUOC NAY - KHONG HOAN TAC DUOC
-- ------------------------------------------------------------
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
        ( (k.gmv IS NOT NULL AND k.gmv::text <> '' AND k.gmv::text <> '0')::int
        + (k.gmv_thang IS NOT NULL AND k.gmv_thang::text <> '' AND k.gmv_thang::text <> '0')::int
        + (k.monthly_videos IS NOT NULL AND k.monthly_videos::text <> '' AND k.monthly_videos::text <> '0')::int
        + (k.employee_id IS NOT NULL)::int + (k.booking_date IS NOT NULL)::int
        + (btrim(coalesce(k.name,'')) <> '')::int + (btrim(coalesce(k.phone,'')) <> '')::int
        ) DESC, k.created_at ASC
    ) AS thu_tu
  FROM koc k JOIN trung t ON t.id_chuan = lower(btrim(k."Id_tiktok_Ten_fb"))
)
DELETE FROM koc
WHERE id IN (SELECT id FROM xep_hang WHERE thu_tu > 1);


-- ------------------------------------------------------------
-- BUOC 5: Chan trung TAI PHAT bang unique index
-- Dung lower(btrim(...)) -> "Kawachan81" va "kawachan81"
-- se bi coi la MOT, dung y nghia nghiep vu.
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS koc_id_tiktok_ten_fb_unique
  ON koc (lower(btrim("Id_tiktok_Ten_fb")))
  WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> '';

-- Kiem tra lai: phai tra ve 0 dong
SELECT lower(btrim("Id_tiktok_Ten_fb")) AS id_chuan, count(*)
FROM koc
WHERE btrim(coalesce("Id_tiktok_Ten_fb", '')) <> ''
GROUP BY 1 HAVING count(*) > 1;


-- ------------------------------------------------------------
-- GO BO (neu can quay lai)
-- ------------------------------------------------------------
-- DROP INDEX IF EXISTS koc_id_tiktok_ten_fb_unique;
