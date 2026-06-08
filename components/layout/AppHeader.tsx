"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import type { StringKey } from "@/lib/strings";
import { LanguageToggle } from "./LanguageToggle";
import { SignOutButton } from "./SignOutButton";
import { NavLinks } from "./BottomNav";
import { StepProgress } from "./StepProgress";

// Navy app bar: logo + optional title/property, the language toggle, and an
// optional step indicator below. (CLAUDE.md §5, §8)
export function AppHeader({
  titleKey,
  propertyKey,
  steps,
  currentStep,
  hideLanguageToggle = false,
}: {
  titleKey?: StringKey;
  propertyKey?: StringKey;
  steps?: number;
  currentStep?: number;
  // The manager page renders its own EN/ع/SV picker, so it hides this one.
  hideLanguageToggle?: boolean;
}) {
  const { t } = useLang();
  const { userId, fullName } = useAuth();
  const showSteps = typeof steps === "number" && typeof currentStep === "number";

  // One unified top bar: logo (left) · nav (center, desktop) · actions (right).
  // On mobile the nav lives in the bottom bar instead (AppNav).
  return (
    <header className="sticky top-0 z-30 bg-navy text-cream shadow-[0_2px_12px_rgba(19,30,51,0.25)]">
      <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-5 py-2.5">
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
            ) : fullName ? (
              <span className="text-[12px] text-gold-soft">{fullName}</span>
            ) : null}
          </span>
        </Link>

        {/* Centered nav — desktop only (mobile uses the bottom bar) */}
        {userId ? (
          <div className="hidden md:block">
            <NavLinks variant="embedded" />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {hideLanguageToggle ? null : <LanguageToggle />}
          {userId ? <SignOutButton /> : null}
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
