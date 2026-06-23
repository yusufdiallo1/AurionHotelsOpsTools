"use client";

import { AppHeader } from "./AppHeader";
import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

// Foundation-phase placeholder. Each route renders its header chrome + a bilingual
// "coming soon" body until the feature lands in a later build cycle.
export function PlaceholderPage({
  titleKey,
  steps,
  currentStep,
}: {
  titleKey: StringKey;
  steps?: number;
  currentStep?: number;
}) {
  const { t } = useLang();

  return (
    <>
      <AppHeader titleKey={titleKey} steps={steps} currentStep={currentStep} />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center px-5 py-20 text-center">
        <p className="text-lg font-bold text-ink">{t(titleKey)}</p>
        <p className="mt-2 text-[15px] text-ink-soft">{t("comingSoon")}</p>
      </main>
    </>
  );
}
