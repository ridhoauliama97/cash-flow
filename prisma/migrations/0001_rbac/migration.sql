-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "accounting";

-- CreateTable
CREATE TABLE "accounting"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "division_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."divisions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "division_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."permissions" (
    "id" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "accounting"."user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "accounting"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_name_key" ON "accounting"."divisions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "accounting"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_module_action_key" ON "accounting"."permissions"("module", "action");

-- AddForeignKey
ALTER TABLE "accounting"."users" ADD CONSTRAINT "users_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "accounting"."divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."roles" ADD CONSTRAINT "roles_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "accounting"."divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "accounting"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "accounting"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "accounting"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "accounting"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- RLS + integrasi auth (schema accounting, terpisah dari public milik app lama)
-- ============================================================================

create or replace function accounting.is_admin() returns boolean
language sql stable security definer set search_path = accounting as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.level in ('admin', 'superadmin')
  );
$$;

alter table accounting.users enable row level security;
alter table accounting.divisions enable row level security;
alter table accounting.roles enable row level security;
alter table accounting.permissions enable row level security;
alter table accounting.role_permissions enable row level security;
alter table accounting.user_roles enable row level security;

create policy "users: select own or admin" on accounting.users
  for select using (auth.uid() = id or accounting.is_admin());
create policy "users: update own" on accounting.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "divisions: select authenticated" on accounting.divisions
  for select to authenticated using (true);
create policy "divisions: admin write" on accounting.divisions
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "roles: select authenticated" on accounting.roles
  for select to authenticated using (true);
create policy "roles: admin write" on accounting.roles
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "permissions: select authenticated" on accounting.permissions
  for select to authenticated using (true);
create policy "permissions: admin write" on accounting.permissions
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "role_permissions: select authenticated" on accounting.role_permissions
  for select to authenticated using (true);
create policy "role_permissions: admin write" on accounting.role_permissions
  for all using (accounting.is_admin()) with check (accounting.is_admin());

create policy "user_roles: select authenticated" on accounting.user_roles
  for select to authenticated using (true);
create policy "user_roles: admin write" on accounting.user_roles
  for all using (accounting.is_admin()) with check (accounting.is_admin());

-- users.id mengikuti auth.users; profil dibuat otomatis saat signup.
alter table accounting.users add constraint users_auth_user_fk
  foreign key (id) references auth.users (id) on delete cascade;

create or replace function accounting.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = accounting
as $$
begin
  insert into users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function accounting.handle_new_user();
