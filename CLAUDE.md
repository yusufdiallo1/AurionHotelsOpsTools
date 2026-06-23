# CLAUDE.md — Aurion Shift Handover (standalone app, NO auth)

ONE app: the Aurion Hotels Shift Handover tool. Outgoing receptionist records end-of-shift state + signs, hands the phone to the incoming receptionist who recounts cash + signs, then it saves to Supabase and syncs to Google Sheets. No login — internal shared-device tool.

Routes: `/` · `/new` · `/new/[id]` · `/history` · `/history/[id]` · `/manager` · `/styleguide`.

## Golden rules
1. Reliability first: Supabase is the source of truth; sync to Google Sheets AFTER, with retry. Never let Sheets lose data.
2. Mobile-first (~380px), touch targets ≥44px, inputs ≥16px font (stops iOS zoom).
3. Bilingual via a TOGGLE (EN/AR), one language at a time. Arabic shapes + right-aligns (RTL).
4. Test on a real phone before "done" — iOS Safari + Android Chrome, both languages.
5. Clean code: shared logic in shared components, no dead code/console.logs, secrets in env only.

## Stack
Next.js (App Router) + TypeScript + Tailwind. Supabase (Postgres source of truth, Storage for signatures, RLS on). Google Cloud service account + Sheets API, called only from a SERVER route. Host on Vercel.

## Design tokens (Aurion brand — locked)
--navy:#1B2A47; --cream:#F6F1E7; --paper:#FFFFFF; --paper-tint:#FAF6EE; --line:#E7DECC; --line-strong:#D9CDB6; --ink:#211F1A; --ink-soft:#57514A; --muted:#9A9282; --gold:#C6A253; --gold-deep:#A4924E; --gold-soft:#BBA46A;
Primary btn active = navy bg/cream text; disabled = line-strong bg/#8A8270 text. Segmented selected = 2px gold border + #FBF6EA tint + bold ink label. Active step = gold; inactive = muted. Radius 14px; inputs ≥52px tall; single column, max-w ~480px centered.
Fonts: Cinzel (brand display) · Plus Jakarta Sans (UI Latin) · IBM Plex Sans Arabic (Arabic, always). Logo at public/aurion-logo.png in the header.

## Bilingual = toggle
lib/i18n holds lang 'en'|'ar' + setLang in a COOKIE so the server root layout sets <html lang dir> on first paint (no flash). <LanguageToggle> (EN | ع) in AppHeader updates document.documentElement.lang/dir. All UI text from lib/strings.ts {key:{en,ar}}; no hardcoded strings. Store numbers/dates in Western form; optionally display Arabic-Indic digits in AR via lib/digits.ts; convert AR digits to Western before parsing.

## Components
AppHeader (logo + optional title + LanguageToggle + optional StepProgress) · StepProgress(steps,current) · LanguageToggle · FieldLabel(k) · TextField · NumberField (tinted) · TextAreaField · SegmentedSelect(options=[{value,k}]) · PropertyPicker · PrimaryButton (navy/taupe, +arrow) · ToolCard.

## Definition of Done (every feature)
Real iPhone+Android · both languages, Arabic RTL correct · no console errors; loading/empty/error states · data persists + survives refresh · matches tokens + logo · no secrets committed; types regenerated · deployed.

## No-auth note
The app is open. RLS is enabled but permissive (a documented tradeoff for an internal tool). Sign-off = typed name + timestamp (drawn signatures were removed per client request; the `signatures` bucket + `*_signature_url` columns remain but unused). (Exception: /manager is gated behind a simple shared passcode from MANAGER_PASSCODE — set a cookie after unlock; the rest of the app stays open.)

## Build phases (sequential; each its own cycle)
foundation → handover wizard (3 steps + signatures + Sheets sync) → history/detail/PDF/re-sync → realtime → manager dashboard → reliability hardening → final QA + deploy. Optional: Resend email alert on cash mismatch.

## Supabase
Project ref `ksocwxsdvlvtjdlelbnf`. `properties` table seeded (al_aqeeq/as_salaam/quba), RLS on. `handovers` table + `signatures` Storage bucket + Realtime arrive with the wizard/realtime phases. Regenerate lib/supabase/types.ts after every migration. Browser uses anon key only; service_role + Google keys server-side only.
