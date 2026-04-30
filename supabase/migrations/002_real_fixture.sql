-- ─── MIGRACIÓN 002: Equipos reales y fechas del Mundial 2026 ─────────────────
-- Grupos reales (sorteo 1 de abril 2026):
-- A: México, Corea del Sur, Sudáfrica, República Checa
-- B: Canadá, Suiza, Qatar, Bosnia-Herzegovina
-- C: Brasil, Marruecos, Haití, Escocia
-- D: Estados Unidos, Australia, Paraguay, Turquía
-- E: Alemania, Curazao, Costa de Marfil, Ecuador
-- F: Países Bajos, Japón, Suecia, Túnez
-- G: Bélgica, Irán, Egipto, Nueva Zelanda
-- H: España, Uruguay, Arabia Saudita, Cabo Verde
-- I: Francia, Senegal, Noruega, Irak
-- J: Argentina, Austria, Argelia, Jordania
-- K: Portugal, Colombia, Uzbekistán, Congo DR
-- L: Inglaterra, Croacia, Panamá, Ghana
-- Todos los horarios en UTC

-- ─── GRUPO A ─────────────────────────────────────────────────────────────────
update public.matches set home_team='México',       away_team='Sudáfrica',      match_date='2026-06-11 19:00:00+00' where id='ga_1';
update public.matches set home_team='Corea del Sur',away_team='República Checa',        match_date='2026-06-12 02:00:00+00' where id='ga_2';
update public.matches set home_team='República Checa',      away_team='Sudáfrica',      match_date='2026-06-18 16:00:00+00' where id='ga_3';
update public.matches set home_team='México',       away_team='Corea del Sur',  match_date='2026-06-19 01:00:00+00' where id='ga_4';
update public.matches set home_team='República Checa',      away_team='México',         match_date='2026-06-25 01:00:00+00' where id='ga_5';
update public.matches set home_team='Sudáfrica',    away_team='Corea del Sur',  match_date='2026-06-25 01:00:00+00' where id='ga_6';

-- ─── GRUPO B ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Canadá',            away_team='Bosnia-Herzegovina', match_date='2026-06-12 19:00:00+00' where id='gb_1';
update public.matches set home_team='Qatar',             away_team='Suiza',              match_date='2026-06-13 19:00:00+00' where id='gb_2';
update public.matches set home_team='Suiza',             away_team='Bosnia-Herzegovina', match_date='2026-06-18 19:00:00+00' where id='gb_3';
update public.matches set home_team='Canadá',            away_team='Qatar',              match_date='2026-06-18 22:00:00+00' where id='gb_4';
update public.matches set home_team='Suiza',             away_team='Canadá',             match_date='2026-06-24 19:00:00+00' where id='gb_5';
update public.matches set home_team='Bosnia-Herzegovina',away_team='Qatar',              match_date='2026-06-24 19:00:00+00' where id='gb_6';

-- ─── GRUPO C ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Brasil',    away_team='Marruecos', match_date='2026-06-13 22:00:00+00' where id='gc_1';
update public.matches set home_team='Haití',     away_team='Escocia',   match_date='2026-06-14 01:00:00+00' where id='gc_2';
update public.matches set home_team='Escocia',   away_team='Marruecos', match_date='2026-06-19 22:00:00+00' where id='gc_3';
update public.matches set home_team='Brasil',    away_team='Haití',     match_date='2026-06-20 00:30:00+00' where id='gc_4';
update public.matches set home_team='Escocia',   away_team='Brasil',    match_date='2026-06-24 22:00:00+00' where id='gc_5';
update public.matches set home_team='Marruecos', away_team='Haití',     match_date='2026-06-24 22:00:00+00' where id='gc_6';

-- ─── GRUPO D ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Estados Unidos', away_team='Paraguay',  match_date='2026-06-13 01:00:00+00' where id='gd_1';
update public.matches set home_team='Australia',      away_team='Turquía',   match_date='2026-06-14 04:00:00+00' where id='gd_2';
update public.matches set home_team='Estados Unidos', away_team='Australia', match_date='2026-06-19 19:00:00+00' where id='gd_3';
update public.matches set home_team='Turquía',        away_team='Paraguay',  match_date='2026-06-20 03:00:00+00' where id='gd_4';
update public.matches set home_team='Turquía',        away_team='Estados Unidos', match_date='2026-06-26 02:00:00+00' where id='gd_5';
update public.matches set home_team='Paraguay',       away_team='Australia', match_date='2026-06-26 02:00:00+00' where id='gd_6';

-- ─── GRUPO E ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Alemania',       away_team='Curazao',        match_date='2026-06-14 17:00:00+00' where id='ge_1';
update public.matches set home_team='Costa de Marfil',away_team='Ecuador',        match_date='2026-06-14 23:00:00+00' where id='ge_2';
update public.matches set home_team='Alemania',       away_team='Costa de Marfil',match_date='2026-06-20 20:00:00+00' where id='ge_3';
update public.matches set home_team='Ecuador',        away_team='Curazao',        match_date='2026-06-21 00:00:00+00' where id='ge_4';
update public.matches set home_team='Curazao',        away_team='Costa de Marfil',match_date='2026-06-25 20:00:00+00' where id='ge_5';
update public.matches set home_team='Ecuador',        away_team='Alemania',       match_date='2026-06-25 20:00:00+00' where id='ge_6';

-- ─── GRUPO F ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Países Bajos', away_team='Japón',         match_date='2026-06-14 20:00:00+00' where id='gf_1';
update public.matches set home_team='Suecia',       away_team='Túnez',         match_date='2026-06-15 02:00:00+00' where id='gf_2';
update public.matches set home_team='Países Bajos', away_team='Suecia',        match_date='2026-06-20 17:00:00+00' where id='gf_3';
update public.matches set home_team='Túnez',        away_team='Japón',         match_date='2026-06-21 04:00:00+00' where id='gf_4';
update public.matches set home_team='Japón',        away_team='Suecia',        match_date='2026-06-25 23:00:00+00' where id='gf_5';
update public.matches set home_team='Túnez',        away_team='Países Bajos',  match_date='2026-06-25 23:00:00+00' where id='gf_6';

-- ─── GRUPO G ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Bélgica',      away_team='Egipto',        match_date='2026-06-15 19:00:00+00' where id='gg_1';
update public.matches set home_team='Irán',         away_team='Nueva Zelanda', match_date='2026-06-16 01:00:00+00' where id='gg_2';
update public.matches set home_team='Bélgica',      away_team='Irán',          match_date='2026-06-21 19:00:00+00' where id='gg_3';
update public.matches set home_team='Nueva Zelanda',away_team='Egipto',        match_date='2026-06-22 01:00:00+00' where id='gg_4';
update public.matches set home_team='Egipto',       away_team='Irán',          match_date='2026-06-27 03:00:00+00' where id='gg_5';
update public.matches set home_team='Nueva Zelanda',away_team='Bélgica',       match_date='2026-06-27 03:00:00+00' where id='gg_6';

-- ─── GRUPO H ─────────────────────────────────────────────────────────────────
update public.matches set home_team='España',        away_team='Cabo Verde',    match_date='2026-06-15 16:00:00+00' where id='gh_1';
update public.matches set home_team='Arabia Saudita',away_team='Uruguay',       match_date='2026-06-15 22:00:00+00' where id='gh_2';
update public.matches set home_team='España',        away_team='Arabia Saudita',match_date='2026-06-21 16:00:00+00' where id='gh_3';
update public.matches set home_team='Uruguay',       away_team='Cabo Verde',    match_date='2026-06-21 22:00:00+00' where id='gh_4';
update public.matches set home_team='Cabo Verde',    away_team='Arabia Saudita',match_date='2026-06-27 00:00:00+00' where id='gh_5';
update public.matches set home_team='Uruguay',       away_team='España',        match_date='2026-06-27 00:00:00+00' where id='gh_6';

-- ─── GRUPO I ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Francia', away_team='Senegal', match_date='2026-06-16 19:00:00+00' where id='gi_1';
update public.matches set home_team='Irak',    away_team='Noruega', match_date='2026-06-16 22:00:00+00' where id='gi_2';
update public.matches set home_team='Francia', away_team='Irak',    match_date='2026-06-22 21:00:00+00' where id='gi_3';
update public.matches set home_team='Noruega', away_team='Senegal', match_date='2026-06-23 00:00:00+00' where id='gi_4';
update public.matches set home_team='Noruega', away_team='Francia', match_date='2026-06-26 19:00:00+00' where id='gi_5';
update public.matches set home_team='Senegal', away_team='Irak',    match_date='2026-06-26 19:00:00+00' where id='gi_6';

-- ─── GRUPO J ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Argentina',away_team='Argelia', match_date='2026-06-17 01:00:00+00' where id='gj_1';
update public.matches set home_team='Austria',  away_team='Jordania',match_date='2026-06-17 04:00:00+00' where id='gj_2';
update public.matches set home_team='Argentina',away_team='Austria', match_date='2026-06-22 17:00:00+00' where id='gj_3';
update public.matches set home_team='Jordania', away_team='Argelia', match_date='2026-06-23 03:00:00+00' where id='gj_4';
update public.matches set home_team='Argelia',  away_team='Austria', match_date='2026-06-28 02:00:00+00' where id='gj_5';
update public.matches set home_team='Jordania', away_team='Argentina',match_date='2026-06-28 02:00:00+00' where id='gj_6';

-- ─── GRUPO K ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Portugal',   away_team='Congo DR',    match_date='2026-06-17 17:00:00+00' where id='gk_1';
update public.matches set home_team='Uzbekistán', away_team='Colombia',    match_date='2026-06-18 02:00:00+00' where id='gk_2';
update public.matches set home_team='Portugal',   away_team='Uzbekistán',  match_date='2026-06-23 17:00:00+00' where id='gk_3';
update public.matches set home_team='Colombia',   away_team='Congo DR',    match_date='2026-06-24 02:00:00+00' where id='gk_4';
update public.matches set home_team='Colombia',   away_team='Portugal',    match_date='2026-06-27 23:30:00+00' where id='gk_5';
update public.matches set home_team='Congo DR',   away_team='Uzbekistán',  match_date='2026-06-27 23:30:00+00' where id='gk_6';

-- ─── GRUPO L ─────────────────────────────────────────────────────────────────
update public.matches set home_team='Inglaterra',away_team='Croacia', match_date='2026-06-17 20:00:00+00' where id='gl_1';
update public.matches set home_team='Ghana',     away_team='Panamá',  match_date='2026-06-17 23:00:00+00' where id='gl_2';
update public.matches set home_team='Inglaterra',away_team='Ghana',   match_date='2026-06-23 20:00:00+00' where id='gl_3';
update public.matches set home_team='Panamá',    away_team='Croacia', match_date='2026-06-23 23:00:00+00' where id='gl_4';
update public.matches set home_team='Panamá',    away_team='Inglaterra',match_date='2026-06-27 21:00:00+00' where id='gl_5';
update public.matches set home_team='Croacia',   away_team='Ghana',   match_date='2026-06-27 21:00:00+00' where id='gl_6';

-- ─── 16AVOS DE FINAL (fechas, equipos TBD) ───────────────────────────────────
update public.matches set match_date='2026-06-28 19:00:00+00' where id='16_1';
update public.matches set match_date='2026-06-29 17:00:00+00' where id='16_2';
update public.matches set match_date='2026-06-29 20:30:00+00' where id='16_3';
update public.matches set match_date='2026-06-30 01:00:00+00' where id='16_4';
update public.matches set match_date='2026-06-30 17:00:00+00' where id='16_5';
update public.matches set match_date='2026-06-30 21:00:00+00' where id='16_6';
update public.matches set match_date='2026-07-01 01:00:00+00' where id='16_7';
update public.matches set match_date='2026-07-01 16:00:00+00' where id='16_8';
update public.matches set match_date='2026-07-01 20:00:00+00' where id='16_9';
update public.matches set match_date='2026-07-02 00:00:00+00' where id='16_10';
update public.matches set match_date='2026-07-03 18:00:00+00' where id='16_11';
update public.matches set match_date='2026-07-03 19:00:00+00' where id='16_12';
update public.matches set match_date='2026-07-03 22:00:00+00' where id='16_13';
update public.matches set match_date='2026-07-03 23:00:00+00' where id='16_14';
update public.matches set match_date='2026-07-04 01:30:00+00' where id='16_15';
update public.matches set match_date='2026-07-04 03:00:00+00' where id='16_16';

-- ─── OCTAVOS DE FINAL ────────────────────────────────────────────────────────
update public.matches set match_date='2026-07-04 17:00:00+00' where id='8_1';
update public.matches set match_date='2026-07-04 21:00:00+00' where id='8_2';
update public.matches set match_date='2026-07-05 20:00:00+00' where id='8_3';
update public.matches set match_date='2026-07-06 00:00:00+00' where id='8_4';
update public.matches set match_date='2026-07-06 19:00:00+00' where id='8_5';
update public.matches set match_date='2026-07-07 00:00:00+00' where id='8_6';
update public.matches set match_date='2026-07-07 16:00:00+00' where id='8_7';
update public.matches set match_date='2026-07-07 20:00:00+00' where id='8_8';

-- ─── CUARTOS DE FINAL ────────────────────────────────────────────────────────
update public.matches set match_date='2026-07-09 20:00:00+00' where id='qf_1';
update public.matches set match_date='2026-07-10 19:00:00+00' where id='qf_2';
update public.matches set match_date='2026-07-11 21:00:00+00' where id='qf_3';
update public.matches set match_date='2026-07-12 01:00:00+00' where id='qf_4';

-- ─── SEMIFINALES ─────────────────────────────────────────────────────────────
update public.matches set match_date='2026-07-14 19:00:00+00' where id='sf_1';
update public.matches set match_date='2026-07-15 19:00:00+00' where id='sf_2';

-- ─── TERCER PUESTO ───────────────────────────────────────────────────────────
update public.matches set match_date='2026-07-18 21:00:00+00' where id='3p_1';

-- ─── FINAL ───────────────────────────────────────────────────────────────────
update public.matches set match_date='2026-07-19 19:00:00+00' where id='fin_1';
