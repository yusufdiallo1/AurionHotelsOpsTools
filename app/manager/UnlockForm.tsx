"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useLang } from "@/lib/i18n";

// Passcode unlock screen for /manager. On success the server sets the cookie and
// we refresh so the server component re-renders the dashboard.
export function UnlockForm() {
  const { t } = useLang();
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleUnlock() {
    if (!passcode || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/manager-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError(true);
        setSubmitting(false);
      }
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-5 px-5 py-16">
      <h1 className="text-center text-xl font-bold text-ink">{t("managerLocked")}</h1>
      <div>
        <FieldLabel k="passcodeLabel" htmlFor="passcode" />
        <input
          id="passcode"
          type="password"
          inputMode="text"
          autoComplete="off"
          value={passcode}
          onChange={(e) => {
            setPasscode(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUnlock();
          }}
          placeholder={t("passcodePlaceholder")}
          className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink placeholder:text-muted outline-none focus:border-gold-deep"
        />
      </div>
      {error ? (
        <p role="alert" className="text-[14px] font-medium text-red-700">
          {t("wrongPasscode")}
        </p>
      ) : null}
      <PrimaryButton
        labelKey={submitting ? "unlocking" : "unlock"}
        onClick={handleUnlock}
        disabled={!passcode || submitting}
        showArrow={false}
      />
    </main>
  );
}
