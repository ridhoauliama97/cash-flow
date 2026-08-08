-- ============================================================================
-- 0004: GRANT akses schema accounting ke peran Supabase (anon/authenticated)
--       + pelindung data milik Super Admin (PRD §2.2) di level database.
--
-- Tanpa grant ini, query via supabase-js (anon key) gagal walaupun RLS diizinkan,
-- karena peran `authenticated` tidak punya hak atas tabel di schema non-public.
-- ============================================================================

grant usage on schema accounting to anon, authenticated;

grant select on all tables in schema accounting to anon;
grant select, insert, update, delete on all tables in schema accounting to authenticated;
grant execute on all functions in schema accounting to anon, authenticated;

alter default privileges in schema accounting grant select on tables to anon;
alter default privileges in schema accounting
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema accounting
  grant execute on functions to anon, authenticated;

-- Pengguna yang punya role level 'superadmin' (seeded) — dipakai trigger pelindung.
create or replace function accounting.is_super_admin() returns boolean
language sql stable security definer set search_path = accounting as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.level = 'superadmin'
  );
$$;

-- Pelindung data Super Admin: UPDATE/DELETE pada baris milik Super Admin
-- (transactions.created_by / users.id) hanya boleh oleh Super Admin itu sendiri.
-- Berlaku juga saat RLS di-bypass (mis. service key), karena pengecekan
-- berdasarkan auth.uid() dari JWT request.
create or replace function accounting.protect_super_admin_data()
returns trigger
language plpgsql
security definer set search_path = accounting
as $$
declare
  v_super_admin_id uuid;
  v_owner          uuid;
begin
  select ur.user_id into v_super_admin_id
  from user_roles ur
  join roles r on r.id = ur.role_id
  where r.level = 'superadmin'
  limit 1;

  if v_super_admin_id is null then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'transactions' then
    v_owner := old.created_by;
  elsif tg_table_name = 'users' then
    v_owner := old.id;
  end if;

  if v_owner = v_super_admin_id
     and auth.uid() is distinct from v_super_admin_id
     and not accounting.is_super_admin()
  then
    raise exception 'Data milik Super Admin tidak dapat diubah/dihapus oleh role lain';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists protect_super_admin_transactions on accounting.transactions;
create trigger protect_super_admin_transactions
  before update or delete on accounting.transactions
  for each row execute function accounting.protect_super_admin_data();

drop trigger if exists protect_super_admin_user on accounting.users;
create trigger protect_super_admin_user
  before update or delete on accounting.users
  for each row execute function accounting.protect_super_admin_data();
