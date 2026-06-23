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
  lock: { en: "Sign out", ar: "تسجيل الخروج", sv: "Logga ut" },
  greeting: { en: "Welcome", ar: "مرحبًا", sv: "Välkommen" },
  employees: { en: "Employees", ar: "الموظفون", sv: "Anställda" },
  live: { en: "Live", ar: "مباشر", sv: "Live" },
  reconnecting: { en: "Reconnecting…", ar: "إعادة الاتصال…", sv: "Återansluter…" },

  // Scope toggle
  scopeDay: { en: "Day", ar: "يوم", sv: "Dag" },
  scopeWeek: { en: "Week", ar: "أسبوع", sv: "Vecka" },
  scopeMonth: { en: "Month", ar: "شهر", sv: "Månad" },
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

  // Hilton-grade dashboard
  overview: { en: "Overview", ar: "نظرة عامة", sv: "Översikt" },
  cashInDrawer: { en: "Cash in drawer", ar: "النقد في الدرج", sv: "Kassa i lådan" },
  occupancy: { en: "Occupancy", ar: "نسبة الإشغال", sv: "Beläggning" },
  roomsOccupied: { en: "Rooms occupied", ar: "الغرف المشغولة", sv: "Belagda rum" },
  acrossProperties: { en: "across all properties", ar: "في كل الفنادق", sv: "över alla hotell" },
  byProperty: { en: "By property", ar: "حسب الفندق", sv: "Per hotell" },
  rooms: { en: "rooms", ar: "غرفة", sv: "rum" },
  lastUpdated: { en: "Last update", ar: "آخر تحديث", sv: "Senast uppdaterad" },
  noData: { en: "No handovers yet", ar: "لا توجد تسليمات بعد", sv: "Inga överlämningar än" },

  // Auto-lock
  autoLocked: {
    en: "Locked for security after inactivity.",
    ar: "تم القفل تلقائيًا بعد فترة خمول.",
    sv: "Låst av säkerhetsskäl efter inaktivitet.",
  },

  // Activity / audit log
  activity: { en: "Activity", ar: "النشاط", sv: "Aktivitet" },
  activityNone: { en: "No activity yet.", ar: "لا يوجد نشاط بعد.", sv: "Ingen aktivitet än." },
  actCreated: { en: "New handover started", ar: "بدأ تسليم جديد", sv: "Ny överlämning startad" },
  actCompleted: { en: "Handover completed", ar: "اكتمل التسليم", sv: "Överlämning slutförd" },
  actSynced: { en: "Synced to Sheets", ar: "تمت المزامنة مع الجدول", sv: "Synkad till Sheets" },
  actDrive: { en: "Archived to Drive", ar: "تم الحفظ في Drive", sv: "Arkiverad till Drive" },
  viewItem: { en: "View", ar: "عرض", sv: "Visa" },
  earlyLeaves: { en: "Early leaves today", ar: "المغادرات المبكرة اليوم", sv: "Tidiga avgångar idag" },
  earlyLeavesNone: { en: "No early leaves today.", ar: "لا توجد مغادرات مبكرة اليوم.", sv: "Inga tidiga avgångar idag." },
  leftEarly: { en: "requested early leave", ar: "طلب مغادرة مبكرة", sv: "begärde tidig avgång" },

  // Passcodes (per-hotel shared logins)
  passcodes: { en: "Passcodes", ar: "رموز الدخول", sv: "Lösenkoder" },
  passcodesHint: {
    en: "Shared per-hotel login codes. Tap to view or change.",
    ar: "رموز الدخول المشتركة لكل فندق. اضغط للعرض أو التغيير.",
    sv: "Delade inloggningskoder per hotell. Tryck för att visa eller ändra.",
  },
  show: { en: "Show", ar: "عرض", sv: "Visa" },
  hide: { en: "Hide", ar: "إخفاء", sv: "Dölj" },
  changePasscode: { en: "Change passcode", ar: "تغيير الرمز", sv: "Ändra kod" },
  newPasscode: { en: "New passcode", ar: "رمز جديد", sv: "Ny kod" },
  save: { en: "Save", ar: "حفظ", sv: "Spara" },
  saving: { en: "Saving…", ar: "جارٍ الحفظ…", sv: "Sparar…" },
  cancel: { en: "Cancel", ar: "إلغاء", sv: "Avbryt" },
  passcodeUpdated: { en: "Passcode updated.", ar: "تم تحديث الرمز.", sv: "Koden uppdaterad." },
  passcodeError: { en: "Could not update passcode.", ar: "تعذّر تحديث الرمز.", sv: "Kunde inte uppdatera koden." },
} as const satisfies Record<string, Entry>;

export type ManagerKey = keyof typeof M;

export function mt(key: ManagerKey, lang: ManagerLang): string {
  return M[key][lang];
}

export function managerDir(lang: ManagerLang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}
