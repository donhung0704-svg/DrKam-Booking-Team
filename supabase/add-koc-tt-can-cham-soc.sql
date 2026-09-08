-- ============================================================
-- THEM CROT "TT can cham soc" cho bang koc
-- ============================================================
-- Cot moi tren Danh sach KOC: dropdown chon 1 trong 3 gia tri:
--   Pust them vid / Pust them vid + kich ban / Pust kich ban
-- Chay 1 lan tren Supabase SQL Editor cua PROJECT MOI (BookingV2).
-- ============================================================

ALTER TABLE koc ADD COLUMN IF NOT EXISTS tt_can_cham_soc text;

-- Kiem tra
SELECT column_name FROM information_schema.columns
WHERE table_name = 'koc' AND column_name = 'tt_can_cham_soc';
