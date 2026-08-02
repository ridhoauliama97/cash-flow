-- Safety-net fix for the seeded admin row (0002_seed_admin.sql).
-- GoTrue scans several columns of auth.users as non-nullable Go types:
--   text columns  -> string   (NULL breaks scanning)
--   bool columns  -> bool
--   smallint col  -> int
-- Normal signups never leave these NULL (GoTrue writes '' / defaults).
-- This update is idempotent; run after 0003 to cover the rest of the row.

update auth.users
set confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone                      = coalesce(phone, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, ''),
    is_super_admin             = coalesce(is_super_admin, false),
    email_change_confirm_status = coalesce(email_change_confirm_status, 0)
where email = 'ridhoauliama97@gmail.com';
