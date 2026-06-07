"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

type NavItem = {
  href: string;
  labelKey: StringKey;
  icon: React.ReactNode;
  match: (path: string) => boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/",
    labelKey: "navHome",
    match: (p) => p === "/",
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />
    ),
  },
  {
    href: "/new",
    labelKey: "navNew",
    match: (p) => p.startsWith("/new"),
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: "/history",
    labelKey: "navHistory",
    match: (p) => p.startsWith("/history"),
    icon: <path d="M4 5h16M4 12h16M4 19h10" />,
  },
  {
    href: "/manager",
    labelKey: "navManager",
    match: (p) => p.startsWith("/manager"),
    icon: <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />,
  },
];

// Fixed frosted-glass bottom navigation. Bilingual + RTL-aware, highlights the
// active route. (Glassmorphism — see globals.css .glass-navy)
export function BottomNav() {
  const { t } = useLang();
  const pathname = usePathname();

  // Hide on the styleguide (visual test surface).
  if (pathname.startsWith("/styleguide")) return null;

  return (
    <nav
      aria-label="Primary"
      className="glass-navy fixed inset-x-0 bottom-0 z-40 text-cream shadow-[0_-8px_30px_rgba(19,30,51,0.25)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex w-full max-w-[480px] items-stretch justify-around px-2">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[60px] flex-col items-center justify-center gap-1 py-2"
              >
                <span
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    active ? "bg-gold text-navy-deep" : "text-cream/70",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    {item.icon}
                  </svg>
                </span>
                <span
                  className={[
                    "text-[11px] font-bold leading-none",
                    active ? "text-cream" : "text-cream/70",
                  ].join(" ")}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
