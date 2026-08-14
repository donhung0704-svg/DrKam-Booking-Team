-- ============================================================
-- BANG CAI DAT BAO CAO THEO THANG (dung chung ca team)
-- ============================================================
-- Luu cac so nhap tay theo tung thang bao cao, dung chung moi nguoi.
-- Hien tai: koc_vid_prev_month = So KOC co video THANG TRUOC
--           -> la MAU SO cua cot "% Video co DT" (bao cao thang).
-- % Video co DT (Thuc te) = so KOC co video thang nay / koc_vid_prev_month.
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS report_month_settings (
  month              text PRIMARY KEY,   -- 'YYYY-MM' (thang bao cao)
  koc_vid_prev_month numeric,            -- So KOC co video thang truoc (mau so % Video co DT)
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Ai cung doc/ghi duoc (dung chung ca team)
ALTER TABLE report_month_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_month_settings_all ON report_month_settings;
CREATE POLICY report_month_settings_all ON report_month_settings
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON report_month_settings TO anon, authenticated;

-- Kiem tra
SELECT * FROM report_month_settings;
