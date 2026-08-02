-- Seed the admin user (idempotent).
-- The `handle_new_user` trigger auto-creates the profile row with the
-- full name from raw_user_meta_data.
-- SECURITY: change this password after first login (Dashboard →
-- Authentication → Users → reset, or supabase reset-password).

create extension if not exists pgcrypto with schema extensions;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  phone_change_token,
  reauthentication_token,
  email_change,
  phone,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  is_super_admin,
  is_anonymous,
  email_change_confirm_status,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'ridhoauliama97@gmail.com',
  extensions.crypt('password', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Ridho Aulia Mahqoma Angkat"}',
  false,
  false,
  false,
  0,
  now(),
  now()
)
on conflict do nothing;
