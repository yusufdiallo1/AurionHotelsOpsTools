"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

// Landing-page card linking to a tool. (CLAUDE.md §8)
export function ToolCard({
  href,
  titleKey,
  descKey,
  icon,
}: {
  href: string;
  titleKey: StringKey;
  descKey: StringKey;
  icon?: React.ReactNode;
}) {
  const { t, dir } = useLang();
  const arrow = dir === "rtl" ? "←" : "→";

  return (
    <Link
      href={href}
      className="glass flex items-center gap-4 rounded-aurion p-4 shadow-sm transition-all hover:border-gold-deep hover:shadow-md"
    >
      {icon ? (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-aurion bg-gold-tint/80 text-2xl text-gold-deep">
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[17px] font-bold text-ink">{t(titleKey)}</span>
        <span className="text-[14px] text-ink-soft">{t(descKey)}</span>
      </span>
      <span aria-hidden className="text-xl text-gold-deep">
        {arrow}
      </span>
    </Link>
  );
}
