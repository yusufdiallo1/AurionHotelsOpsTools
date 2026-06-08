"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/layout";
import { PasswordField } from "@/components/ui";
import type { StringKey } from "@/lib/strings";

export function LoginForm() {
  const { t } = useLang();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<StringKey | null>(null);

  async function handleSignIn() {
    if (!identifier || !password || submitting) return;
    setSubmitting(true);
    setErrorKey(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier.trim(), password }),
      });
      const json = await res.json();
      if (json.ok) {
        // Full reload so middleware + server layout pick up the new session.
        window.location.assign(next);
        return;
      }
      setErrorKey(
        json.reason === "not_found"
          ? "errUserNotFound"
          : json.reason === "locked"
            ? "errLocked"
            : json.reason === "wrong_password"
              ? "errWrongPassword"
              : "loginError",
      );
    } catch {
      setErrorKey("loginError");
    } finally {
      setSubmitting(false);
    }
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
          <span className="text-[13px] font-bold text-ink">{t("usernameLabel")}</span>
          <input
            type="text"
            dir="ltr"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setErrorKey(null);
            }}
            placeholder={t("usernamePlaceholder")}
            className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink placeholder:text-muted outline-none focus:border-gold-deep"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink">{t("passwordLabel")}</span>
          <PasswordField
            value={password}
            onChange={(v) => {
              setPassword(v);
              setErrorKey(null);
            }}
            onEnter={handleSignIn}
          />
        </label>

        {errorKey ? (
          <p role="alert" className="text-[14px] font-medium text-red-700">
            {t(errorKey)}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={!identifier || !password || submitting}
          className="min-h-[52px] w-full rounded-aurion bg-navy text-[17px] font-bold text-cream disabled:bg-line-strong disabled:text-[#8A8270]"
        >
          {submitting ? t("signingIn") : t("signIn")}
        </button>
      </div>
    </main>
  );
}
