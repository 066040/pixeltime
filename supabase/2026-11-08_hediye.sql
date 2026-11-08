-- 8 Kasım 2026: saat bağlanınca 6 hediye kare. Supabase → SQL Editor'de bir kez çalıştır.
alter table public.blocks drop constraint if exists blocks_mode_check;
alter table public.blocks add constraint blocks_mode_check check (mode in ('pomodoro', 'kronometre', 'saat', 'hediye'));
alter table public.devices add column if not exists gift_given boolean not null default false;

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
  select count(*) into day_count from blocks where user_id = me and mode <> 'hediye'
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

create or replace function public.leaderboard(p_scope text, p_since timestamptz, p_exam text default null)
returns table (uid uuid, label text, sub text, bird text, color text, color2 text, total bigint)
language sql stable security definer set search_path = public as $$
  select * from (
    select case when p.is_public or p.id = auth.uid() then p.id end,
           case when p.is_public or p.id = auth.uid() then p.nickname else 'Gizli kullanıcı' end,
           case when p.is_public or p.id = auth.uid() then coalesce(p.city, '') else '' end,
           case when p.is_public or p.id = auth.uid() then p.bird end, p.color, p.color2, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'kisi' and b.mode <> 'hediye' and b.started_at >= p_since and (p_exam is null or p.exam = p_exam)
      group by p.id, p.nickname, p.city, p.bird, p.color, p.color2, p.is_public
    union all
    select null::uuid, min(trim(p.school)), min(coalesce(p.city, '')), null, null, null, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'okul' and b.mode <> 'hediye' and b.started_at >= p_since and nullif(trim(p.school), '') is not null and (p_exam is null or p.exam = p_exam)
      group by lower(trim(p.school))
    union all
    select null::uuid, p.city, null, null, null, null, count(*)
      from blocks b join profiles p on p.id = b.user_id
      where p_scope = 'sehir' and b.mode <> 'hediye' and b.started_at >= p_since and p.city is not null and (p_exam is null or p.exam = p_exam)
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
    'total', (select count(*) from blocks b where b.user_id = p.id and b.mode <> 'hediye'));
end $$;

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
  -- Hoş geldin hediyesi: her saat için bir kez, 6 kare
  if not d.gift_given then
    insert into blocks (user_id, client_id, started_at, ended_at, mode, device_id)
      select auth.uid(), 'hediye-' || d.serial || '-' || i, now(), now(), 'hediye', d.id from generate_series(1, 6) i
      on conflict (user_id, client_id) do nothing;
    update devices set gift_given = true where id = d.id;
    return jsonb_build_object('serial', d.serial, 'gift', 6);
  end if;
  return jsonb_build_object('serial', d.serial, 'gift', 0);
end $$;

create or replace function public.my_devices()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('serial', d.serial, 'fw', d.fw, 'last_seen', d.last_seen, 'claimed_at', d.claimed_at,
    'blocks', (select count(*) from blocks b where b.device_id = d.id and b.mode <> 'hediye')) order by d.claimed_at), '[]'::jsonb)
  from devices d where d.owner = auth.uid();
$$;
