-- ============================================================
-- SUA GIA TRI MAC DINH CUA bookings.status_booking
-- ============================================================
-- BOI CANH: truoc day DB co DEFAULT la 'Cho nhan sp' (chu 's' thuong).
-- Vi vay danh sach Booking hien ra HAI muc "Cho nhan sp" va "Cho nhan SP"
-- trong o chon trang thai, du ve nghiep vu chi la MOT.
--
-- Du lieu cu da duoc chuan hoa het. Nhung neu DEFAULT chua sua thi bat ky
-- ban ghi nao tao ma KHONG truyen status_booking se lai sinh ra chu thuong.
-- Hien tai app luon truyen tay 'Cho nhan SP' nen loi bi che khuat - khong
-- the nhin du lieu ma biet DEFAULT da dung hay chua.
-- ============================================================


-- ------------------------------------------------------------
-- BUOC 1: KIEM TRA (chi doc, khong ghi gi)
-- Xem DEFAULT hien tai that su la gi.
-- ------------------------------------------------------------
SELECT
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'bookings'
  AND column_name  = 'status_booking';

-- Doc ket qua cot column_default:
--   'Chờ nhận SP'::text  -> DA DUNG, khong can lam gi them
--   'Chờ nhận sp'::text  -> CON SAI, chay Buoc 2
--   NULL                 -> khong co mac dinh, chay Buoc 2 cho chac


-- ------------------------------------------------------------
-- BUOC 2: SUA DEFAULT (chi chay neu Buoc 1 cho thay con sai)
-- ------------------------------------------------------------
ALTER TABLE bookings
  ALTER COLUMN status_booking SET DEFAULT 'Chờ nhận SP';


-- ------------------------------------------------------------
-- BUOC 3: KIEM TRA LAI - phai ra 'Chờ nhận SP'::text
-- ------------------------------------------------------------
SELECT column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'bookings'
  AND column_name  = 'status_booking';


-- ------------------------------------------------------------
-- BUOC 4 (tuy chon): quet lai du lieu cu con sai chinh ta
-- Tinh den lan kiem tra gan nhat: 0 dong sai, nen se khong doi gi.
-- ------------------------------------------------------------
SELECT status_booking, count(*)
FROM bookings
GROUP BY 1
ORDER BY 2 DESC;

-- Neu con dong chu thuong thi chuan hoa:
-- UPDATE bookings SET status_booking = 'Chờ nhận SP'
-- WHERE btrim(lower(status_booking)) = 'chờ nhận sp'
--   AND status_booking <> 'Chờ nhận SP';
