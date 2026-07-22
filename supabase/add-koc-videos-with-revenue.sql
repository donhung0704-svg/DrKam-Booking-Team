-- ============================================================
-- THEM COT "Video co DT" (so video co doanh thu) VAO BANG koc
-- ============================================================
-- Cot dem so nguyen, mac dinh NULL (chua nhap). Danh sach KOC va import
-- Excel deu doc/ghi qua cot nay (field: videos_with_revenue).
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================

ALTER TABLE koc
  ADD COLUMN IF NOT EXISTS videos_with_revenue integer;

-- Kiem tra: phai thay cot vua them
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'koc'
  AND column_name  = 'videos_with_revenue';

-- ------------------------------------------------------------
-- GO BO (neu can quay lai)
-- ------------------------------------------------------------
-- ALTER TABLE koc DROP COLUMN IF EXISTS videos_with_revenue;
