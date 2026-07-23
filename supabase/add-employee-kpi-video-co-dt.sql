-- ============================================================
-- THEM COT KPI "% Video co DT" VAO BANG employees
-- ============================================================
-- Bao cao thang co them chi so "% Video co DT" cho ca Hunter va Famer.
-- KPI muc tieu (nhap tay theo tung PIC) luu vao cot nay.
-- Gia tri la % muc tieu (vd 80 nghia la 80%).
-- Chay 1 lan tren Supabase SQL Editor.
--
-- LUU Y: chi so nay dung cot koc.videos_with_revenue -> phai chay TRUOC
-- file supabase/add-koc-videos-with-revenue.sql neu chua chay.
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS kpi_thang_video_co_dt numeric;

-- Kiem tra
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'employees'
  AND column_name  = 'kpi_thang_video_co_dt';

-- ------------------------------------------------------------
-- GO BO (neu can quay lai)
-- ------------------------------------------------------------
-- ALTER TABLE employees DROP COLUMN IF EXISTS kpi_thang_video_co_dt;
