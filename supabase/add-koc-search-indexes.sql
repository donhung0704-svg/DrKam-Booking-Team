-- ============================================================
-- TANG TOC TIM KIEM / LOC KOC (chong loi statement timeout)
-- ============================================================
-- Loi "canceling statement due to statement timeout" xay ra khi loc
-- "Chua" (ILIKE '%...%') tren cot text KHONG co index -> phai quet
-- toan bo ~54.000 dong + dem chinh xac -> qua lau -> DB tu huy cau lenh.
--
-- Giai phap: dung pg_trgm + index GIN trigram cho cac cot hay tim kiem.
-- Sau khi tao, ILIKE '%...%' dung index -> nhanh (<100ms).
-- Chay 1 lan tren Supabase SQL Editor cua PROJECT MOI.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Cot tim kiem chinh (ID TikTok/Ten FB) - cot gay loi trong anh
CREATE INDEX IF NOT EXISTS koc_id_tiktok_trgm
  ON koc USING gin ("Id_tiktok_Ten_fb" gin_trgm_ops);

-- Cac cot text khac cung hay loc "Chua"
CREATE INDEX IF NOT EXISTS koc_name_trgm  ON koc USING gin (name  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS koc_phone_trgm ON koc USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS koc_note_trgm  ON koc USING gin (note  gin_trgm_ops);

-- Index sap xep mac dinh (new_contact_date, created_at) -> phan trang nhanh hon
CREATE INDEX IF NOT EXISTS koc_sort_idx
  ON koc (new_contact_date, created_at DESC);

-- Cap nhat thong ke cho planner
ANALYZE koc;

-- Kiem tra cac index da tao
SELECT indexname FROM pg_indexes WHERE tablename = 'koc' ORDER BY indexname;
