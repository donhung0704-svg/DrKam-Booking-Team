-- ============================================================
-- BAT LAI "LICH SU CHINH SUA" — an toan, khong lam phinh DB
-- ============================================================
-- Chay 1 lan trong SQL Editor cua PROJECT MOI (aapzzpgkrfuenfjpqade).
--
-- 2 lop bao ve chong phinh (nguyen nhan tung khoa DB):
--   1) Trigger BO QUA thao tac hang loat (>50 dong/lan) -> IMPORT khong sinh log.
--      (Import ghi theo lo 500 dong -> tu dong bi bo qua. Sua tay 1 dong -> van ghi.)
--   2) pg_cron TU DONG XOA log cu hon 1 GIO, chay moi 15 phut.
-- => Chi giu log cua cac lan SUA TAY gan day; import khong bao gio dong lai.
-- ============================================================


-- ---------------- 1) Bang lich su ----------------
create table if not exists koc_history (
  id bigserial primary key,
  koc_id uuid,
  action text not null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);
create table if not exists bookings_history (
  id bigserial primary key,
  booking_id uuid,
  action text not null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);
create index if not exists koc_history_changed_at_idx      on koc_history (changed_at desc);
create index if not exists bookings_history_changed_at_idx on bookings_history (changed_at desc);


-- ---------------- 2) Trigger ghi log (STATEMENT-level, bo qua >50 dong) ----------------
create or replace function public.log_koc_change_stmt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE') then
    if (select count(*) from newtab) > 50 then return null; end if;  -- import hang loat -> bo qua
    insert into koc_history(koc_id, action, old_data, new_data)
    select n.id, 'UPDATE', to_jsonb(o), to_jsonb(n)
    from newtab n join oldtab o on o.id = n.id
    where to_jsonb(o) is distinct from to_jsonb(n);
  elsif (tg_op = 'DELETE') then
    if (select count(*) from oldtab) > 50 then return null; end if;
    insert into koc_history(koc_id, action, old_data, new_data)
    select o.id, 'DELETE', to_jsonb(o), null from oldtab o;
  end if;
  return null;
end $$;

create or replace function public.log_bookings_change_stmt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE') then
    if (select count(*) from newtab) > 50 then return null; end if;
    insert into bookings_history(booking_id, action, old_data, new_data)
    select n.id, 'UPDATE', to_jsonb(o), to_jsonb(n)
    from newtab n join oldtab o on o.id = n.id
    where to_jsonb(o) is distinct from to_jsonb(n);
  elsif (tg_op = 'DELETE') then
    if (select count(*) from oldtab) > 50 then return null; end if;
    insert into bookings_history(booking_id, action, old_data, new_data)
    select o.id, 'DELETE', to_jsonb(o), null from oldtab o;
  end if;
  return null;
end $$;

drop trigger if exists trg_koc_history_upd on koc;
create trigger trg_koc_history_upd after update on koc
  referencing old table as oldtab new table as newtab
  for each statement execute function public.log_koc_change_stmt();
drop trigger if exists trg_koc_history_del on koc;
create trigger trg_koc_history_del after delete on koc
  referencing old table as oldtab
  for each statement execute function public.log_koc_change_stmt();

drop trigger if exists trg_bookings_history_upd on bookings;
create trigger trg_bookings_history_upd after update on bookings
  referencing old table as oldtab new table as newtab
  for each statement execute function public.log_bookings_change_stmt();
drop trigger if exists trg_bookings_history_del on bookings;
create trigger trg_bookings_history_del after delete on bookings
  referencing old table as oldtab
  for each statement execute function public.log_bookings_change_stmt();


-- ---------------- 3) Cho app DOC lich su (RLS chi-doc) ----------------
alter table koc_history      enable row level security;
alter table bookings_history enable row level security;
drop policy if exists koc_history_read on koc_history;
create policy koc_history_read on koc_history for select to authenticated using (true);
drop policy if exists bookings_history_read on bookings_history;
create policy bookings_history_read on bookings_history for select to authenticated using (true);
grant select on koc_history      to anon, authenticated;
grant select on bookings_history to anon, authenticated;


-- ---------------- 4) pg_cron: TU DONG XOA log cu hon 1 GIO ----------------
create extension if not exists pg_cron;

-- Moi 15 phut, xoa log cu hon 1 gio. (Chay lai file se tu ghi de job cung ten.)
-- Muon giu lau hon (vd 7 ngay) thi doi '1 hour' -> '7 days' (van an toan vi import khong ghi log).
select cron.schedule('purge_koc_history', '*/15 * * * *',
  $$delete from public.koc_history where changed_at < now() - interval '1 hour'$$);
select cron.schedule('purge_bookings_history', '*/15 * * * *',
  $$delete from public.bookings_history where changed_at < now() - interval '1 hour'$$);


-- ---------------- 5) Kiem tra ----------------
select jobname, schedule, active from cron.job;
-- Sua tay 1 KOC bat ky roi chay:
--   select changed_at, action, koc_id from koc_history order by changed_at desc limit 5;
