// Manager-page translations — EN / AR / SV. Self-contained so Swedish lives ONLY
// on the manager dashboard without touching the global EN/AR string system.
// (Per client request 2026-06-07.)

export type ManagerLang = "en" | "ar" | "sv";

export const MANAGER_LANGS: { value: ManagerLang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ar", label: "ع" },
  { value: "sv", label: "SV" },
];

type Entry = Record<ManagerLang, string>;

const M = {
  title: { en: "Manager", ar: "المدير", sv: "Chef" },
  lock: { en: "Lock", ar: "قفل", sv: "Lås" },
  live: { en: "Live", ar: "مباشر", sv: "Live" },
  reconnecting: { en: "Reconnecting…", ar: "إعادة الاتصال…", sv: "Återansluter…" },

  // Scope toggle
  scopeWeek: { en: "This week", ar: "هذا الأسبوع", sv: "Denna vecka" },
  scopeAll: { en: "All time", ar: "كل الوقت", sv: "All tid" },

  // Controls
  date: { en: "Date", ar: "التاريخ", sv: "Datum" },
  property: { en: "Property", ar: "الفندق", sv: "Hotell" },

  // Stats
  stats: { en: "Statistics", ar: "الإحصائيات", sv: "Statistik" },
  statHandovers: { en: "Handovers", ar: "التسليمات", sv: "Överlämningar" },
  statMismatches: { en: "Mismatches", ar: "حالات الاختلاف", sv: "Avvikelser" },
  statTotalVariance: { en: "Total variance", ar: "إجمالي الفرق", sv: "Total avvikelse" },
  statAvgVariance: { en: "Avg variance", ar: "متوسط الفرق", sv: "Snittavvikelse" },

  // Missing shifts
  missingShifts: { en: "Missing shifts", ar: "الورديات الناقصة", sv: "Saknade pass" },
  missingNone: {
    en: "All shifts handed over for this day.",
    ar: "تم تسليم جميع ورديات هذا اليوم.",
    sv: "Alla pass överlämnade för denna dag.",
  },

  // Variance flags
  varianceFlags: { en: "Cash variance flags", ar: "تنبيهات فروق النقد", sv: "Kassaavvikelser" },
  varianceNone: { en: "No cash variances.", ar: "لا توجد فروق نقدية.", sv: "Inga kassaavvikelser." },

  // Recent / all handovers
  allHandovers: { en: "All handovers", ar: "كل التسليمات", sv: "Alla överlämningar" },
  recent: { en: "Recent handovers", ar: "أحدث التسليمات", sv: "Senaste överlämningar" },
  view: { en: "View", ar: "عرض", sv: "Visa" },
  loadMore: { en: "Load more", ar: "تحميل المزيد", sv: "Visa fler" },
  empty: { en: "Nothing here yet.", ar: "لا يوجد شيء بعد.", sv: "Inget här ännu." },

  // Shifts (manager-local so SV is covered)
  shiftNight: { en: "Night", ar: "ليلية", sv: "Natt" },
  shiftMorning: { en: "Morning", ar: "صباحية", sv: "Morgon" },
  shiftAfternoon: { en: "Afternoon", ar: "مسائية", sv: "Eftermiddag" },

  // Properties (names come from DB; this is the picker fallback label set)
  propAlAqeeq: { en: "Al-Aqeeq", ar: "العقيق", sv: "Al-Aqeeq" },
  propAsSalaam: { en: "As-Salaam", ar: "السلام", sv: "As-Salaam" },
} as const satisfies Record<string, Entry>;

export type ManagerKey = keyof typeof M;

export function mt(key: ManagerKey, lang: ManagerLang): string {
  return M[key][lang];
}

export function managerDir(lang: ManagerLang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}
