-- ============================================================
-- CHAN DOAN loi dang nhap: "Database error granting user" (500)
-- ============================================================
-- Trieu chung: dung email + dung mat khau van khong vao duoc.
--   - Sai mat khau  -> 400 "Invalid login credentials"
--   - Dung mat khau -> 500 "Database error granting user"  <-- loi nay
-- => Supabase Auth xac thuc OK nhung LOI DATABASE khi cap phien (grant token).
-- Nguyen nhan hay gap: 1 TRIGGER tren auth.users (chay khi login cap nhat
-- last_sign_in_at) bi loi, HOAC 1 Custom Access Token Hook bi loi.
-- Chay tren Supabase -> SQL Editor.
-- ============================================================

-- 1) TRIGGER tren auth.users (nghi pham so 1). Ly tuong: khong co dong nao la.
select tgname, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;

-- 2) Thong tin user co van de
select id, email, role, is_sso_user, banned_until, deleted_at,
       email_confirmed_at, raw_app_meta_data
from auth.users
where email = 'hongnhungdrkam@gmail.com';

-- 3) Identities (co the bi trung/thieu gay loi khi grant)
select provider, provider_id, user_id, email, created_at
from auth.identities
where email = 'hongnhungdrkam@gmail.com';

-- ------------------------------------------------------------
-- NEU BUOC 1 co trigger la (vd tro toi 1 function INSERT vao public.*):
--   drop trigger <ten_trigger> on auth.users;   -- go trigger loi
-- NEU dung Custom Access Token Hook: Authentication -> Hooks -> tat hoac
--   sua function + cap quyen: grant execute on function <ten> to supabase_auth_admin;
-- Sau khi sua, dang nhap lai.
-- ------------------------------------------------------------
