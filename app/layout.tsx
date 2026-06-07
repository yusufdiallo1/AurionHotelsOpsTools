import type { Metadata, Viewport } from "next";
import { Cinzel, Plus_Jakarta_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { DEFAULT_LANG, LANG_COOKIE, isLang, dirFor } from "@/lib/i18n/config";
import { SyncSweeper } from "@/components/SyncSweeper";
import { AppNav } from "@/components/layout";
import { getSessionProfile } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth-context";
import { NotificationListener } from "@/components/NotificationListener";

// Brand display — the AURION wordmark / headings. (CLAUDE.md §5)
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// UI Latin.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Arabic — always loaded, never a system fallback.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aurion Hotel Ops Tools",
  description: "Internal operations tools for Aurion Hotels.",
};

export const viewport: Viewport = {
  // Mobile-first; allow user zoom but render inputs ≥16px to avoid iOS auto-zoom.
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B2A47",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read the persisted language so the first server paint sets lang/dir — no flash.
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANG_COOKIE)?.value;
  const lang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;
  const dir = dirFor(lang);

  const session = await getSessionProfile();
  const authValue = {
    userId: session?.userId ?? null,
    role: session?.role ?? null,
    fullName: session?.profile.full_name ?? "",
    propertyId: session?.profile.property_id ?? null,
    propertyCode: session?.propertyCode ?? null,
    shiftType: session?.profile.shift_type ?? null,
  };
  const signedIn = !!session;

  return (
    <html
      lang={lang}
      dir={dir}
      className={[
        cinzel.variable,
        jakarta.variable,
        plexArabic.variable,
        lang === "ar" ? "font-ar" : "",
        "h-full antialiased",
      ].join(" ")}
    >
      {/* pb-nav clears the bottom bar on mobile; md:pt-20 clears the top pill on desktop. */}
      {/* pb-nav clears the bottom bar on mobile; md:pt-20 clears the top pill on desktop.
          Only signed-in users see the nav (which adds the spacing), so login is full-bleed. */}
      <body className={`min-h-full bg-cream text-ink ${signedIn ? "pb-nav md:pb-0 md:pt-20" : ""}`}>
        <LanguageProvider initialLang={lang}>
          <AuthProvider value={authValue}>
            {signedIn ? <SyncSweeper /> : null}
            {children}
            {signedIn ? (
              <>
                <NotificationListener />
                <AppNav />
              </>
            ) : null}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
