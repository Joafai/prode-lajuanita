-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text        not null,
  email      text        not null,
  is_admin   boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── MATCHES ─────────────────────────────────────────────────────────────────
create table if not exists public.matches (
  id          text        primary key,
  phase       text        not null,
  group_name  text,
  home_team   text        not null,
  away_team   text        not null,
  home_score  integer,
  away_score  integer,
  match_date  timestamptz,
  sort_order  integer     not null default 0
);

alter table public.matches enable row level security;

create policy "matches_select_all" on public.matches
  for select using (true);

create policy "matches_admin_write" on public.matches
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ─── ACTIVE PHASES ───────────────────────────────────────────────────────────
create table if not exists public.active_phases (
  phase        text    primary key,
  is_active    boolean not null default false,
  activated_at timestamptz
);

alter table public.active_phases enable row level security;

create policy "active_phases_select_all" on public.active_phases
  for select using (true);

create policy "active_phases_admin_write" on public.active_phases
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

insert into public.active_phases (phase, is_active) values
  ('grupos',        true),
  ('dieciseisavos', false),
  ('octavos',       false),
  ('cuartos',       false),
  ('semis',         false),
  ('tercero',       false),
  ('final',         false)
on conflict (phase) do nothing;

-- ─── PICKS ───────────────────────────────────────────────────────────────────
create table if not exists public.picks (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  match_id   text        references public.matches(id) not null,
  home_score integer     not null check (home_score >= 0),
  away_score integer     not null check (away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

alter table public.picks enable row level security;

-- Users see their own picks always; other people's picks only after result is in
create policy "picks_select" on public.picks
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.home_score is not null
    )
  );

create policy "picks_insert_own" on public.picks
  for insert with check (auth.uid() = user_id);

create policy "picks_update_own" on public.picks
  for update using (auth.uid() = user_id);

create policy "picks_delete_own" on public.picks
  for delete using (auth.uid() = user_id);

-- ─── LEADERBOARD FUNCTION ────────────────────────────────────────────────────
create or replace function public.get_leaderboard()
returns table (
  user_id      uuid,
  name         text,
  email        text,
  total_pts    bigint,
  exact_count  bigint,
  winner_count bigint,
  picks_count  bigint
)
language sql security definer set search_path = public as $$
  select
    p.id,
    p.name,
    p.email,
    coalesce(sum(
      case
        when m.home_score is null then 0
        when pk.home_score = m.home_score and pk.away_score = m.away_score then 3
        when sign(pk.home_score - pk.away_score) = sign(m.home_score - m.away_score) then 1
        else 0
      end
    ), 0) as total_pts,
    coalesce(sum(
      case when m.home_score is not null
            and pk.home_score = m.home_score
            and pk.away_score = m.away_score then 1 else 0 end
    ), 0) as exact_count,
    coalesce(sum(
      case when m.home_score is not null
            and sign(pk.home_score - pk.away_score) = sign(m.home_score - m.away_score)
            and not (pk.home_score = m.home_score and pk.away_score = m.away_score) then 1 else 0 end
    ), 0) as winner_count,
    count(pk.id) as picks_count
  from public.profiles p
  left join public.picks pk on pk.user_id = p.id
  left join public.matches m on m.id = pk.match_id
  group by p.id, p.name, p.email
  order by total_pts desc, exact_count desc, p.name asc;
$$;

-- ─── SEED: GROUP STAGE MATCHES (72 matches) ─────────────────────────────────
insert into public.matches (id, phase, group_name, home_team, away_team, sort_order) values
-- GROUP A
('ga_1','grupos','Grupo A','Argentina','Islandia',1),
('ga_2','grupos','Grupo A','Argentina','Kenia',2),
('ga_3','grupos','Grupo A','Argentina','Nueva Zelanda',3),
('ga_4','grupos','Grupo A','Islandia','Kenia',4),
('ga_5','grupos','Grupo A','Islandia','Nueva Zelanda',5),
('ga_6','grupos','Grupo A','Kenia','Nueva Zelanda',6),
-- GROUP B
('gb_1','grupos','Grupo B','Francia','Bélgica',7),
('gb_2','grupos','Grupo B','Francia','México',8),
('gb_3','grupos','Grupo B','Francia','Arabia Saudita',9),
('gb_4','grupos','Grupo B','Bélgica','México',10),
('gb_5','grupos','Grupo B','Bélgica','Arabia Saudita',11),
('gb_6','grupos','Grupo B','México','Arabia Saudita',12),
-- GROUP C
('gc_1','grupos','Grupo C','Brasil','Portugal',13),
('gc_2','grupos','Grupo C','Brasil','Ecuador',14),
('gc_3','grupos','Grupo C','Brasil','Marruecos',15),
('gc_4','grupos','Grupo C','Portugal','Ecuador',16),
('gc_5','grupos','Grupo C','Portugal','Marruecos',17),
('gc_6','grupos','Grupo C','Ecuador','Marruecos',18),
-- GROUP D
('gd_1','grupos','Grupo D','España','Alemania',19),
('gd_2','grupos','Grupo D','España','Japón',20),
('gd_3','grupos','Grupo D','España','Sudáfrica',21),
('gd_4','grupos','Grupo D','Alemania','Japón',22),
('gd_5','grupos','Grupo D','Alemania','Sudáfrica',23),
('gd_6','grupos','Grupo D','Japón','Sudáfrica',24),
-- GROUP E
('ge_1','grupos','Grupo E','Inglaterra','Países Bajos',25),
('ge_2','grupos','Grupo E','Inglaterra','Costa Rica',26),
('ge_3','grupos','Grupo E','Inglaterra','Senegal',27),
('ge_4','grupos','Grupo E','Países Bajos','Costa Rica',28),
('ge_5','grupos','Grupo E','Países Bajos','Senegal',29),
('ge_6','grupos','Grupo E','Costa Rica','Senegal',30),
-- GROUP F
('gf_1','grupos','Grupo F','Uruguay','Colombia',31),
('gf_2','grupos','Grupo F','Uruguay','Turquía',32),
('gf_3','grupos','Grupo F','Uruguay','Serbia',33),
('gf_4','grupos','Grupo F','Colombia','Turquía',34),
('gf_5','grupos','Grupo F','Colombia','Serbia',35),
('gf_6','grupos','Grupo F','Turquía','Serbia',36),
-- GROUP G
('gg_1','grupos','Grupo G','Estados Unidos','Croacia',37),
('gg_2','grupos','Grupo G','Estados Unidos','Ghana',38),
('gg_3','grupos','Grupo G','Estados Unidos','Irak',39),
('gg_4','grupos','Grupo G','Croacia','Ghana',40),
('gg_5','grupos','Grupo G','Croacia','Irak',41),
('gg_6','grupos','Grupo G','Ghana','Irak',42),
-- GROUP H
('gh_1','grupos','Grupo H','Canadá','Polonia',43),
('gh_2','grupos','Grupo H','Canadá','Camerún',44),
('gh_3','grupos','Grupo H','Canadá','Costa de Marfil',45),
('gh_4','grupos','Grupo H','Polonia','Camerún',46),
('gh_5','grupos','Grupo H','Polonia','Costa de Marfil',47),
('gh_6','grupos','Grupo H','Camerún','Costa de Marfil',48),
-- GROUP I
('gi_1','grupos','Grupo I','Italia','Australia',49),
('gi_2','grupos','Grupo I','Italia','Kazajistán',50),
('gi_3','grupos','Grupo I','Italia','Guinea',51),
('gi_4','grupos','Grupo I','Australia','Kazajistán',52),
('gi_5','grupos','Grupo I','Australia','Guinea',53),
('gi_6','grupos','Grupo I','Kazajistán','Guinea',54),
-- GROUP J
('gj_1','grupos','Grupo J','Panamá','Perú',55),
('gj_2','grupos','Grupo J','Panamá','Bolivia',56),
('gj_3','grupos','Grupo J','Panamá','Libia',57),
('gj_4','grupos','Grupo J','Perú','Bolivia',58),
('gj_5','grupos','Grupo J','Perú','Libia',59),
('gj_6','grupos','Grupo J','Bolivia','Libia',60),
-- GROUP K
('gk_1','grupos','Grupo K','Corea del Sur','Suiza',61),
('gk_2','grupos','Grupo K','Corea del Sur','El Salvador',62),
('gk_3','grupos','Grupo K','Corea del Sur','Qatar',63),
('gk_4','grupos','Grupo K','Suiza','El Salvador',64),
('gk_5','grupos','Grupo K','Suiza','Qatar',65),
('gk_6','grupos','Grupo K','El Salvador','Qatar',66),
-- GROUP L
('gl_1','grupos','Grupo L','Irán','Egipto',67),
('gl_2','grupos','Grupo L','Irán','Dinamarca',68),
('gl_3','grupos','Grupo L','Irán','Guatemala',69),
('gl_4','grupos','Grupo L','Egipto','Dinamarca',70),
('gl_5','grupos','Grupo L','Egipto','Guatemala',71),
('gl_6','grupos','Grupo L','Dinamarca','Guatemala',72)
on conflict (id) do nothing;

-- ─── SEED: KNOCKOUT ROUNDS (TBD) ─────────────────────────────────────────────
insert into public.matches (id, phase, group_name, home_team, away_team, sort_order) values
-- 16AVOS DE FINAL (Round of 32 — 16 matches)
('16_1', 'dieciseisavos','16avos de Final','TBD 1', 'TBD 2', 101),
('16_2', 'dieciseisavos','16avos de Final','TBD 3', 'TBD 4', 102),
('16_3', 'dieciseisavos','16avos de Final','TBD 5', 'TBD 6', 103),
('16_4', 'dieciseisavos','16avos de Final','TBD 7', 'TBD 8', 104),
('16_5', 'dieciseisavos','16avos de Final','TBD 9', 'TBD 10',105),
('16_6', 'dieciseisavos','16avos de Final','TBD 11','TBD 12',106),
('16_7', 'dieciseisavos','16avos de Final','TBD 13','TBD 14',107),
('16_8', 'dieciseisavos','16avos de Final','TBD 15','TBD 16',108),
('16_9', 'dieciseisavos','16avos de Final','TBD 17','TBD 18',109),
('16_10','dieciseisavos','16avos de Final','TBD 19','TBD 20',110),
('16_11','dieciseisavos','16avos de Final','TBD 21','TBD 22',111),
('16_12','dieciseisavos','16avos de Final','TBD 23','TBD 24',112),
('16_13','dieciseisavos','16avos de Final','TBD 25','TBD 26',113),
('16_14','dieciseisavos','16avos de Final','TBD 27','TBD 28',114),
('16_15','dieciseisavos','16avos de Final','TBD 29','TBD 30',115),
('16_16','dieciseisavos','16avos de Final','TBD 31','TBD 32',116),
-- OCTAVOS DE FINAL (Round of 16 — 8 matches)
('8_1','octavos','Octavos de Final','TBD 1','TBD 2',201),
('8_2','octavos','Octavos de Final','TBD 3','TBD 4',202),
('8_3','octavos','Octavos de Final','TBD 5','TBD 6',203),
('8_4','octavos','Octavos de Final','TBD 7','TBD 8',204),
('8_5','octavos','Octavos de Final','TBD 9','TBD 10',205),
('8_6','octavos','Octavos de Final','TBD 11','TBD 12',206),
('8_7','octavos','Octavos de Final','TBD 13','TBD 14',207),
('8_8','octavos','Octavos de Final','TBD 15','TBD 16',208),
-- CUARTOS DE FINAL (Quarterfinals — 4 matches)
('qf_1','cuartos','Cuartos de Final','TBD 1','TBD 2',301),
('qf_2','cuartos','Cuartos de Final','TBD 3','TBD 4',302),
('qf_3','cuartos','Cuartos de Final','TBD 5','TBD 6',303),
('qf_4','cuartos','Cuartos de Final','TBD 7','TBD 8',304),
-- SEMIFINALES (2 matches)
('sf_1','semis','Semifinales','TBD 1','TBD 2',401),
('sf_2','semis','Semifinales','TBD 3','TBD 4',402),
-- TERCER PUESTO
('3p_1','tercero','Tercer Puesto','TBD 1','TBD 2',501),
-- FINAL
('fin_1','final','Final','TBD 1','TBD 2',601)
on conflict (id) do nothing;
