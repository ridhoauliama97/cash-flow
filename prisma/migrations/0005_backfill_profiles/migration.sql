-- ============================================================================
-- 0005: Backfill profil accounting.users untuk user auth yang SUDAH ada
--       (trigger handle_new_user hanya melayani signup baru).
--       Mencerminkan logika handle_new_user: id = auth.users.id,
--       name = raw_user_meta_data.full_name, fallback ke email.
-- ============================================================================

insert into accounting.users (id, email, name)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.email)
from auth.users au
on conflict (id) do nothing;

-- Bootstrap Super Admin: assign role 'Super Admin' ke email admin default.
-- (Ubah email di sini bila perlu; atau lewati dan pakai SEED_ADMIN_EMAIL.)
insert into accounting.user_roles (user_id, role_id)
select u.id, r.id
from accounting.users u
join accounting.roles r on r.name = 'Super Admin'
where u.email = 'ridhoauliama97@gmail.com'
on conflict (user_id, role_id) do nothing;
