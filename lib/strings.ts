// Single source of truth for all UI text. No hardcoded strings in components,
// including placeholders. (CLAUDE.md §6)
//
// Shape: { key: { en, ar } }. Add keys per feature; keep keys grouped by area.

import type { Lang } from "@/lib/i18n/config";

export type StringEntry = Record<Lang, string>;

export const strings = {
  // Brand / shell
  brand: { en: "AURION", ar: "AURION" },
  appName: { en: "Shift Handover", ar: "تسليم الوردية" },

  // Language toggle
  langEn: { en: "EN", ar: "EN" },
  langAr: { en: "ع", ar: "ع" },

  // Home navigation cards
  navNewTitle: { en: "New Handover", ar: "تسليم جديد" },
  navNewDesc: {
    en: "Start a new end-of-shift handover.",
    ar: "ابدأ تسليم وردية جديدة.",
  },
  navHistoryTitle: { en: "History", ar: "السجل" },
  navHistoryDesc: {
    en: "Browse and search past handovers.",
    ar: "تصفّح التسليمات السابقة وابحث فيها.",
  },
  navManagerTitle: { en: "Manager", ar: "المدير" },
  navManagerDesc: {
    en: "Daily overview, missing shifts, cash flags.",
    ar: "نظرة يومية، الورديات الناقصة، تنبيهات النقد.",
  },

  // Bottom nav (short labels)
  navHome: { en: "Home", ar: "الرئيسية" },
  navNew: { en: "New", ar: "جديد" },
  navHistory: { en: "History", ar: "السجل" },
  navManager: { en: "Manager", ar: "المدير" },

  // Placeholder (foundation phase — features land in later cycles)
  comingSoon: { en: "Coming soon.", ar: "قريبًا." },

  // Generic actions / states (shared)
  continue: { en: "Continue", ar: "متابعة" },
  back: { en: "Back", ar: "رجوع" },
  save: { en: "Save", ar: "حفظ" },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  empty: { en: "Nothing here yet.", ar: "لا يوجد شيء بعد." },
  errorGeneric: {
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ ما. حاول مرة أخرى.",
  },

  // Properties (CLAUDE.md §7) — keys map to the `properties` table slugs.
  propAlAqeeq: { en: "Al-Aqeeq", ar: "العقيق" },
  propAsSalaam: { en: "As-Salaam", ar: "السلام" },
  propertyLabel: { en: "Property", ar: "الفندق" },

  // Occupancy
  occupancyLabel: { en: "Occupancy", ar: "نسبة الإشغال" },
  ofRooms: { en: "of", ar: "من" },
  roomsTotal: { en: "rooms", ar: "غرفة" },

  // Shifts
  shiftNight: { en: "Night", ar: "ليلية" },
  shiftMorning: { en: "Morning", ar: "صباحية" },
  shiftAfternoon: { en: "Afternoon", ar: "مسائية" },
  shiftLabel: { en: "Shift", ar: "الوردية" },

  // Styleguide demo labels (visual test only)
  sgTitle: { en: "Style Guide", ar: "دليل الأنماط" },
  sgSubtitle: {
    en: "Every shared component, rendered. Toggle EN/AR to check RTL.",
    ar: "كل مكوّن مشترك معروضًا. بدّل بين الإنجليزية والعربية للتحقق من الاتجاه.",
  },
  demoName: { en: "Your name", ar: "الاسم" },
  demoNamePlaceholder: { en: "e.g. Yusuf", ar: "مثال: يوسف" },
  demoCash: { en: "Cash in drawer (SAR)", ar: "النقد في الدرج (ر.س)" },
  demoNotes: { en: "Notes", ar: "ملاحظات" },
  demoNotesPlaceholder: {
    en: "Anything the next shift should know…",
    ar: "أي شيء ينبغي أن تعرفه الوردية التالية…",
  },

  // ── Handover wizard ──────────────────────────────────────────────
  // Step 1 — outgoing
  step1Title: { en: "End of shift", ar: "نهاية الوردية" },
  fieldDate: { en: "Date", ar: "التاريخ" },
  fieldYourName: { en: "Outgoing reception name", ar: "اسم موظف الاستقبال المُسلِّم" },
  fieldYourNamePlaceholder: { en: "Outgoing receptionist", ar: "موظف الاستقبال المُسلِّم" },
  fieldRooms: { en: "Rooms occupied", ar: "الغرف المشغولة" },
  fieldCashDrawer: { en: "Cash in drawer (SAR)", ar: "النقد في الدرج (ر.س)" },
  fieldPending: { en: "Pending requests", ar: "الطلبات المعلّقة" },
  fieldPendingPlaceholder: { en: "Guest requests not yet handled…", ar: "طلبات النزلاء غير المنجزة…" },
  fieldMaintenance: { en: "Maintenance issues", ar: "أعطال الصيانة" },
  fieldMaintenancePlaceholder: { en: "Anything broken or being fixed…", ar: "أي عطل أو إصلاح جارٍ…" },
  fieldNotes: { en: "Notes", ar: "ملاحظات" },
  fieldNotesPlaceholder: { en: "Anything the next shift should know…", ar: "أي شيء ينبغي أن تعرفه الوردية التالية…" },

  step1Submit: { en: "Done — hand to incoming", ar: "تم — سلّم للمستلم" },
  handToIncoming: {
    en: "Hand the phone to the incoming receptionist.",
    ar: "سلّم الهاتف لموظف الاستقبال المستلم.",
  },

  // Step 2 — incoming
  step2Title: { en: "Receive shift", ar: "استلام الوردية" },
  outgoingSummary: { en: "Outgoing summary", ar: "ملخّص الوردية المُسلَّمة" },
  fieldIncomingName: { en: "Incoming reception name", ar: "اسم موظف الاستقبال المستلم" },
  fieldIncomingNamePlaceholder: { en: "Incoming receptionist", ar: "موظف الاستقبال المستلم" },
  fieldCashRecount: { en: "Recount the cash drawer (SAR)", ar: "أعد عدّ النقد في الدرج (ر.س)" },
  expectedLabel: { en: "Expected", ar: "المتوقَّع" },
  countedLabel: { en: "Counted", ar: "المعدود" },
  varianceLabel: { en: "Variance", ar: "الفرق" },
  cashMismatchTitle: { en: "Cash mismatch", ar: "اختلاف في النقد" },
  cashMismatchBody: {
    en: "The recount does not match the drawer amount. Add a note explaining the difference before continuing.",
    ar: "العدّ لا يطابق مبلغ الدرج. أضف ملاحظة توضّح الفرق قبل المتابعة.",
  },
  fieldVarianceNote: { en: "Variance note (required)", ar: "ملاحظة الفرق (مطلوبة)" },
  fieldVarianceNotePlaceholder: { en: "Why is the cash different?", ar: "لماذا يختلف النقد؟" },
  step2Submit: { en: "Confirm handover", ar: "تأكيد التسليم" },

  // Step 3 — confirm / success
  successTitle: { en: "Handover complete", ar: "اكتمل التسليم" },
  successBody: {
    en: "Saved. Both receptionists are recorded.",
    ar: "تم الحفظ. تم تسجيل كلا الموظفين.",
  },
  syncRetryNote: {
    en: "Saved safely. Syncing to the sheet will retry automatically.",
    ar: "تم الحفظ بأمان. ستتم إعادة المزامنة مع الجدول تلقائيًا.",
  },
  newHandover: { en: "New handover", ar: "تسليم جديد" },

  // Status / sync
  statusPending: { en: "Awaiting incoming", ar: "بانتظار المستلم" },
  statusCompleted: { en: "Completed", ar: "مكتمل" },
  saving: { en: "Saving…", ar: "جارٍ الحفظ…" },
  notFound: { en: "Handover not found.", ar: "التسليم غير موجود." },
  alreadyCompleted: { en: "This handover is already completed.", ar: "هذا التسليم مكتمل بالفعل." },

  // ── History list ─────────────────────────────────────────────────
  historyTitle: { en: "History", ar: "السجل" },
  filters: { en: "Filters", ar: "عوامل التصفية" },
  filterAll: { en: "All", ar: "الكل" },
  filterFrom: { en: "From", ar: "من" },
  filterTo: { en: "To", ar: "إلى" },
  filterStatus: { en: "Status", ar: "الحالة" },
  filterMismatchOnly: { en: "Cash mismatch only", ar: "اختلاف النقد فقط" },
  clearFilters: { en: "Clear filters", ar: "مسح التصفية" },
  loadMore: { en: "Load more", ar: "تحميل المزيد" },
  noHandovers: { en: "No handovers match.", ar: "لا توجد تسليمات مطابقة." },
  toLabel: { en: "to", ar: "إلى" },

  // Name search + date presets
  filterName: { en: "Reception name", ar: "اسم موظف الاستقبال" },
  filterNamePlaceholder: { en: "Search outgoing or incoming…", ar: "ابحث في المُسلِّم أو المستلم…" },
  rangeToday: { en: "Today", ar: "اليوم" },
  range7d: { en: "7 days", ar: "٧ أيام" },
  range30d: { en: "30 days", ar: "٣٠ يومًا" },
  rangeCustom: { en: "Custom", ar: "مخصّص" },
  rangeAll: { en: "All", ar: "الكل" },

  // History summary (aggregates from saved data)
  resultsCount: { en: "handovers", ar: "تسليمات" },
  totalDrawer: { en: "Total cash in drawer", ar: "إجمالي النقد في الدرج" },

  // Home search
  searchReception: { en: "Find a receptionist", ar: "ابحث عن موظف استقبال" },
  searchReceptionPlaceholder: { en: "Type a name…", ar: "اكتب اسمًا…" },
  search: { en: "Search", ar: "بحث" },

  // Sync badges
  syncSynced: { en: "Synced", ar: "متزامن" },
  syncPending: { en: "Pending sync", ar: "بانتظار المزامنة" },
  syncFailed: { en: "Sync failed", ar: "فشلت المزامنة" },

  // ── Detail ───────────────────────────────────────────────────────
  detailTitle: { en: "Handover detail", ar: "تفاصيل التسليم" },
  sectionOutgoing: { en: "Outgoing", ar: "المُسلِّم" },
  sectionIncoming: { en: "Incoming", ar: "المستلم" },
  sectionCash: { en: "Cash", ar: "النقد" },
  sectionSync: { en: "Sheets sync", ar: "مزامنة الجدول" },
  signedAt: { en: "Recorded at", ar: "سُجّل في" },
  noVariance: { en: "Balanced", ar: "مطابق" },
  resync: { en: "Re-sync to Sheets", ar: "إعادة المزامنة مع الجدول" },
  resyncing: { en: "Syncing…", ar: "جارٍ المزامنة…" },
  resyncOk: { en: "Synced successfully.", ar: "تمت المزامنة بنجاح." },
  resyncFailed: { en: "Sync failed. Try again later.", ar: "فشلت المزامنة. حاول لاحقًا." },
  syncedAtLabel: { en: "Synced at", ar: "تمت المزامنة في" },
  downloadPdf: { en: "Download PDF", ar: "تنزيل PDF" },
  preparingPdf: { en: "Preparing…", ar: "جارٍ التجهيز…" },

  // ── Realtime ─────────────────────────────────────────────────────
  live: { en: "Live", ar: "مباشر" },
  reconnecting: { en: "Reconnecting…", ar: "إعادة الاتصال…" },

  // ── Manager: passcode gate ───────────────────────────────────────
  managerTitle: { en: "Manager", ar: "المدير" },
  managerLocked: { en: "Manager access", ar: "دخول المدير" },
  passcodeLabel: { en: "Passcode", ar: "رمز الدخول" },
  passcodePlaceholder: { en: "Enter manager passcode", ar: "أدخل رمز دخول المدير" },
  unlock: { en: "Unlock", ar: "فتح" },
  unlocking: { en: "Unlocking…", ar: "جارٍ الفتح…" },
  wrongPasscode: { en: "Incorrect passcode.", ar: "رمز الدخول غير صحيح." },

  // ── Manager: dashboard ───────────────────────────────────────────
  managerToday: { en: "Today", ar: "اليوم" },
  managerDate: { en: "Date", ar: "التاريخ" },
  missingShifts: { en: "Missing shifts", ar: "الورديات الناقصة" },
  missingShiftsNone: {
    en: "All shifts handed over for the selected day.",
    ar: "تم تسليم جميع ورديات اليوم المحدد.",
  },
  varianceFlags: { en: "Cash variance flags", ar: "تنبيهات فروق النقد" },
  varianceFlagsNone: { en: "No cash variances.", ar: "لا توجد فروق نقدية." },
  quickStats: { en: "This week", ar: "هذا الأسبوع" },
  statHandovers: { en: "Handovers", ar: "التسليمات" },
  statTotalVariance: { en: "Total variance", ar: "إجمالي الفرق" },
  statAvgVariance: { en: "Avg variance", ar: "متوسط الفرق" },
  statMismatches: { en: "Mismatches", ar: "حالات الاختلاف" },
  recentHandovers: { en: "Recent handovers", ar: "أحدث التسليمات" },
  viewDetail: { en: "View", ar: "عرض" },
  logout: { en: "Lock", ar: "قفل" },

  // ── Reliability ──────────────────────────────────────────────────
  draftFound: { en: "Resume your unsaved handover?", ar: "استئناف التسليم غير المحفوظ؟" },
  draftRestore: { en: "Resume", ar: "استئناف" },
  draftDiscard: { en: "Discard", ar: "تجاهل" },
  dupTitle: { en: "Possible duplicate", ar: "احتمال تكرار" },
  dupBody: {
    en: "A handover for this property, date and shift already exists.",
    ar: "يوجد بالفعل تسليم لهذا الفندق والتاريخ والوردية.",
  },
  dupOpen: { en: "Open existing", ar: "فتح الموجود" },
  dupProceed: { en: "Create anyway", ar: "إنشاء على أي حال" },
  offlineBanner: {
    en: "You are offline. You can keep typing — submit when back online.",
    ar: "أنت غير متصل. يمكنك المتابعة بالكتابة — أرسل عند عودة الاتصال.",
  },
  offlineSubmit: { en: "Offline — can't submit", ar: "غير متصل — لا يمكن الإرسال" },
  confirmSubmitTitle: { en: "Confirm handover?", ar: "تأكيد التسليم؟" },
  confirmSubmitBody: {
    en: "This completes the handover and records it.",
    ar: "هذا يُكمل التسليم ويسجّله.",
  },
  confirm: { en: "Confirm", ar: "تأكيد" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  leaveWarning: {
    en: "Leave this handover? Your entries on this screen will be lost.",
    ar: "مغادرة هذا التسليم؟ ستفقد ما أدخلته في هذه الشاشة.",
  },
} as const satisfies Record<string, StringEntry>;

export type StringKey = keyof typeof strings;

export function translate(key: StringKey, lang: Lang): string {
  return strings[key][lang];
}
