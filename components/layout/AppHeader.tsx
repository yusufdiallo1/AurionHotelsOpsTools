"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/sign-out";
import type { StringKey } from "@/lib/strings";
import { LanguageToggle } from "./LanguageToggle";
import { StepProgress } from "./StepProgress";

// Navy app bar: logo + optional title/property, the language toggle, and an
// optional step indicator below. (CLAUDE.md §5, §8)
export function AppHeader({
  titleKey,
  propertyKey,
  steps,
  currentStep,
}: {
  titleKey?: StringKey;
  propertyKey?: StringKey;
  steps?: number;
  currentStep?: number;
}) {
  const { t } = useLang();
  const { userId } = useAuth();
  const showSteps = typeof steps === "number" && typeof currentStep === "number";

  return (
    <header className="glass-navy sticky top-0 z-30 text-cream md:static">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/aurion-logo.png"
            alt="Aurion"
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-full bg-cream object-contain p-1"
          />
          <span className="flex flex-col leading-tight">
            {titleKey ? (
              <span className="text-[15px] font-bold">{t(titleKey)}</span>
            ) : (
              <span className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-[0.12em]">
                AURION
              </span>
            )}
            {propertyKey ? (
              <span className="text-[13px] text-gold-soft">{t(propertyKey)}</span>
            ) : null}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          {userId ? (
            <button
              type="button"
              onClick={signOut}
              aria-label={t("signOut")}
              className="rounded-full bg-white/10 px-3 py-2 text-[12px] font-bold text-cream/80 hover:text-cream"
            >
              {t("signOut")}
            </button>
          ) : null}
        </div>
      </div>

      {showSteps ? (
        <div className="mx-auto flex w-full max-w-[480px] justify-center px-5 pb-4">
          <StepProgress steps={steps} current={currentStep} />
        </div>
      ) : null}
    </header>
  );
}
