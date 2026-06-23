"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { signOut } from "@/lib/sign-out";

// Red sign-out button with a confirmation dialog.
export function SignOutButton() {
  const { t, dir } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("signOut")}
        className="rounded-full bg-red-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-red-700"
      >
        {t("signOut")}
      </button>

      {open ? (
        <div
          dir={dir}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-5"
          role="alertdialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[340px] rounded-aurion bg-paper p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[17px] font-bold text-ink">{t("confirmSignOutTitle")}</h2>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => signOut()}
                className="min-h-[50px] rounded-aurion bg-red-600 text-[16px] font-bold text-white"
              >
                {t("signOut")}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[50px] rounded-aurion border border-line-strong bg-paper text-[16px] font-bold text-ink"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
