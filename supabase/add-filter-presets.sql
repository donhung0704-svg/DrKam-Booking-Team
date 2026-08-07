-- ============================================================
-- BANG BO LOC DA LUU DUNG CHUNG (moi nguoi cung xem)
-- ============================================================
-- Truoc day bo loc da luu nam trong localStorage (rieng tung may/nguoi).
-- Chuyen sang bang nay de dung chung toan team.
-- scope: 'koc' hoac 'booking'. filters/sort luu jsonb.
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS filter_presets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope      text NOT NULL,              -- 'koc' | 'booking'
  name       text NOT NULL,
  filters    jsonb NOT NULL DEFAULT '[]',
  sort       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS filter_presets_scope_idx ON filter_presets (scope, created_at);

-- Ai cung doc/them/xoa duoc (bo loc dung chung)
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS filter_presets_all ON filter_presets;
CREATE POLICY filter_presets_all ON filter_presets
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON filter_presets TO anon, authenticated;

-- Kiem tra
SELECT count(*) FROM filter_presets;
