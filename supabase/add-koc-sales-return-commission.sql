-- ============================================================
-- THEM 3 COT cho bang koc: Mon ban ra / Mon hoan / Hoa hong
-- ============================================================
-- - items_sold      (Mon ban ra)  - so dem
-- - items_returned  (Mon hoan)    - so dem
-- - commission_type (Hoa hong)    - chon tu list: Mo | 15% tn 3% ads |
--                                   16% tn 8% ads | 1% tn 1% ads
-- "Ty le hoan" = Mon hoan / Mon ban ra duoc TINH SAN o app, khong luu cot.
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================

ALTER TABLE koc
  ADD COLUMN IF NOT EXISTS items_sold      integer,
  ADD COLUMN IF NOT EXISTS items_returned  integer,
  ADD COLUMN IF NOT EXISTS commission_type text;

-- Kiem tra: phai tra ve 3 dong
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'koc'
  AND column_name IN ('items_sold', 'items_returned', 'commission_type');

-- ------------------------------------------------------------
-- GO BO (neu can quay lai)
-- ------------------------------------------------------------
-- ALTER TABLE koc
--   DROP COLUMN IF EXISTS items_sold,
--   DROP COLUMN IF EXISTS items_returned,
--   DROP COLUMN IF EXISTS commission_type;
