-- ============================================================
-- LICH SU CHINH SUA cho KOC va BOOKINGS
-- ============================================================
-- Ghi lai MOI lan UPDATE / DELETE tren bang koc va bookings:
--   - old_data: toan bo dong TRUOC khi sua (de xem gia tri cu, nhap lai)
--   - new_data: toan bo dong SAU khi sua (null neu la DELETE)
--   - changed_at: thoi diem sua
-- App se so old_data vs new_data de hien "truong nao doi, cu -> moi".
--
-- LUU Y: chi ghi tu luc chay SQL nay tro di. KHONG dung lai duoc cac
-- sua doi da mat truoc do.
-- Chay 1 lan tren Supabase SQL Editor.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Bang lich su
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS koc_history (
  id         bigserial PRIMARY KEY,
  koc_id     uuid,
  action     text        NOT NULL,          -- 'UPDATE' | 'DELETE'
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_data   jsonb,
  new_data   jsonb
);

CREATE TABLE IF NOT EXISTS bookings_history (
  id         bigserial PRIMARY KEY,
  booking_id uuid,
  action     text        NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_data   jsonb,
  new_data   jsonb
);

CREATE INDEX IF NOT EXISTS koc_history_changed_at_idx      ON koc_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS bookings_history_changed_at_idx ON bookings_history (changed_at DESC);


-- ------------------------------------------------------------
-- 2) Ham trigger (SECURITY DEFINER de ghi duoc du RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_koc_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO koc_history(koc_id, action, old_data, new_data)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Chi ghi khi thuc su co thay doi
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO koc_history(koc_id, action, old_data, new_data)
      VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION log_bookings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO bookings_history(booking_id, action, old_data, new_data)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO bookings_history(booking_id, action, old_data, new_data)
      VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


-- ------------------------------------------------------------
-- 3) Gan trigger
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_koc_history ON koc;
CREATE TRIGGER trg_koc_history
  AFTER UPDATE OR DELETE ON koc
  FOR EACH ROW EXECUTE FUNCTION log_koc_change();

DROP TRIGGER IF EXISTS trg_bookings_history ON bookings;
CREATE TRIGGER trg_bookings_history
  AFTER UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_bookings_change();


-- ------------------------------------------------------------
-- 4) Cho app (anon key) DOC duoc lich su
--    RLS bat + policy chi-doc; ghi chi qua trigger (SECURITY DEFINER).
-- ------------------------------------------------------------
ALTER TABLE koc_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS koc_history_read ON koc_history;
CREATE POLICY koc_history_read ON koc_history FOR SELECT USING (true);

DROP POLICY IF EXISTS bookings_history_read ON bookings_history;
CREATE POLICY bookings_history_read ON bookings_history FOR SELECT USING (true);

GRANT SELECT ON koc_history      TO anon, authenticated;
GRANT SELECT ON bookings_history TO anon, authenticated;


-- ------------------------------------------------------------
-- 5) Kiem tra nhanh (co the bo qua)
-- ------------------------------------------------------------
-- Sua thu 1 KOC bat ky roi chay:
--   SELECT changed_at, action, koc_id FROM koc_history ORDER BY changed_at DESC LIMIT 5;


-- ------------------------------------------------------------
-- GO BO (neu can quay lai)
-- ------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_koc_history ON koc;
-- DROP TRIGGER IF EXISTS trg_bookings_history ON bookings;
-- DROP FUNCTION IF EXISTS log_koc_change();
-- DROP FUNCTION IF EXISTS log_bookings_change();
-- DROP TABLE IF EXISTS koc_history;
-- DROP TABLE IF EXISTS bookings_history;
