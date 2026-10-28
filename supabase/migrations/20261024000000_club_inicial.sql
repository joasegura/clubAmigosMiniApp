-- =====================================================================
-- Club Entre amigos — esquema inicial (MVP)
-- Correr completo en Supabase → SQL Editor, o con `supabase db push`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfiles de socios (uno por usuario de Supabase Auth)
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Socio',
  avatar_url   text,
  role         text not null default 'socio' check (role in ('socio', 'admin')),
  created_at   timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra (Google o mail)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1),
      'Socio'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Vinos. "catalogo" = productos de la vinoteca (a futuro sincronizados
-- desde Nexus por nexus_id). "externo" = cargado por un socio; queda en su
-- perfil pero no entra al ranking.
-- ---------------------------------------------------------------------
create table public.wines (
  id          uuid primary key default gen_random_uuid(),
  nexus_id    text unique,
  name        text not null check (char_length(name) between 1 and 120),
  winery      text check (char_length(winery) <= 120),
  varietal    text check (char_length(varietal) <= 60),
  vintage     int check (vintage between 1900 and 2100),
  region      text check (char_length(region) <= 120),
  price       numeric(12, 2) check (price >= 0),
  in_stock    boolean not null default true,
  image_url   text,
  source      text not null default 'catalogo' check (source in ('catalogo', 'externo')),
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index wines_source_active_idx on public.wines (source, active);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger wines_touch before update on public.wines
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Publicaciones: "tomé este vino" con puntaje, comentario y foto
-- ---------------------------------------------------------------------
create table public.tastings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  wine_id     uuid not null references public.wines (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 600),
  occasion    text check (char_length(occasion) <= 40),
  photo_path  text,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index tastings_created_idx on public.tastings (created_at desc);
create index tastings_wine_idx on public.tastings (wine_id);
create index tastings_user_idx on public.tastings (user_id);

create table public.tasting_cheers (
  tasting_id  uuid not null references public.tastings (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (tasting_id, user_id)
);

create table public.tasting_comments (
  id          uuid primary key default gen_random_uuid(),
  tasting_id  uuid not null references public.tastings (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index tasting_comments_tasting_idx on public.tasting_comments (tasting_id, created_at);

-- Lista "Quiero probar"
create table public.wishlist (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  wine_id     uuid not null references public.wines (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, wine_id)
);

-- Reportes de contenido para moderación
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('tasting', 'comment')),
  target_id    uuid not null,
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason       text check (char_length(reason) <= 200),
  status       text not null default 'pendiente' check (status in ('pendiente', 'oculto', 'mantenido')),
  created_at   timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

-- Cada toque en "Lo quiero" (para medir ventas generadas por el club)
create table public.want_clicks (
  id          uuid primary key default gen_random_uuid(),
  wine_id     uuid not null references public.wines (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Configuración del club (una sola fila)
create table public.club_settings (
  id                  int primary key default 1 check (id = 1),
  wine_of_month_id    uuid references public.wines (id) on delete set null,
  wine_of_month_note  text check (char_length(wine_of_month_note) <= 200),
  updated_at          timestamptz not null default now()
);
insert into public.club_settings (id) values (1);

-- ---------------------------------------------------------------------
-- Ranking: solo vinos del catálogo, solo publicaciones visibles
-- ---------------------------------------------------------------------
create view public.wine_ranking
with (security_invoker = true) as
select
  w.*,
  round(avg(t.rating)::numeric, 2)  as avg_rating,
  count(t.id)::int                  as votes
from public.wines w
join public.tastings t on t.wine_id = w.id and t.hidden = false
where w.source = 'catalogo' and w.active
group by w.id;

-- El más tomado del mes en curso
create or replace function public.most_logged_this_month()
returns table (wine_id uuid, name text, winery text, total int)
language sql
stable
security invoker
set search_path = public
as $$
  select w.id, w.name, w.winery, count(*)::int as total
  from public.tastings t
  join public.wines w on w.id = t.wine_id
  where t.hidden = false
    and w.source = 'catalogo'
    and t.created_at >= date_trunc('month', now())
  group by w.id
  order by total desc, max(t.created_at) desc
  limit 1;
$$;

-- Números de la semana para el panel de la vinoteca
create or replace function public.admin_week_stats()
returns table (new_members int, tastings int, want_clicks int, pending_reports int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo para administradores';
  end if;
  return query select
    (select count(*)::int from public.profiles p where p.created_at >= now() - interval '7 days'),
    (select count(*)::int from public.tastings t where t.created_at >= now() - interval '7 days'),
    (select count(*)::int from public.want_clicks c where c.created_at >= now() - interval '7 days'),
    (select count(distinct (r.target_type, r.target_id))::int from public.reports r where r.status = 'pendiente');
end;
$$;

-- Moderación: ocultar o mantener una publicación/comentario y cerrar sus reportes
create or replace function public.moderate(p_target_type text, p_target_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo para administradores';
  end if;
  if p_action not in ('ocultar', 'mantener', 'mostrar') then
    raise exception 'Acción inválida';
  end if;

  if p_target_type = 'tasting' then
    update public.tastings set hidden = (p_action = 'ocultar') where id = p_target_id;
  elsif p_target_type = 'comment' then
    update public.tasting_comments set hidden = (p_action = 'ocultar') where id = p_target_id;
  else
    raise exception 'Tipo inválido';
  end if;

  update public.reports
     set status = case when p_action = 'ocultar' then 'oculto' else 'mantenido' end
   where target_type = p_target_type and target_id = p_target_id and status = 'pendiente';
end;
$$;

-- ---------------------------------------------------------------------
-- Seguridad (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.wines            enable row level security;
alter table public.tastings         enable row level security;
alter table public.tasting_cheers   enable row level security;
alter table public.tasting_comments enable row level security;
alter table public.wishlist         enable row level security;
alter table public.reports          enable row level security;
alter table public.want_clicks      enable row level security;
alter table public.club_settings    enable row level security;

-- La app es solo para usuarios registrados
revoke all on all tables in schema public from anon;
revoke execute on function public.admin_week_stats() from anon, public;
revoke execute on function public.moderate(text, uuid, text) from anon, public;
grant execute on function public.admin_week_stats() to authenticated;
grant execute on function public.moderate(text, uuid, text) to authenticated;

-- profiles: todos ven a todos; cada uno edita solo su nombre y foto (nunca su rol)
create policy "perfiles visibles" on public.profiles
  for select to authenticated using (true);
create policy "editar mi perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- wines
create policy "ver vinos" on public.wines
  for select to authenticated using (active or created_by = auth.uid() or public.is_admin());
create policy "socios cargan vinos externos" on public.wines
  for insert to authenticated
  with check (
    public.is_admin()
    or (source = 'externo' and created_by = auth.uid() and nexus_id is null)
  );
create policy "admin edita vinos" on public.wines
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin borra vinos" on public.wines
  for delete to authenticated using (public.is_admin());

-- tastings
create policy "ver publicaciones" on public.tastings
  for select to authenticated using (hidden = false or user_id = auth.uid() or public.is_admin());
create policy "publicar" on public.tastings
  for insert to authenticated with check (user_id = auth.uid() and hidden = false);
create policy "editar mis publicaciones" on public.tastings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "borrar mis publicaciones" on public.tastings
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());
revoke update on public.tastings from authenticated;
grant update (rating, comment, occasion, photo_path) on public.tastings to authenticated;

-- brindis
create policy "ver brindis" on public.tasting_cheers
  for select to authenticated using (true);
create policy "brindar" on public.tasting_cheers
  for insert to authenticated with check (user_id = auth.uid());
create policy "sacar brindis" on public.tasting_cheers
  for delete to authenticated using (user_id = auth.uid());

-- comentarios
create policy "ver comentarios" on public.tasting_comments
  for select to authenticated using (hidden = false or user_id = auth.uid() or public.is_admin());
create policy "comentar" on public.tasting_comments
  for insert to authenticated with check (user_id = auth.uid() and hidden = false);
create policy "borrar mis comentarios" on public.tasting_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());
revoke update on public.tasting_comments from authenticated;

-- quiero probar
create policy "mi lista" on public.wishlist
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reportes
create policy "reportar" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'pendiente');
create policy "ver reportes" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
revoke update on public.reports from authenticated;

-- lo quiero
create policy "registrar lo quiero" on public.want_clicks
  for insert to authenticated with check (user_id = auth.uid());
create policy "admin ve lo quiero" on public.want_clicks
  for select to authenticated using (public.is_admin());

-- configuración
create policy "ver configuración" on public.club_settings
  for select to authenticated using (true);
create policy "admin configura" on public.club_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Fotos (Storage). Bucket público de lectura; cada socio sube a su carpeta.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "subir mis fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar mis fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
