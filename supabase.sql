-- Выполнить в Supabase → SQL Editor. Публичный просмотр; изменение только авторизованным администратором.
-- ВАЖНО: задайте email администратора в таблице app_admins вручную после регистрации.
create table if not exists public.app_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.albums (
 id text primary key, title text not null, subtitle text not null default '', cover text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.pages (
 id text primary key, album_id text not null references public.albums(id) on delete cascade,
 position integer not null default 0, image text not null default '', caption text not null default '', hotspots jsonb not null default '[]'::jsonb
);
alter table public.app_admins enable row level security;
alter table public.albums enable row level security;
alter table public.pages enable row level security;
create or replace function public.is_story_admin() returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.app_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_story_admin() from public;
grant execute on function public.is_story_admin() to authenticated;
drop policy if exists "albums_public_read" on public.albums;
create policy "albums_public_read" on public.albums for select to anon,authenticated using (true);
drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read" on public.pages for select to anon,authenticated using (true);
drop policy if exists "albums_admin_insert" on public.albums;
create policy "albums_admin_insert" on public.albums for insert to authenticated with check (public.is_story_admin());
drop policy if exists "albums_admin_update" on public.albums;
create policy "albums_admin_update" on public.albums for update to authenticated using (public.is_story_admin()) with check (public.is_story_admin());
drop policy if exists "albums_admin_delete" on public.albums;
create policy "albums_admin_delete" on public.albums for delete to authenticated using (public.is_story_admin());
drop policy if exists "pages_admin_insert" on public.pages;
create policy "pages_admin_insert" on public.pages for insert to authenticated with check (public.is_story_admin());
drop policy if exists "pages_admin_update" on public.pages;
create policy "pages_admin_update" on public.pages for update to authenticated using (public.is_story_admin()) with check (public.is_story_admin());
drop policy if exists "pages_admin_delete" on public.pages;
create policy "pages_admin_delete" on public.pages for delete to authenticated using (public.is_story_admin());
insert into storage.buckets(id,name,public) values ('story-images','story-images',true) on conflict(id) do update set public=true;
drop policy if exists "story_images_public_read" on storage.objects;
create policy "story_images_public_read" on storage.objects for select to anon,authenticated using (bucket_id='story-images');
drop policy if exists "story_images_admin_upload" on storage.objects;
create policy "story_images_admin_upload" on storage.objects for insert to authenticated with check (bucket_id='story-images' and public.is_story_admin());
-- Добавьте свой UUID из Authentication → Users:
-- insert into public.app_admins(user_id) values ('ВАШ-UUID');
