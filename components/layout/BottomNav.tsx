"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import type { StringKey } from "@/lib/strings";

type NavItem = {
  href: string;
  labelKey: StringKey;
  icon: React.ReactNode;
  match: (path: string) => boolean;
  adminOnly?: boolean;
  receptionistOnly?: boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/",
    labelKey: "navHome",
    match: (p) => p === "/",
    icon: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  },
  {
    href: "/new",
    labelKey: "navNew",
    match: (p) => p.startsWith("/new"),
    icon: <path d="M12 5v14M5 12h14" />,
    receptionistOnly: true,
  },
  {
    href: "/history",
    labelKey: "navHistory",
    match: (p) => p.startsWith("/history"),
    icon: <path d="M4 5h16M4 12h16M4 19h10" />,
    adminOnly: true,
  },
  {
    href: "/manager",
    labelKey: "navManager",
    match: (p) => p.startsWith("/manager"),
    icon: <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />,
    adminOnly: true,
  },
];

// Responsive liquid-glass navigation:
//  - mobile: fixed bottom bar
//  - desktop (md+): fixed top, centered glass pill
// A solid glass "slider" animates to the active tab. Bilingual + RTL-aware.
export function AppNav() {
  const { t, dir } = useLang();
  const { role } = useAuth();
  const pathname = usePathname();

  if (pathname.startsWith("/styleguide") || pathname.startsWith("/login")) return null;

  // Receptionists see Home + New; admins see Home + History + Manager (no New —
  // receptionists file handovers).
  const items = ITEMS.filter((it) => {
    if (it.adminOnly) return role === "admin";
    if (it.receptionistOnly) return role === "receptionist";
    return true;
  });
  const activeIndex = Math.max(
    0,
    items.findIndex((it) => it.match(pathname)),
  );
  const count = items.length;
  // Slider offset: in RTL the first item sits on the right, so move the slider
  // the other way.
  const pct = activeIndex * 100;
  const sliderTransform =
    dir === "rtl" ? `translateX(${-pct}%)` : `translateX(${pct}%)`;

  return (
    <nav
      aria-label="Primary"
      className={[
        "fixed inset-x-0 z-40 flex justify-center px-3",
        "bottom-0 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2", // mobile: bottom
        "md:bottom-auto md:top-3 md:pb-0 md:pt-0", // desktop: top
      ].join(" ")}
    >
      <div className="relative w-full max-w-[480px] rounded-[22px] border border-gold/25 bg-navy p-1.5 shadow-[0_8px_30px_rgba(19,30,51,0.45)] md:w-auto">
        {/* Animated solid glass slider behind the active item */}
        <div
          className="pointer-events-none absolute inset-y-1.5 start-1.5 rounded-[16px] bg-gold shadow-md transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.75rem) / ${count})`,
            transform: sliderTransform,
          }}
          aria-hidden
        />

        <ul
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {items.map((item, i) => {
            const active = i === activeIndex;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-3 py-1.5 transition-colors md:min-h-[44px] md:flex-row md:gap-2",
                    active ? "text-navy-deep" : "text-cream/75 hover:text-cream",
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
                  <span className="text-[11px] font-bold leading-none md:text-[14px]">
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

// Back-compat alias (was BottomNav).
export const BottomNav = AppNav;
