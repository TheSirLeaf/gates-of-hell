-- =====================================================================
-- Gates of Hell — schema inicial
-- Cole este arquivo inteiro no Supabase: SQL Editor -> New query -> Run.
-- É seguro rodar de novo (idempotente) — não apaga dados existentes.
-- =====================================================================

-- ---------- Perfis (1 por usuário do Supabase Auth) -------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role         text not null default 'player' check (role in ('player', 'master')),
  created_at   timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper usado nas políticas de segurança (RLS).
create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'master'
  );
$$;

-- ---------- Classes ---------------------------------------------------
create table if not exists public.classes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique check (char_length(name) between 1 and 60),
  summary      text not null default '',
  bonus_fisico     int not null default 0,
  bonus_mental     int not null default 0,
  bonus_espiritual int not null default 0,
  vida         int not null default 0,   -- valor somado à rolagem de Vida
  stamina      int not null default 0,   -- valor somado à rolagem de Stamina
  skills       text[] not null default '{}',          -- chaves das 3 perícias da classe
  benefits     text not null default '',
  abilities    jsonb not null default '[]'::jsonb,    -- [{name, cost, description}]
  created_at   timestamptz not null default now()
);

-- ---------- Personagens (fichas) --------------------------------------
create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null default 'Novo personagem' check (char_length(name) between 1 and 80),
  race        text not null default '' check (char_length(race) <= 60),
  class_id    uuid references public.classes (id) on delete set null,

  -- Atributos base (o bônus da classe é somado na aplicação)
  fisico      int not null default 0 check (fisico between 0 and 99),
  mental      int not null default 0 check (mental between 0 and 99),
  espiritual  int not null default 0 check (espiritual between 0 and 99),

  -- Recursos (atual / máximo)
  vida          int not null default 0,
  vida_max      int not null default 0,
  postura       int not null default 0,
  postura_max   int not null default 0,
  stamina       int not null default 0,
  stamina_max   int not null default 0,

  -- Armadura escolhida (a Resistência é derivada da tabela de regras)
  armor_kind      text,
  armor_material  text,

  skills          jsonb not null default '{}'::jsonb,   -- { "luta": 2, "esquiva": 1 }
  chosen_ability  text not null default '',
  notes           text not null default '',
  avatar_url      text,                                 -- reservado para o Cloudflare R2

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists characters_owner_idx on public.characters (owner_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists characters_touch on public.characters;
create trigger characters_touch
  before update on public.characters
  for each row execute function public.touch_updated_at();

-- ---------- Inventário ------------------------------------------------
create table if not exists public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references public.characters (id) on delete cascade,
  kind          text not null default 'item' check (kind in ('arma', 'armadura', 'item')),
  name          text not null check (char_length(name) between 1 and 80),
  description   text not null default '',
  weapon_key    text,                                  -- chave na tabela de armas das regras
  quantity      int not null default 1 check (quantity >= 0),
  equipped      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists inventory_character_idx on public.inventory_items (character_id);

-- ---------- Bestiário (somente mestre) --------------------------------
create table if not exists public.monsters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  vida        int not null default 0,
  vida_max    int not null default 0,
  postura     int not null default 0,
  stamina     int not null default 0,
  resistencia int not null default 0,
  fisico      int not null default 0,
  mental      int not null default 0,
  espiritual  int not null default 0,
  attacks     text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------- Chat e rolagens -------------------------------------------
create table if not exists public.messages (
  id            bigint generated always as identity primary key,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  author_name   text not null,
  character_id  uuid references public.characters (id) on delete set null,
  kind          text not null default 'chat' check (kind in ('chat', 'roll')),
  body          text not null default '' check (char_length(body) <= 2000),
  rolls         jsonb,                                  -- RollResult[] quando kind = 'roll'
  secret        boolean not null default false,         -- visível só para o autor e o mestre
  created_at    timestamptz not null default now()
);
create index if not exists messages_created_idx on public.messages (created_at desc);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.classes         enable row level security;
alter table public.characters      enable row level security;
alter table public.inventory_items enable row level security;
alter table public.monsters        enable row level security;
alter table public.messages        enable row level security;

-- profiles: todos os logados leem (nomes no chat); cada um edita só o próprio nome.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Ninguém muda o próprio papel pelo app: só display_name é atualizável.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- classes: todos leem; só o mestre escreve.
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select to authenticated using (true);
drop policy if exists classes_write on public.classes;
create policy classes_write on public.classes for all to authenticated
  using (public.is_master()) with check (public.is_master());

-- characters: dono ou mestre.
drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_master());
drop policy if exists characters_insert on public.characters;
create policy characters_insert on public.characters for insert to authenticated
  with check (owner_id = (select auth.uid()) or public.is_master());
drop policy if exists characters_update on public.characters;
create policy characters_update on public.characters for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_master())
  with check (owner_id = (select auth.uid()) or public.is_master());
drop policy if exists characters_delete on public.characters;
create policy characters_delete on public.characters for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_master());

-- inventory_items: herdam a permissão do personagem.
drop policy if exists inventory_all on public.inventory_items;
create policy inventory_all on public.inventory_items for all to authenticated
  using (exists (
    select 1 from public.characters c
    where c.id = character_id and (c.owner_id = (select auth.uid()) or public.is_master())
  ))
  with check (exists (
    select 1 from public.characters c
    where c.id = character_id and (c.owner_id = (select auth.uid()) or public.is_master())
  ));

-- monsters: só o mestre.
drop policy if exists monsters_all on public.monsters;
create policy monsters_all on public.monsters for all to authenticated
  using (public.is_master()) with check (public.is_master());

-- messages: todos leem, exceto rolagens secretas (autor + mestre).
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (not secret or author_id = (select auth.uid()) or public.is_master());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (author_id = (select auth.uid()));
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated
  using (public.is_master());

-- =====================================================================
-- Tempo real (Supabase Realtime)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['messages', 'characters', 'inventory_items', 'classes', 'monsters'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- DELETE em tempo real precisa da linha antiga completa.
alter table public.characters      replica identity full;
alter table public.inventory_items replica identity full;
alter table public.classes         replica identity full;
alter table public.monsters        replica identity full;
