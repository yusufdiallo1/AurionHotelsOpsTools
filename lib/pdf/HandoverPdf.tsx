/* eslint-disable jsx-a11y/alt-text -- @react-pdf <Image> is a PDF primitive, not an HTML <img> */
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Lang } from "@/lib/i18n/config";
import { translate, type StringKey } from "@/lib/strings";
import {
  SHIFT_OPTIONS,
  formatDate,
  formatSAR,
  hasCashMismatch,
  type Handover,
} from "@/lib/handover";
import { displayDigits } from "@/lib/digits";

// Register an Arabic-capable font so Arabic shapes + renders (no missing glyphs).
// IBM Plex Sans Arabic also covers Latin, so one family serves both languages.
// Served from /public at runtime. Generation happens client-side, so these must be
// URLs the browser can fetch — not filesystem paths.
Font.register({
  family: "PlexArabic",
  fonts: [
    { src: "/fonts/IBMPlexSansArabic-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/IBMPlexSansArabic-Bold.ttf", fontWeight: 700 },
  ],
});

const NAVY = "#1B2A47";
const GOLD = "#A4924E";
const INK = "#211F1A";
const INK_SOFT = "#57514A";
const LINE = "#E7DECC";
const RED = "#B91C1C";

export type HandoverPdfData = Handover & {
  propertyName: string;
};

function buildStyles(rtl: boolean) {
  const align = rtl ? "right" : "left";
  const flexDir = rtl ? "row-reverse" : "row";
  return StyleSheet.create({
    page: {
      fontFamily: "PlexArabic",
      fontSize: 11,
      color: INK,
      paddingTop: 0,
      paddingBottom: 56,
      paddingHorizontal: 0,
      direction: rtl ? "rtl" : "ltr",
    },
    body: { paddingHorizontal: 40, paddingTop: 22 },
    // Gold accent bar across the very top (brand).
    accent: { height: 6, backgroundColor: GOLD },
    // Navy header band, like the app header.
    headerBand: {
      backgroundColor: NAVY,
      flexDirection: flexDir,
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 18,
      paddingHorizontal: 40,
    },
    headerText: { flexDirection: "column" },
    brand: { fontSize: 22, fontWeight: 700, color: "#F6F1E7", letterSpacing: 3 },
    title: { fontSize: 11, color: "#BBA46A", marginTop: 2, textAlign: align },
    logoCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "#F6F1E7",
      alignItems: "center",
      justifyContent: "center",
    },
    logo: { width: 38, height: 38 },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderTopColor: LINE,
      paddingVertical: 12,
      paddingHorizontal: 40,
      flexDirection: flexDir,
      justifyContent: "space-between",
    },
    footerText: { fontSize: 8, color: INK_SOFT },
    section: { marginBottom: 14 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: NAVY,
      marginBottom: 6,
      textAlign: align,
    },
    row: {
      flexDirection: flexDir,
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: LINE,
      paddingVertical: 4,
    },
    label: { color: INK_SOFT, textAlign: align },
    value: { fontWeight: 700, textAlign: rtl ? "left" : "right", maxWidth: "60%" },
    valueRed: { fontWeight: 700, color: RED, textAlign: rtl ? "left" : "right" },
    note: {
      marginTop: 4,
      padding: 6,
      backgroundColor: "#FEF2F2",
      borderRadius: 6,
      color: RED,
      textAlign: align,
    },
  });
}

type Styles = ReturnType<typeof buildStyles>;

function PdfRow({
  styles,
  label,
  value,
  red,
}: {
  styles: Styles;
  label: string;
  value: string;
  red?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={red ? styles.valueRed : styles.value}>{value}</Text>
    </View>
  );
}

export function HandoverPdf({
  data,
  lang,
  logoSrc,
}: {
  data: HandoverPdfData;
  lang: Lang;
  logoSrc?: string;
}) {
  const rtl = lang === "ar";
  const styles = buildStyles(rtl);
  const t = (k: StringKey) => translate(k, lang);

  const shiftKey =
    SHIFT_OPTIONS.find((s) => s.value === data.shift_type)?.k ?? "shiftLabel";
  const mismatch = hasCashMismatch(data);
  const ts = (v: string | null) =>
    v ? displayDigits(v.slice(0, 16).replace("T", " "), lang) : "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Brand: gold accent + navy header band with logo on a cream circle */}
        <View style={styles.accent} />
        <View style={styles.headerBand}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>AURION</Text>
            <Text style={styles.title}>{t("detailTitle")}</Text>
          </View>
          {logoSrc ? (
            <View style={styles.logoCircle}>
              <Image src={logoSrc} style={styles.logo} />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("outgoingSummary")}</Text>
          <PdfRow styles={styles} label={t("propertyLabel")} value={data.propertyName} />
          <PdfRow styles={styles} label={t("fieldDate")} value={formatDate(data.shift_date, lang)} />
          <PdfRow styles={styles} label={t("shiftLabel")} value={t(shiftKey)} />
          <PdfRow styles={styles} label={t("fieldYourName")} value={data.outgoing_name} />
          <PdfRow styles={styles} label={t("fieldRooms")} value={displayDigits(data.rooms_occupied, lang)} />
          {data.pending_requests ? (
            <PdfRow styles={styles} label={t("fieldPending")} value={data.pending_requests} />
          ) : null}
          {data.maintenance_issues ? (
            <PdfRow styles={styles} label={t("fieldMaintenance")} value={data.maintenance_issues} />
          ) : null}
          {data.notes ? <PdfRow styles={styles} label={t("fieldNotes")} value={data.notes} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("sectionCash")}</Text>
          <PdfRow styles={styles} label={t("expectedLabel")} value={formatSAR(data.cash_drawer, lang)} />
          <PdfRow styles={styles} label={t("countedLabel")} value={formatSAR(data.cash_recount, lang)} />
          <PdfRow
            styles={styles}
            label={t("varianceLabel")}
            value={mismatch ? formatSAR(data.cash_variance, lang) : t("noVariance")}
            red={mismatch}
          />
          {mismatch && data.variance_note ? (
            <Text style={styles.note}>
              {t("fieldVarianceNote")}: {data.variance_note}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("sectionIncoming")}</Text>
          <PdfRow styles={styles} label={t("fieldIncomingName")} value={data.incoming_name ?? "—"} />
          <PdfRow
            styles={styles}
            label={`${t("sectionOutgoing")} — ${t("signedAt")}`}
            value={ts(data.outgoing_signed_at)}
          />
          <PdfRow
            styles={styles}
            label={`${t("sectionIncoming")} — ${t("signedAt")}`}
            value={ts(data.incoming_signed_at)}
          />
        </View>
        </View>

        {/* Branded footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AURION · {t("appName")}</Text>
          <Text style={styles.footerText}>{ts(data.created_at)}</Text>
        </View>
      </Page>
    </Document>
  );
}
