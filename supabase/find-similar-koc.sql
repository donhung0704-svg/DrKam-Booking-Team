-- ============================================================
-- TIM CAC KOC GAN GIONG NHAU (near-duplicate) DE RA SOAT TAY
-- ============================================================
-- Dung khi KOC "trung" chi la GO SAI gan giong (vd "nhungggg" vs "nhunggg"),
-- KHONG phai trung y het. Khong the gop tu dong an toan -> liet ke cap giong
-- nhau de NGUOI kiem tra roi xoa tay cap nao that su la 1 nguoi.
-- Can pg_trgm (da bat trong add-koc-search-indexes.sql).
-- Chay tren Supabase SQL Editor (BookingV2).
-- ============================================================

-- Nguong giong nhau: 0.8 = rat giong. Ha xuong 0.7 de tim rong hon (nhieu cap hon,
-- nhung co the co cap khong lien quan). Nang len 0.9 de chi lay cap cuc giong.
SET pg_trgm.similarity_threshold = 0.8;

SELECT
  round(similarity(a."Id_tiktok_Ten_fb", b."Id_tiktok_Ten_fb")::numeric, 2) AS do_giong,
  a."Id_tiktok_Ten_fb" AS koc_a,
  b."Id_tiktok_Ten_fb" AS koc_b,
  a.id AS id_a,
  b.id AS id_b
FROM koc a
JOIN koc b
  ON a.id < b.id
 AND a."Id_tiktok_Ten_fb" % b."Id_tiktok_Ten_fb"   -- dung index trigram
WHERE lower(btrim(a."Id_tiktok_Ten_fb")) <> lower(btrim(b."Id_tiktok_Ten_fb"))
ORDER BY do_giong DESC
LIMIT 300;

-- ------------------------------------------------------------
-- Sau khi ra soat: XOA 1 KOC cu the theo id (thay <ID> bang id_a/id_b o tren)
-- LUU Y: chuyen Booking sang KOC giu truoc khi xoa neu KOC do co booking.
-- ------------------------------------------------------------
-- UPDATE bookings SET koc_id = '<ID_GIU>' WHERE koc_id = '<ID_XOA>';
-- DELETE FROM koc WHERE id = '<ID_XOA>';
