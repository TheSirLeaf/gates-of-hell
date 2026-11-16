-- =====================================================================
-- Gates of Hell — papel de Admin (com modo suporte auditado) + Forja
-- Rode depois de 001 e 002. Idempotente.
-- =====================================================================

-- ---------- Papel 'admin' --------------------------------------------
alter table public.profiles add column if not exists admin_mode boolean not null default false;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('player', 'master', 'admin'));

-- is_master() passa a significar "tem acesso de mestre":
--   * o mestre de verdade, ou
--   * o admin com o MODO SUPORTE ligado.
-- Todas as políticas (RLS) já usam essa função, então nada mais precisa mudar.
create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (role = 'master' or (role = 'admin' and admin_mode))
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.is_real_master()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'master');
$$;

-- ---------- Registro de atividade do admin ---------------------------
create table if not exists public.admin_activity (
  id           bigint generated always as identity primary key,
  admin_id     uuid not null references public.profiles (id) on delete cascade,
  admin_name   text not null,
  action       text not null,        -- support_on, support_off, view, create, edit, delete, role
  target_type  text not null default '',
  target_id    text not null default '',
  target_label text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists admin_activity_created_idx on public.admin_activity (created_at desc);
alter table public.admin_activity enable row level security;

-- O mestre vê tudo; o admin vê o próprio histórico. Ninguém escreve direto (só pelas funções abaixo).
drop policy if exists admin_activity_select on public.admin_activity;
create policy admin_activity_select on public.admin_activity for select to authenticated
  using (public.is_real_master() or admin_id = (select auth.uid()));
revoke insert, update, delete on public.admin_activity from anon, authenticated;

-- Função interna de registro (com deduplicação de 5 min para não inundar o mestre).
create or replace function public._admin_log(
  p_action text, p_type text, p_id text, p_label text, p_dedupe boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  name text;
begin
  select display_name into name from public.profiles where id = uid;
  if name is null then return; end if;

  if p_dedupe and exists (
    select 1 from public.admin_activity
    where admin_id = uid and action = p_action and target_type = p_type and target_id = p_id
      and created_at > now() - interval '5 minutes'
  ) then
    return;
  end if;

  insert into public.admin_activity (admin_id, admin_name, action, target_type, target_id, target_label)
  values (uid, name, p_action, p_type, p_id, p_label);
end;
$$;
revoke execute on function public._admin_log(text, text, text, text, boolean) from public, anon, authenticated;

-- Liga/desliga o modo suporte (sempre avisa o mestre).
create or replace function public.set_admin_mode(p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Apenas o admin pode usar o modo suporte.'; end if;
  update public.profiles set admin_mode = p_on where id = (select auth.uid());
  perform public._admin_log(case when p_on then 'support_on' else 'support_off' end, 'support', '', '', false);
end;
$$;
grant execute on function public.set_admin_mode(boolean) to authenticated;

-- O front registra "o admin abriu X" (leituras não passam por trigger).
create or replace function public.admin_log_view(p_type text, p_id text, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and admin_mode
  ) then
    return;
  end if;
  perform public._admin_log('view', left(p_type, 40), left(p_id, 80), left(p_label, 160));
end;
$$;
grant execute on function public.admin_log_view(text, text, text) to authenticated;

-- Admin define quem é jogador ou mestre (nunca outro admin).
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target public.profiles;
begin
  if not public.is_admin() then raise exception 'Apenas o admin pode mudar papéis.'; end if;
  if p_role not in ('player', 'master') then raise exception 'Papel inválido.'; end if;
  select * into target from public.profiles where id = p_user;
  if target.id is null then raise exception 'Usuário não encontrado.'; end if;
  if target.role = 'admin' then raise exception 'Não é possível alterar outro admin.'; end if;
  update public.profiles set role = p_role where id = p_user;
  perform public._admin_log('role', 'profile', p_user::text,
    target.display_name || ' → ' || case p_role when 'master' then 'mestre' else 'jogador' end, false);
end;
$$;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Auditoria automática de ESCRITAS feitas pelo admin em modo suporte (não dá para burlar pelo front).
create or replace function public.trg_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := (select auth.uid());
  rec   record;
  act   text;
  tname text;
  tid   text;
  lbl   text;
  owner uuid;
begin
  if uid is null or not exists (
    select 1 from public.profiles where id = uid and role = 'admin' and admin_mode
  ) then
    return null;
  end if;

  if tg_op = 'DELETE' then rec := old; else rec := new; end if;
  act := case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'edit' else 'delete' end;

  if tg_table_name = 'characters' then
    if rec.owner_id = uid then return null; end if;
    tname := 'character'; tid := rec.id::text; lbl := rec.name;
  elsif tg_table_name = 'inventory_items' then
    select c.owner_id, c.name into owner, lbl from public.characters c where c.id = rec.character_id;
    if owner is null or owner = uid then return null; end if;
    tname := 'inventory'; tid := rec.character_id::text; lbl := 'Inventário de ' || lbl;
  elsif tg_table_name = 'classes' then
    tname := 'class'; tid := rec.id::text; lbl := rec.name;
  elsif tg_table_name = 'monsters' then
    tname := 'monster'; tid := rec.id::text; lbl := rec.name;
  elsif tg_table_name = 'messages' then
    tname := 'chat'; tid := ''; lbl := 'mensagens do chat';
  else
    return null;
  end if;

  perform public._admin_log(act, tname, tid, lbl);
  return null;
end;
$$;

drop trigger if exists audit_characters on public.characters;
create trigger audit_characters after insert or update or delete on public.characters
  for each row execute function public.trg_admin_audit();
drop trigger if exists audit_inventory on public.inventory_items;
create trigger audit_inventory after insert or update or delete on public.inventory_items
  for each row execute function public.trg_admin_audit();
drop trigger if exists audit_classes on public.classes;
create trigger audit_classes after insert or update or delete on public.classes
  for each row execute function public.trg_admin_audit();
drop trigger if exists audit_monsters on public.monsters;
create trigger audit_monsters after insert or update or delete on public.monsters
  for each row execute function public.trg_admin_audit();
drop trigger if exists audit_messages on public.messages;
create trigger audit_messages after delete on public.messages
  for each row execute function public.trg_admin_audit();

-- ---------- Forja -----------------------------------------------------
alter table public.messages add column if not exists payload jsonb;
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('chat', 'roll', 'forge'));

create table if not exists public.forge_results (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles (id) on delete cascade,
  author_name     text not null,
  character_id    uuid references public.characters (id) on delete set null,
  character_name  text not null default '',
  weapon          text not null,
  rarity          text not null,
  metal           text not null,
  skill_level     int not null,
  components      int not null,
  tests           int not null,
  perfects        int not null default 0,
  betters         int not null default 0,
  goods           int not null default 0,
  misses          int not null default 0,
  criticals       int not null default 0,
  damage_bonus    int not null default 0,
  durability      int not null default 0,
  divine_ok       boolean,
  timeline        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists forge_results_created_idx on public.forge_results (created_at desc);
alter table public.forge_results enable row level security;

drop policy if exists forge_select on public.forge_results;
create policy forge_select on public.forge_results for select to authenticated
  using (author_id = (select auth.uid()) or public.is_master());
drop policy if exists forge_insert on public.forge_results;
create policy forge_insert on public.forge_results for insert to authenticated
  with check (author_id = (select auth.uid()));
drop policy if exists forge_delete on public.forge_results;
create policy forge_delete on public.forge_results for delete to authenticated
  using (public.is_master());

-- ---------- Tempo real ------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'admin_activity', 'forge_results'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
