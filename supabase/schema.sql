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
  color2      text check (color2 is null or color2 ~ '^#[0-9a-fA-F]{6}$'),
  exam        text check (exam is null or char_length(exam) <= 20),
  city        text check (city is null or char_length(city) <= 30),
  school      text check (school is null or char_length(school) <= 80),
  team_id     uuid references public.teams (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Eski kurulumlar için: gradyan kenarlığın ikinci rengi
alter table public.profiles add column if not exists color2 text check (color2 is null or color2 ~ '^#[0-9a-fA-F]{6}$');
-- Profil gizliliği ve kuş sırası (her hesapta farklı sıra için tohum)
alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists seed text check (seed is null or char_length(seed) <= 40);
-- Pixel profil kuşu PixelTime Saat sahiplerine özel; saat doğrulaması gelene kadar kimse seçemez
alter table public.profiles drop constraint if exists profiles_pixel_pro;
alter table public.profiles add constraint profiles_pixel_pro check (bird <> 'pixel');

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
-- ---------- PixelTime Saat ----------
-- Her saatin seri numarası, gizli anahtarı ve kutudaki kartta yazan eşleştirme kodu.
-- Bu tabloya hiçbir kural (policy) verilmez: site ya da saat doğrudan okuyamaz, sadece fonksiyonlar okur.
create table if not exists public.devices (
  id          uuid primary key default gen_random_uuid(),
  serial      text not null unique check (serial ~ '^PT-[0-9A-Z]{4,10}$'),
  secret      text not null check (char_length(secret) >= 32),
  claim_code  text not null unique check (claim_code ~ '^[A-Z0-9]{6,10}$'),
  owner       uuid references auth.users (id) on delete set null,
  name        text,
  fw          text,
  claimed_at  timestamptz,
  last_seen   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists devices_owner_idx on public.devices (owner);
alter table public.blocks add column if not exists device_id uuid references public.devices (id) on delete set null;

create index if not exists blocks_user_idx on public.blocks (user_id, started_at);
create index if not exists blocks_team_idx on public.blocks (team_id, id);
create index if not exists blocks_time_idx on public.blocks (started_at);
create index if not exists profiles_team_idx on public.profiles (team_id);

-- ---------- Güvenlik (RLS) ----------
alter table public.profiles enable row level security;
alter table public.teams    enable row level security;
alter table public.blocks   enable row level security;
alter table public.devices  enable row level security;

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
-- Saatten gelen bloklar için mod 'saat'; hangi saatten geldiği device_id'de tutulur
alter table public.blocks drop constraint if exists blocks_mode_check;
alter table public.blocks add constraint blocks_mode_check check (mode in ('pomodoro', 'kronometre', 'saat'));

-- Tek bir bloğu kurallara göre ekler. Dönen değer: null = kabul, değilse ret sebebi.
-- Hem siteden (record_blocks) hem saatten (device_record) gelen kayıtlar bu kapıdan geçer.
create or replace function public.add_block(me uuid, cid text, s timestamptz, e timestamptz, m text, dev uuid default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  my_team uuid; team_cells int; day_count int;
begin
  if cid is null or char_length(cid) > 64 then return 'kimlik'; end if;
  -- aynı blok ikinci kez gelirse: zaten kayıtlı, kabul say
  if exists (select 1 from blocks where user_id = me and client_id = cid) then return null; end if;
  if m not in ('pomodoro', 'kronometre', 'saat') then return 'mod'; end if;
  -- 25 dakika (küçük saat farklarına tolerans)
  if e - s < interval '24 minutes 30 seconds' or e - s > interval '26 minutes' then return 'sure'; end if;
  -- gelecekte bitmiş ya da çok eski olamaz
  if e > now() + interval '2 minutes' or s < now() - interval '14 days' then return 'zaman'; end if;
  -- aynı anda iki çalışma olamaz (site + saat aynı anda da sayılmaz)
  if exists (select 1 from blocks where user_id = me
             and tstzrange(started_at, ended_at, '[)') && tstzrange(s, e, '[)')) then return 'cakisma'; end if;
  -- günde en fazla 28 blok (~12 saat), Türkiye saatine göre
  select count(*) into day_count from blocks where user_id = me
    and (started_at at time zone 'Europe/Istanbul')::date = (s at time zone 'Europe/Istanbul')::date;
  if day_count >= 28 then return 'gunluk'; end if;

  -- ekip tuvalinde yer varsa ekibe de yaz
  select team_id into my_team from profiles where id = me;
  team_cells := null;
  if my_team is not null then
    select cells into team_cells from teams where id = my_team;
    if (select count(*) from blocks where team_id = my_team) >= team_cells then team_cells := null; end if;
  end if;

  insert into blocks (user_id, client_id, started_at, ended_at, mode, team_id, device_id)
  values (me, cid, s, e, m, case when team_cells is not null then my_team end, dev);
  return null;
end $$;

-- p_blocks: [{"client_id":"...","started_at":"...","ended_at":"...","mode":"pomodoro"}]
create or replace function public.record_blocks(p_blocks jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b jsonb; s timestamptz; e timestamptz; cid text; why text;
  ok text[] := '{}'; bad jsonb := '[]'::jsonb;
begin
  if me is null then raise exception 'giris gerekli'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'profil yok'; end if;
  if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) > 60 then raise exception 'gecersiz istek'; end if;

  for b in select * from jsonb_array_elements(p_blocks) loop
    cid := b->>'client_id';
    begin
      s := (b->>'started_at')::timestamptz;
      e := (b->>'ended_at')::timestamptz;
    exception when others then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'tarih'); continue;
    end;
    -- 'saat' modu sadece saatin kendisinden gelebilir
    if coalesce(b->>'mode', 'pomodoro') = 'saat' then
      bad := bad || jsonb_build_object('client_id', cid, 'reason', 'mod'); continue; end if;
    why := add_block(me, cid, s, e, coalesce(b->>'mode', 'pomodoro'), null);
    if why is null then ok := ok || cid;
    else bad := bad || jsonb_build_object('client_id', cid, 'reason', why); end if;
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
      select jsonb_agg(jsonb_build_object('id', p.id, 'nickname', p.nickname, 'bird', p.bird, 'color', p.color, 'color2', p.color2,
               'count', (select count(*) from blocks x where x.team_id = t.id and x.user_id = p.id)) order by p.created_at)
      from profiles p where p.team_id = t.id), '[]'::jsonb),
    'opened', coalesce((
      select jsonb_agg(o.user_id order by o.id) from (
        select id, user_id from blocks where team_id = t.id order by id limit t.cells) o), '[]'::jsonb)
  );
end $$;

-- ---------- Sıralamalar ----------
-- p_scope: 'kisi' | 'okul' | 'sehir' | 'ekip' · p_exam: null ya da 'YKS', 'TUS'...
drop function if exists public.leaderboard(text, timestamptz);
drop function if exists public.leaderboard(text, timestamptz, text);
create or replace function public.leaderboard(p_scope text, p_since timestamptz, p_exam text default null)
returns table (uid uuid, label text, sub text, bird text, color text, color2 text, total bigint)
language sql stable security definer set search_path = public as $$
  select * from (
    select case when p.is_public or p.id = auth.uid() then p.id end,
           case when p.is_public or p.id = auth.uid() then p.nickname else 'Gizli kullanıcı' end,
           case when p.is_public or p.id = auth.uid() then coalesce(p.city, '') else '' end,
           case when p.is_public or p.id = auth.uid() then p.bird end, p.color, p.color2, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'kisi' and b.started_at >= p_since and (p_exam is null or p.exam = p_exam)
      group by p.id, p.nickname, p.city, p.bird, p.color, p.color2, p.is_public
    union all
    select null::uuid, min(trim(p.school)), min(coalesce(p.city, '')), null, null, null, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'okul' and b.started_at >= p_since and nullif(trim(p.school), '') is not null and (p_exam is null or p.exam = p_exam)
      group by lower(trim(p.school))
    union all
    select null::uuid, p.city, null, null, null, null, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'sehir' and b.started_at >= p_since and p.city is not null and (p_exam is null or p.exam = p_exam)
      group by p.city
    union all
    select null::uuid, t.name, t.size || ' kişi', null, null, null, count(*)
      from blocks b join teams t on t.id = b.team_id
      where p_scope = 'ekip' and b.started_at >= p_since
      group by t.id, t.name, t.size
  ) r (uid, label, sub, bird, color, color2, total)
  order by total desc, label
  limit 50;
$$;

-- ---------- Herkese açık profil ----------
create or replace function public.public_profile(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  p profiles;
begin
  if auth.uid() is null then raise exception 'giris gerekli'; end if;
  select * into p from profiles where id = p_id;
  if not found then return null; end if;
  if not p.is_public and p.id <> auth.uid() then return jsonb_build_object('private', true); end if;
  return jsonb_build_object('nickname', p.nickname, 'bird', p.bird, 'color', p.color, 'color2', p.color2,
    'exam', p.exam, 'city', p.city, 'school', p.school, 'seed', p.seed,
    'total', (select count(*) from blocks b where b.user_id = p.id));
end $$;

-- ---------- PixelTime Saat: eşleştirme ve saatten kayıt ----------
-- Siteden: kutudaki kodu (ya da saatin ekranındaki kodu) girince saat bu hesaba bağlanır.
create or replace function public.claim_device(p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d devices;
begin
  if auth.uid() is null then raise exception 'giris gerekli'; end if;
  select * into d from devices where claim_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if d.id is null then raise exception 'saat bulunamadi'; end if;
  if d.owner is not null and d.owner <> auth.uid() then raise exception 'saat baska hesapta'; end if;
  update devices set owner = auth.uid(), claimed_at = coalesce(claimed_at, now()) where id = d.id;
  return jsonb_build_object('serial', d.serial);
end $$;

-- Sitede "Saatim" kartı için: bu hesaba bağlı saatler ve saatten gelen kare sayısı
create or replace function public.my_devices()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('serial', d.serial, 'fw', d.fw, 'last_seen', d.last_seen, 'claimed_at', d.claimed_at,
    'blocks', (select count(*) from blocks b where b.device_id = d.id)) order by d.claimed_at), '[]'::jsonb)
  from devices d where d.owner = auth.uid();
$$;

create or replace function public.release_device(p_serial text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'giris gerekli'; end if;
  update devices set owner = null where serial = p_serial and owner = auth.uid();
end $$;

-- Saatten: Wi-Fi bulunca biriktirdiği blokları imzalı olarak gönderir. Giriş gerekmez, imza yeterli.
-- p_ts: saatin gönderdiği an (unix saniye) · p_blocks: [{"c":"blok-kimliği","s":başlangıç,"e":bitiş}] (unix saniye)
-- p_sig: HMAC-SHA256(secret, serial|ts|c,s,e;c,s,e;...) onaltılık (hex)
create or replace function public.device_record(p_serial text, p_ts bigint, p_blocks jsonb, p_sig text, p_fw text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d devices; msg text; b jsonb; why text; cid text;
  ok text[] := '{}'; bad jsonb := '[]'::jsonb;
begin
  select * into d from devices where serial = p_serial;
  if d.id is null then raise exception 'saat bulunamadi'; end if;
  if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) > 60 then raise exception 'gecersiz istek'; end if;
  -- saatin saati 10 dakikadan fazla kaymışsa (ya da eski bir istek tekrar gönderildiyse) reddet
  if abs(extract(epoch from now()) - p_ts) > 600 then raise exception 'saat ayari'; end if;

  select p_serial || '|' || p_ts || '|' || coalesce(string_agg((x.v->>'c') || ',' || (x.v->>'s') || ',' || (x.v->>'e'), ';' order by x.i), '')
    into msg from jsonb_array_elements(p_blocks) with ordinality as x(v, i);
  if lower(coalesce(p_sig, '')) <> encode(extensions.hmac(msg, d.secret, 'sha256'), 'hex') then raise exception 'imza'; end if;

  update devices set last_seen = now(), fw = coalesce(left(p_fw, 20), fw) where id = d.id;
  -- sahibi yoksa kayıtları kabul etme ama saat tekrar denemesin diye "bekliyor" de
  if d.owner is null or not exists (select 1 from profiles where id = d.owner) then
    return jsonb_build_object('accepted', '[]'::jsonb, 'rejected', '[]'::jsonb, 'unclaimed', true, 'code', d.claim_code);
  end if;

  for b in select * from jsonb_array_elements(p_blocks) loop
    cid := 'saat-' || d.serial || '-' || (b->>'c');
    begin
      why := add_block(d.owner, cid, to_timestamp((b->>'s')::bigint), to_timestamp((b->>'e')::bigint), 'saat', d.id);
    exception when others then why := 'tarih'; end;
    if why is null then ok := ok || (b->>'c');
    else bad := bad || jsonb_build_object('c', b->>'c', 'reason', why); end if;
  end loop;
  return jsonb_build_object('accepted', to_jsonb(ok), 'rejected', bad);
end $$;

-- Fonksiyon yetkileri
revoke all on function public.add_block(uuid, text, timestamptz, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.record_blocks(jsonb) from public;
revoke all on function public.claim_device(text) from public;
revoke all on function public.my_devices() from public;
revoke all on function public.release_device(text) from public;
revoke all on function public.device_record(text, bigint, jsonb, text, text) from public;
revoke all on function public.create_team(text, int) from public;
revoke all on function public.join_team(text) from public;
revoke all on function public.leave_team() from public;
revoke all on function public.team_state(uuid) from public;
revoke all on function public.leaderboard(text, timestamptz, text) from public;
revoke all on function public.public_profile(uuid) from public;
grant execute on function public.record_blocks(jsonb) to authenticated;
grant execute on function public.claim_device(text) to authenticated;
grant execute on function public.my_devices() to authenticated;
grant execute on function public.release_device(text) to authenticated;
grant execute on function public.device_record(text, bigint, jsonb, text, text) to anon, authenticated;
grant execute on function public.create_team(text, int) to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.leave_team() to authenticated;
grant execute on function public.team_state(uuid) to authenticated;
grant execute on function public.leaderboard(text, timestamptz, text) to authenticated;
grant execute on function public.public_profile(uuid) to authenticated;
