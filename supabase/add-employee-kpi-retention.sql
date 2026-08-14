-- ============================================================
-- THEM COT KPI + TRONG SO cho "Ty le retention KOC" (bao cao thang)
-- ============================================================
-- Ty le retention KOC = KOC co Booking thang truoc & van co Booking thang nay
--                       / KOC co Booking thang truoc.
-- KPI muc tieu (%) + trong so tieu chuan nhap tay theo tung PIC.
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS kpi_thang_retention numeric,
  ADD COLUMN IF NOT EXISTS ts_thang_retention  numeric;

-- Kiem tra: phai tra ve 2 dong
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'employees'
  AND column_name IN ('kpi_thang_retention', 'ts_thang_retention');
