# Aurion Shift Handover

A standalone, **no-login** internal tool for Aurion Hotels. The outgoing receptionist
records end-of-shift state and signs; the phone is handed to the incoming receptionist,
who recounts the cash drawer and signs; the handover is saved to Supabase (source of
truth) and synced to Google Sheets.

📖 The project handbook is [`CLAUDE.md`](./CLAUDE.md) — design tokens, bilingual rules,
golden rules, build phases. Read it before building.

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind v4
- Supabase — Postgres (source of truth), Storage (signatures), RLS on
- Google Sheets API (sync, server-side only)
- Hosting: Vercel

## Routes

`/` home · `/new` + `/new/[id]` handover wizard · `/history` + `/history/[id]` ·
`/manager` (passcode-gated) · `/styleguide` (component visual test)

> Build status: **foundation complete**. Wizard, history/PDF, realtime, manager, and
> reliability features land in subsequent phases — those routes currently show a
> placeholder.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:5174
```

`.env.local` ships with the public Supabase URL + anon key, the service-role key, and the
Google service-account credentials for this project.

## Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Browser client (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Server routes (bypasses RLS) |
| `GOOGLE_SA_EMAIL` | server | Sheets service-account email |
| `GOOGLE_SA_PRIVATE_KEY` | server | Sheets service-account key (`\n`-escaped) |
| `HANDOVER_SHEET_ID` | server | Target Google Sheet ID (bare) |
| `MANAGER_PASSCODE` | server | Unlocks `/manager` (manager phase) |
| `NEXT_PUBLIC_SITE_URL` | public | Absolute base URL (links, redirects) |
| `NEXT_PUBLIC_DEFAULT_LANG` | public | First-paint language: `en` or `ar` (default `ar`) |
| `ADMIN1_EMAIL` / `ADMIN1_PASSWORD` / `ADMIN1_NAME` | server | First seed admin (used by `scripts/seed-admins.mjs`) |
| `ADMIN2_EMAIL` / `ADMIN2_PASSWORD` / `ADMIN2_NAME` | server | Second seed admin |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public | Web Push (browser subscribe) |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | server | Web Push (server send) |
| `DRIVE_FOLDER_AL_AQEEQ` / `DRIVE_FOLDER_AS_SALAAM` | server | Per-hotel Drive folder IDs for PDF archive |
| `RESEND_API_KEY` / `ALERT_FROM_EMAIL` / `MANAGER_ALERT_EMAIL` | server | Optional cash-mismatch email alert |

## Auth & roles

Supabase Auth (email + password). Roles live in `profiles.role` (`admin` |
`receptionist`). Seed the two admins once: `node scripts/seed-admins.mjs` (reads
`ADMIN{1,2}_*` from `.env.local`). Admins create receptionists/admins from `/admin`.
`middleware.ts` redirects unauthenticated users to `/login`; `/history`, `/manager`,
`/admin` are admin-only (server-enforced). Receptionists see Home + New + their
incoming-handover notifications.

## Database

Supabase project `ksocwxsdvlvtjdlelbnf`. `properties` seeded (`al_aqeeq`,
`as_salaam`; each `total_rooms` 19). Tables: `handovers`, `profiles`, `notifications`,
`push_subscriptions`, `audit_log`. RLS on all (authenticated for handovers/properties;
self+admin for profiles; admin-read for audit_log).

**Regenerate types after every migration:**

```bash
npx supabase gen types typescript --project-id ksocwxsdvlvtjdlelbnf > lib/supabase/types.ts
```

If the CLI reports an access-control error, regenerate via the Supabase MCP
`generate_typescript_types` tool instead (uses the OAuth session) and paste into
`lib/supabase/types.ts`.

## Google Sheets setup

The user/owner performs these; the app codes against them:

1. Enable the **Google Sheets API** in the Google Cloud project.
2. Create a **service account**; download its JSON key.
3. Put `client_email` → `GOOGLE_SA_EMAIL` and `private_key` → `GOOGLE_SA_PRIVATE_KEY`
   (keep the literal `\n` escapes).
4. **Share the target Google Sheet** with the service-account email as **Editor**.
   ⚠️ This is the step most often missed — without it the sync returns
   "The caller does not have permission" (the handover still saves to Supabase).
5. Put the bare Sheet ID (between `/d/` and `/edit`) → `HANDOVER_SHEET_ID`.
6. Name the tab **`Handovers`** — the sync appends to `Handovers!A:Q`.

The sync runs only in the `/api/sync-handover` server route — the Google key never reaches
the browser. A Sheets failure never loses data: the handover is already saved in Supabase
and flagged for re-sync.

## Google Drive setup (per-hotel PDF archive)

Completed handovers upload a branded PDF to a per-hotel Drive folder via the **same
service account** (Drive scope). The owner performs:

1. Create two folders in Drive (e.g. "Aurion (Al-Aqeeq) Handovers", "Aurion (As-Salaam)
   Handovers").
2. **Share each folder with the service-account email as `Editor`** (Viewer is not
   enough — uploads fail with "Insufficient permissions for the specified parent").
3. Put each folder ID → `DRIVE_FOLDER_AL_AQEEQ` / `DRIVE_FOLDER_AS_SALAAM`.

Failure never blocks a handover: `drive_error` is recorded and the detail page still
works. A "View in Google Drive" link appears once uploaded.

## Web Push

VAPID keys: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (browser) + `VAPID_PRIVATE_KEY` (server).
Generate with `npx web-push generate-vapid-keys`. The service worker is `public/sw.js`;
receptionists are prompted to allow notifications after login. On Step-1 submit the
incoming receptionist(s) of that hotel get an in-app notification + a Web Push.

## Deploy (Vercel)

Set **all** env vars above in Vercel, then `node scripts/seed-admins.mjs` once against
production. Share the Drive folders + Sheet as Editor with the SA. Rotate the VAPID
private key if it was ever shared.

## Conventions

- Mobile-first (~380px), touch targets ≥44px, inputs ≥16px font (no iOS zoom).
- Bilingual via a toggle (EN/AR), one language at a time; default `ar` (RTL). All UI text
  from `lib/strings.ts`. Numbers stored Western; Arabic-Indic shown only in AR.
- RLS on every table; browser uses the anon key only; service-role + Google keys
  server-side only.

## Deploy (Vercel)

1. Import the repo into Vercel (zero-config Next.js).
2. Add **all** env vars above in Project → Settings → Environment Variables.
3. Deploy; use the preview URL for real-phone testing.

## Scripts

```bash
npm run dev      # dev server on :5174 (Turbopack)
npm run build    # production build
npm run start    # serve the production build on :5174
npm run lint     # ESLint
```
