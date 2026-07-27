-- ============================================================
-- CAP NHAT CHECK CONSTRAINT cho koc.tier va koc.status
-- ============================================================
-- Loi: 'new row for relation "koc" violates check constraint "koc_tier_check"'
-- Nguyen nhan: DB gioi han gia tri tier/status bang CHECK, chua co gia tri moi
-- ("Hoan cao" cho Tier, "Dung CS" cho Status).
--
-- Dung NOT VALID: chi ap dung cho ban ghi MOI/SUA tu gio, KHONG kiem tra lai
-- du lieu cu (tranh loi neu co gia tri le trong du lieu cu).
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================

-- ---- TIER ----
ALTER TABLE koc DROP CONSTRAINT IF EXISTS koc_tier_check;
ALTER TABLE koc ADD CONSTRAINT koc_tier_check CHECK (
  tier IS NULL OR tier IN (
    'VIP',
    'Tiềm năng',
    'Chăm chỉ',
    'Hoạt động lâu',
    'Mới hoạt động',
    'Ngủ đông',
    'Mất cast',
    'Hoàn cao',
    'Dừng CS'
  )
) NOT VALID;

-- ---- STATUS ----
ALTER TABLE koc DROP CONSTRAINT IF EXISTS koc_status_check;
ALTER TABLE koc ADD CONSTRAINT koc_status_check CHECK (
  status IS NULL OR status IN (
    'Chờ phản hồi',
    'Đã phản hồi',
    'Cân nhắc',
    'Đã chốt',
    'Từ chối',
    'Trùng KOC',
    'Dừng CS'
  )
) NOT VALID;

-- Kiem tra: liet ke 2 constraint vua tao
SELECT conname
FROM pg_constraint
WHERE conrelid = 'koc'::regclass
  AND conname IN ('koc_tier_check', 'koc_status_check');
