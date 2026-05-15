# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # next dev (localhost:3000)
npm run build  # next build
npm run start  # next start (production)
```

There is no lint script, no test suite, and no type-check script. Type errors surface only via `next build` or the editor's TS server.

## Stack & Next.js 16 caveats

Next.js **16.2.4** + React **19.2.4** + Tailwind **v4** + Supabase SSR. Per `AGENTS.md`, this Next.js version has breaking changes versus older training data. Two non-obvious ones already in this repo:

- **Middleware lives in `proxy.ts`, not `middleware.ts`**, and the exported function is `proxy` (not `middleware`). `proxy.ts` re-exports `updateSession` from `lib/supabase/middleware.ts`.
- `cookies()`, `headers()`, and `createClient()` (the server one) all return Promises and **must be `await`ed**. See `lib/supabase/server.ts:6` and `lib/actions.ts:9`.

Tailwind v4 is configured inline in `app/globals.css` via `@theme { ... }` — there is **no `tailwind.config.{js,ts}`**. Custom colors (`bg-navy`, `text-gold`, `text-muted`, `bg-green`, etc.) and fonts (`font-bebas`, `font-outfit`) are defined there; check that file before adding new utility class names.

Path alias `@/*` maps to the repo root (see `tsconfig.json`).

## Architecture

Spanish-language football pool ("prode") for FIFA World Cup 2026, hosted on Vercel. Users predict scores; admins manage match results and unlock knockout phases.

### Routing

```
app/
  page.tsx                    # public login (magic link)
  auth/callback/page.tsx      # client-side token handler — handles BOTH implicit (#hash) and PKCE (?code) flows
  (app)/                      # route group: authenticated area
    layout.tsx                # gate: redirects to / if no session/profile
    dashboard/                # personal stats
    partidos/                 # pick entry (Matches)
    tabla/                    # leaderboard (Standings)
    admin/                    # admin panel (gated by profiles.is_admin)
  api/
    sync-results/route.ts     # cron + admin-triggered import from football-data.org
    notify/route.ts           # admin-triggered Resend email blast
```

`proxy.ts` runs on every request (except static assets) and (a) refreshes Supabase auth cookies, (b) redirects unauthenticated users away from non-public paths, (c) bounces logged-in users away from `/`. The matcher in `proxy.ts` is the source of truth for what's public.

### Supabase clients — pick the right one

Four entry points, do not cross them up:

- `lib/supabase/server.ts` — RSC/server-action client, RLS-bound, **always `await createClient()`**. Default for server code.
- `lib/supabase/client.ts` — browser client (`'use client'` only). Configured for **implicit flow** (`flowType: 'implicit'`) — magic-link tokens arrive in the URL hash, not as `?code=`.
- `lib/supabase/middleware.ts` — used only by `proxy.ts`; manages cookie refresh.
- `lib/supabase/admin.ts` — **service-role** client that bypasses RLS. Server-only, used by `app/api/sync-results/route.ts` to mutate matches/phases without an auth context. Never import from client code.

### Data model (see `supabase/migrations/001_schema.sql` and `types/database.ts`)

- `profiles` — auto-created by `handle_new_user` trigger on `auth.users` insert; reads `name` from user metadata.
- `matches` — text `id` (e.g. `ga_1`, `16_3`, `qf_2`, `fin_1`), grouped by `phase` and optional `group_name`. Knockout matches start with `home_team='TBD ...'` placeholders that the sync job rewrites once teams are known.
- `picks` — one per `(user_id, match_id)`, upserted via `savePicks` server action.
- `active_phases` — admin toggle gating which phases are visible/editable in `/partidos`.
- `get_leaderboard` RPC — security-definer SQL function that computes points server-side. **The scoring rule is duplicated** in `lib/scoring.ts` (TS, used for per-card UI badges) and in the `get_leaderboard` SQL (used for ranking). If you change the rule, change both.

RLS lets users read their own picks always, but other users' picks only after the match's result is in (`001_schema.sql:106`).

### Phases — Spanish keys, English labels

DB phase IDs are Spanish (`grupos`, `dieciseisavos`, `octavos`, `cuartos`, `semis`, `tercero`, `final`); the UI is in English. The mapping lives in `lib/matches-data.ts` (`PHASE_ORDER`, `PHASE_LABELS`, `translateGroupName`).

Team names were originally Spanish (migration `001`) and migration `003_english_teams.sql` renames them to English. `FLAGS` in `lib/matches-data.ts` and `TEAM_NAME_MAP` in `app/api/sync-results/route.ts` intentionally carry **both** Spanish and English aliases so things keep working through and after the rename — preserve both when adding teams.

### Match-locking convention

`isMatchLocked(matchDate)` in `lib/scoring.ts`/`matches-data.ts` returns true within **12h before kickoff**. The client respects it for input disabling, but the server actions (`savePicks` etc.) do **not** re-check it — RLS only enforces ownership, not timing. If you need a hard server-side lock, add it in the action.

### sync-results cron

`GET /api/sync-results` is a Vercel cron endpoint authenticated by `Authorization: Bearer ${CRON_SECRET}`. Same handler runs from the admin panel via `POST` (RLS-checked for `is_admin`). It (1) renames TBD knockouts by matching phase + kickoff time within a 2h window, (2) writes scores for FINISHED matches by matching team-name pair where `home_score IS NULL`, (3) auto-activates a phase 48h before its first match. The `TOURNAMENT_START`/`TOURNAMENT_END` constants short-circuit the job outside that window.

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — all Supabase clients
- `SUPABASE_SERVICE_ROLE_KEY` — `lib/supabase/admin.ts` (sync-results only)
- `FOOTBALL_DATA_API_KEY` — sync-results
- `CRON_SECRET` — sync-results GET handler
- `SMTP_USER`, `SMTP_PASS`, `NEXT_PUBLIC_APP_URL` — notify route (Nodemailer). Optional overrides: `SMTP_HOST` (default `smtp.gmail.com`), `SMTP_PORT` (default `465`), `SMTP_SECURE` (default `true`), `SMTP_FROM` (default `Prode La Juanita <SMTP_USER>`). For Gmail, `SMTP_PASS` must be an app password (not your account password) with 2FA enabled.
- `ADMIN_PASSWORD` — `lib/actions.ts:135` (default `juanita2026` if unset; the default is shown to users in the admin login UI, so override it in production)
