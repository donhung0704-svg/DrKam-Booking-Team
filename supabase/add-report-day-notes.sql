-- ============================================================
-- BANG GHI CHU CONG VIEC THEO NGAY (Bao cao ngay)
-- ============================================================
-- Luu ghi chu CV cho tung PIC theo tung ngay bao cao.
-- Doi ngay -> hien ghi chu cua dung ngay do.
-- Chay 1 lan tren Supabase SQL Editor cua PROJECT MOI.
-- ============================================================

CREATE TABLE IF NOT EXISTS report_day_notes (
  employee_id uuid NOT NULL,             -- PIC
  report_date date NOT NULL,             -- ngay bao cao
  note        text,                      -- ghi chu cong viec
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, report_date)
);

-- Ai cung doc/ghi duoc (dung chung ca team)
ALTER TABLE report_day_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_day_notes_all ON report_day_notes;
CREATE POLICY report_day_notes_all ON report_day_notes
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON report_day_notes TO anon, authenticated;

-- Kiem tra
SELECT * FROM report_day_notes;
