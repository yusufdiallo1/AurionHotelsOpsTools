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
| `NEXT_PUBLIC_DEFAULT_LANG` | public | First-paint language: `en` or `ar` |
| `RESEND_API_KEY` / `ALERT_FROM_EMAIL` / `MANAGER_ALERT_EMAIL` | server | Optional cash-mismatch email alert |

## Database

Supabase project `ksocwxsdvlvtjdlelbnf`. The `properties` table is seeded
(`al_aqeeq`, `as_salaam`, `quba`) with RLS enabled. The `handovers` table and the
`signatures` Storage bucket are added in the wizard phase.

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
