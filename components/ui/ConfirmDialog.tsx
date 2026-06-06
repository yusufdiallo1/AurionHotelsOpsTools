"use client";

import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import { PrimaryButton } from "./PrimaryButton";

// Simple modal confirm. (CLAUDE.md reliability — confirm final submit, etc.)
export function ConfirmDialog({
  open,
  titleKey,
  bodyKey,
  confirmKey = "confirm",
  cancelKey = "cancel",
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  titleKey: StringKey;
  bodyKey?: StringKey;
  confirmKey?: StringKey;
  cancelKey?: StringKey;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const { t } = useLang();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[420px] rounded-aurion bg-paper p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">{t(titleKey)}</h2>
        {bodyKey && bodyKey !== titleKey ? (
          <p className="mt-2 text-[15px] text-ink-soft">{t(bodyKey)}</p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryButton
            labelKey={confirmKey}
            onClick={onConfirm}
            disabled={busy}
            showArrow={false}
          />
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[48px] rounded-aurion border border-line-strong bg-paper text-[15px] font-bold text-ink-soft disabled:opacity-60"
          >
            {t(cancelKey)}
          </button>
        </div>
      </div>
    </div>
  );
}
