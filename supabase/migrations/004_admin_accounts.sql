-- =====================================================================
-- Gates of Hell — gestão de contas pelo admin
-- Rode depois do 003. Idempotente.
--
-- Todas as funções exigem role = 'admin' e NUNCA agem sobre outro admin.
-- Cada ação fica registrada em admin_activity (o mestre vê).
-- =====================================================================

-- Lista de contas com e-mail, último acesso, bloqueio e nº de fichas.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned boolean,
  characters bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Apenas o admin pode listar contas.'; end if;
  return query
    select p.id,
           u.email::text,
           p.display_name,
           p.role,
           p.created_at,
           u.last_sign_in_at,
           (u.banned_until is not null and u.banned_until > now()) as banned,
           (select count(*) from public.characters c where c.owner_id = p.id) as characters
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at;
end;
$$;
grant execute on function public.admin_list_users() to authenticated;

-- Validação comum: precisa ser admin e o alvo não pode ser outro admin.
create or replace function public._admin_target(p_user uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare target public.profiles;
begin
  if not public.is_admin() then raise exception 'Apenas o admin pode gerenciar contas.'; end if;
  select * into target from public.profiles where id = p_user;
  if target.id is null then raise exception 'Conta não encontrada.'; end if;
  if target.role = 'admin' then raise exception 'Contas de admin não podem ser alteradas por aqui.'; end if;
  return target;
end;
$$;
revoke execute on function public._admin_target(uuid) from public, anon, authenticated;

create or replace function public.admin_rename_user(p_user uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target public.profiles; clean text := trim(p_name);
begin
  target := public._admin_target(p_user);
  if clean is null or char_length(clean) not between 1 and 60 then raise exception 'Nome inválido (1 a 60 caracteres).'; end if;
  update public.profiles set display_name = clean where id = p_user;
  perform public._admin_log('account', 'profile', p_user::text, target.display_name || ' renomeado para ' || clean, false);
end;
$$;
grant execute on function public.admin_rename_user(uuid, text) to authenticated;

-- Define uma senha temporária (a pessoa troca depois). Útil quando alguém esquece a senha.
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target public.profiles;
begin
  target := public._admin_target(p_user);
  if p_password is null or char_length(p_password) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user;
  perform public._admin_log('account', 'profile', p_user::text, 'senha de ' || target.display_name || ' redefinida', false);
end;
$$;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- Bloqueia / desbloqueia o login de uma conta (não apaga nada).
create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target public.profiles;
begin
  target := public._admin_target(p_user);
  update auth.users
     set banned_until = case when p_banned then 'infinity'::timestamptz else null end
   where id = p_user;
  if p_banned then
    delete from auth.sessions where user_id = p_user;  -- derruba quem está logado
  end if;
  perform public._admin_log('account', 'profile', p_user::text,
    target.display_name || case when p_banned then ' bloqueado' else ' desbloqueado' end, false);
end;
$$;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

-- Exclui a conta e TUDO dela (fichas, inventário, mensagens, forjas) — irreversível.
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target public.profiles;
begin
  target := public._admin_target(p_user);
  perform public._admin_log('account', 'profile', p_user::text, target.display_name || ' excluído', false);
  delete from auth.users where id = p_user;
end;
$$;
grant execute on function public.admin_delete_user(uuid) to authenticated;
