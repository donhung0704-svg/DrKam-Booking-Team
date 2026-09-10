-- ============================================================
-- DOI THOI GIAN GIU "LICH SU CHINH SUA" XUONG 3 NGAY
-- ============================================================
-- Bang lich su (koc_history / bookings_history) da co san va dang chay.
-- File nay chi doi lich pg_cron tu 7 ngay -> 3 ngay va xoa ngay log cu.
-- Chay 1 lan tren Supabase SQL Editor cua PROJECT MOI (BookingV2).
-- ============================================================

-- 1) Cap nhat 2 job cron (cung ten -> ghi de job cu): moi gio xoa log > 3 ngay
select cron.schedule('purge_koc_history', '0 * * * *',
  $$delete from public.koc_history where changed_at < now() - interval '3 days'$$);
select cron.schedule('purge_bookings_history', '0 * * * *',
  $$delete from public.bookings_history where changed_at < now() - interval '3 days'$$);

-- 2) Xoa NGAY cac log da cu hon 3 ngay (khong cho toi luot cron)
delete from public.koc_history      where changed_at < now() - interval '3 days';
delete from public.bookings_history where changed_at < now() - interval '3 days';

-- 3) Kiem tra: 2 job phai active, schedule '0 * * * *'
select jobname, schedule, active from cron.job where jobname like 'purge_%';
