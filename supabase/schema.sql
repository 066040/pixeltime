-- PixelTime veritabanı şeması (Supabase)
-- Supabase panelinde SQL Editor'e yapıştırıp bir kere çalıştır.

create extension if not exists pgcrypto;

-- ---------- Tablolar ----------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 30),
  code        text not null unique,
  size        int  not null check (size between 2 and 10),
  side        int  not null,
  cells       int  not null,
  season      int  not null default 1,
  owner       uuid not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 2 and 20),
  bird        text not null check (char_length(bird) between 2 and 40),
  color       text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  exam        text check (exam is null or char_length(exam) <= 20),
  city        text check (city is null or char_length(city) <= 30),
  school      text check (school is null or char_length(school) <= 80),
  team_id     uuid references public.teams (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Her satır = tamamlanmış 25 dakikalık bir blok (bir kare)
create table if not exists public.blocks (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  client_id   text not null,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  mode        text not null check (mode in ('pomodoro', 'kronometre')),
  team_id     uuid references public.teams (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists blocks_user_idx on public.blocks (user_id, started_at);
create index if not exists blocks_team_idx on public.blocks (team_id, id);
create index if not exists blocks_time_idx on public.blocks (started_at);
create index if not exists profiles_team_idx on public.profiles (team_id);

-- ---------- Güvenlik (RLS) ----------
alter table public.profiles enable row level security;
alter table public.teams    enable row level security;
alter table public.blocks   enable row level security;

drop policy if exists "profil okuma" on public.profiles;
create policy "profil okuma" on public.profiles for select to authenticated using (true);
drop policy if exists "kendi profilini ekle" on public.profiles;
create policy "kendi profilini ekle" on public.profiles for insert to authenticated
  with check (id = auth.uid() and team_id is null);
drop policy if exists "kendi profilini güncelle" on public.profiles;
create policy "kendi profilini güncelle" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "ekip okuma" on public.teams;
create policy "ekip okuma" on public.teams for select to authenticated using (true);

drop policy if exists "kendi bloklarını oku" on public.blocks;
create policy "kendi bloklarını oku" on public.blocks for select to authenticated using (user_id = auth.uid());
-- Ekleme sadece record_blocks fonksiyonu üzerinden (doğrulamalı)

-- team_id'yi kullanıcı doğrudan değiştiremesin: sadece fonksiyonlar değiştirir
create or replace function public.guard_profile_team() returns trigger
language plpgsql as $$
begin
  if new.team_id is distinct from old.team_id and current_setting('pixeltime.allow_team', true) is distinct from 'on' then
    new.team_id := old.team_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_team();

-- ---------- Blok kaydı (hile önlemli) ----------
-- p_blocks: [{"client_id":"...","started_at":"...","ended_at":"...","mode":"pomodoro"}]
create or replace function public.record_blocks(p_blocks jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b jsonb;
  s timestamptz; e timestamptz; m text; cid text;
  my_team uuid; team_cells int;
  ok text[] := '{}'; bad jsonb := '[]'::jsonb;
  day_count int;
begin
  if me is null then raise exception 'giris gerekli'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'profil yok'; end if;
  if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) > 60 then raise exception 'gecersiz istek'; end if;

  select team_id into my_team from profiles where id = me;

  for b in select * from jsonb_array_elements(p_blocks) loop
    cid := b->>'client_id';
    begin
      s := (b->>'started_at')::timestamptz;
      e := (b->>'ended_at')::timestamptz;
    exception when others then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'tarih'); continue;
    end;
    m := coalesce(b->>'mode', 'pomodoro');

    if cid is null or char_length(cid) > 64 then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'kimlik'); continue; end if;
    -- aynı blok ikinci kez gelirse: zaten kayıtlı, kabul say
    if exists (select 1 from blocks where user_id = me and client_id = cid) then
      ok := ok || cid; continue; end if;
    if m not in ('pomodoro', 'kronometre') then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'mod'); continue; end if;
    -- 25 dakika (küçük saat farklarına tolerans)
    if e - s < interval '24 minutes 30 seconds' or e - s > interval '26 minutes' then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'sure'); continue; end if;
    -- gelecekte bitmiş ya da çok eski olamaz
    if e > now() + interval '2 minutes' or s < now() - interval '14 days' then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'zaman'); continue; end if;
    -- aynı anda iki çalışma olamaz
    if exists (select 1 from blocks where user_id = me
               and tstzrange(started_at, ended_at, '[)') && tstzrange(s, e, '[)')) then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'cakisma'); continue; end if;
    -- günde en fazla 28 blok (~12 saat), Türkiye saatine göre
    select count(*) into day_count from blocks where user_id = me
      and (started_at at time zone 'Europe/Istanbul')::date = (s at time zone 'Europe/Istanbul')::date;
    if day_count >= 28 then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'gunluk'); continue; end if;

    -- ekip tuvalinde yer varsa ekibe de yaz
    team_cells := null;
    if my_team is not null then
      select cells into team_cells from teams where id = my_team;
      if (select count(*) from blocks where team_id = my_team) >= team_cells then team_cells := null; end if;
    end if;

    insert into blocks (user_id, client_id, started_at, ended_at, mode, team_id)
    values (me, cid, s, e, m, case when team_cells is not null then my_team end);
    ok := ok || cid;
  end loop;

  return jsonb_build_object('accepted', to_jsonb(ok), 'rejected', bad);
end $$;

-- ---------- Ekipler ----------
create or replace function public.new_team_code() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from teams where code = c);
  end loop;
  return c;
end $$;

create or replace function public.create_team(p_name text, p_size int)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t teams;
  sd int;
begin
  if me is null then raise exception 'giris gerekli'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'profil yok'; end if;
  if (select team_id from profiles where id = me) is not null then raise exception 'zaten bir ekiptesin'; end if;
  if p_size < 2 or p_size > 10 then raise exception 'ekip 2-10 kisi olmali'; end if;
  sd := round(16 * sqrt(p_size));
  insert into teams (name, code, size, side, cells, owner)
  values (trim(p_name), new_team_code(), p_size, sd, sd * sd, me)
  returning * into t;
  perform set_config('pixeltime.allow_team', 'on', true);
  update profiles set team_id = t.id where id = me;
  return t;
end $$;

create or replace function public.join_team(p_code text)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t teams;
begin
  if me is null then raise exception 'giris gerekli'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'profil yok'; end if;
  if (select team_id from profiles where id = me) is not null then raise exception 'zaten bir ekiptesin'; end if;
  select * into t from teams where code = upper(trim(p_code));
  if t.id is null then raise exception 'ekip bulunamadi'; end if;
  if (select count(*) from profiles where team_id = t.id) >= t.size then raise exception 'ekip dolu'; end if;
  perform set_config('pixeltime.allow_team', 'on', true);
  update profiles set team_id = t.id where id = me;
  return t;
end $$;

create or replace function public.leave_team()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'giris gerekli'; end if;
  perform set_config('pixeltime.allow_team', 'on', true);
  update profiles set team_id = null where id = auth.uid();
end $$;

-- Ekip tuvali: üyeler + açılan karelerin sahipleri (açılış sırasıyla)
create or replace function public.team_state(p_team uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t teams;
begin
  if auth.uid() is null then raise exception 'giris gerekli'; end if;
  if (select team_id from profiles where id = auth.uid()) is distinct from p_team then raise exception 'bu ekipte degilsin'; end if;
  select * into t from teams where id = p_team;
  return jsonb_build_object(
    'team', to_jsonb(t),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nickname', p.nickname, 'bird', p.bird, 'color', p.color,
               'count', (select count(*) from blocks x where x.team_id = t.id and x.user_id = p.id)) order by p.created_at)
      from profiles p where p.team_id = t.id), '[]'::jsonb),
    'opened', coalesce((
      select jsonb_agg(o.user_id order by o.id) from (
        select id, user_id from blocks where team_id = t.id order by id limit t.cells) o), '[]'::jsonb)
  );
end $$;

-- ---------- Sıralamalar ----------
-- p_scope: 'kisi' | 'okul' | 'sehir' | 'ekip'
create or replace function public.leaderboard(p_scope text, p_since timestamptz)
returns table (label text, sub text, bird text, color text, total bigint)
language sql stable security definer set search_path = public as $$
  select * from (
    select p.nickname, coalesce(p.city, ''), p.bird, p.color, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'kisi' and b.started_at >= p_since
      group by p.id, p.nickname, p.city, p.bird, p.color
    union all
    select min(trim(p.school)), min(coalesce(p.city, '')), null, null, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'okul' and b.started_at >= p_since and nullif(trim(p.school), '') is not null
      group by lower(trim(p.school))
    union all
    select p.city, null, null, null, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'sehir' and b.started_at >= p_since and p.city is not null
      group by p.city
    union all
    select t.name, t.size || ' kişi', null, null, count(*)
      from blocks b join teams t on t.id = b.team_id
      where p_scope = 'ekip' and b.started_at >= p_since
      group by t.id, t.name, t.size
  ) r (label, sub, bird, color, total)
  order by total desc, label
  limit 50;
$$;

-- Fonksiyon yetkileri
revoke all on function public.record_blocks(jsonb) from public;
revoke all on function public.create_team(text, int) from public;
revoke all on function public.join_team(text) from public;
revoke all on function public.leave_team() from public;
revoke all on function public.team_state(uuid) from public;
revoke all on function public.leaderboard(text, timestamptz) from public;
grant execute on function public.record_blocks(jsonb) to authenticated;
grant execute on function public.create_team(text, int) to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.leave_team() to authenticated;
grant execute on function public.team_state(uuid) to authenticated;
grant execute on function public.leaderboard(text, timestamptz) to authenticated;
