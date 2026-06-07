"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { LanguageToggle } from "@/components/layout";

export function LoginForm() {
  const { t } = useLang();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleSignIn() {
    if (!email || !password || submitting) return;
    setSubmitting(true);
    setError(false);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setError(true);
      setSubmitting(false);
      return;
    }
    // Full reload so middleware + server layout pick up the new session.
    window.location.assign(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5 py-10">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <div className="flex flex-col items-center gap-3">
        <Image
          src="/aurion-logo.png"
          alt="Aurion"
          width={64}
          height={64}
          priority
          className="h-16 w-16 rounded-full bg-cream object-contain p-1.5 shadow-sm"
        />
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[0.15em] text-navy">
          AURION
        </h1>
        <p className="text-[14px] text-ink-soft">{t("loginSubtitle")}</p>
      </div>

      <div className="glass flex flex-col gap-4 rounded-aurion p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink">{t("emailLabel")}</span>
          <input
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(false);
            }}
            placeholder={t("emailPlaceholder")}
            className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink placeholder:text-muted outline-none focus:border-gold-deep"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink">{t("passwordLabel")}</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSignIn();
            }}
            className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink outline-none focus:border-gold-deep"
          />
        </label>

        {error ? (
          <p role="alert" className="text-[14px] font-medium text-red-700">
            {t("loginError")}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={!email || !password || submitting}
          className="min-h-[52px] w-full rounded-aurion bg-navy text-[17px] font-bold text-cream disabled:bg-line-strong disabled:text-[#8A8270]"
        >
          {submitting ? t("signingIn") : t("signIn")}
        </button>
      </div>
    </main>
  );
}
