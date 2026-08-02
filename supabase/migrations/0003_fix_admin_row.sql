-- Fix the seeded admin row created by 0002_seed_admin.sql.
-- GoTrue scans the token columns of auth.users as non-nullable strings,
-- so rows inserted directly into auth.users must not leave them NULL
-- (normal signups always write '' here). This update is idempotent.
--
-- SECURITY: the seeded password ('password') is weak; change it after the
-- first login via Dashboard → Authentication → Users → reset password.

update auth.users
set confirmation_token        = coalesce(confirmation_token, ''),
    recovery_token            = coalesce(recovery_token, ''),
    email_change_token_new    = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change_token        = coalesce(phone_change_token, ''),
    reauthentication_token    = coalesce(reauthentication_token, '')
where email = 'ridhoauliama97@gmail.com';
