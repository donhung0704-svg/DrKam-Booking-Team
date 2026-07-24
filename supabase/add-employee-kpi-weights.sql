-- ============================================================
-- THEM COT TRONG SO TIEU CHUAN (thang) cho bang employees
-- ============================================================
-- Bao cao thang co them nhom "Trong so":
--   - Trong so tieu chuan (nhap tay) -> luu vao cac cot ts_thang_*
--   - Trong so thuc te = (thuc dat/KPI) x trong so tieu chuan; = 0 neu dat < 70%
--   - Tong trong so = tong trong so thuc te (tinh o app, khong luu)
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS ts_thang_lien_he       numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_phan_hoi      numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_booking_moi   numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_gmv           numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_koc_moi       numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_video_moi     numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_chi_phi       numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_video_tru_pov numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_video_co_dt   numeric;

-- Kiem tra: phai tra ve 9 dong
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'employees'
  AND column_name LIKE 'ts_thang_%';

-- ------------------------------------------------------------
-- GO BO (neu can quay lai)
-- ------------------------------------------------------------
-- ALTER TABLE employees
--   DROP COLUMN IF EXISTS ts_thang_lien_he,
--   DROP COLUMN IF EXISTS ts_thang_phan_hoi,
--   DROP COLUMN IF EXISTS ts_thang_booking_moi,
--   DROP COLUMN IF EXISTS ts_thang_gmv,
--   DROP COLUMN IF EXISTS ts_thang_koc_moi,
--   DROP COLUMN IF EXISTS ts_thang_video_moi,
--   DROP COLUMN IF EXISTS ts_thang_chi_phi,
--   DROP COLUMN IF EXISTS ts_thang_video_tru_pov,
--   DROP COLUMN IF EXISTS ts_thang_video_co_dt;
