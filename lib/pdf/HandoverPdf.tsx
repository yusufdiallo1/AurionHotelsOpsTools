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
      paddingTop: 36,
      paddingBottom: 40,
      paddingHorizontal: 40,
      direction: rtl ? "rtl" : "ltr",
    },
    header: {
      flexDirection: flexDir,
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 2,
      borderBottomColor: GOLD,
      paddingBottom: 12,
      marginBottom: 18,
    },
    brand: { fontSize: 20, fontWeight: 700, color: NAVY, letterSpacing: 2 },
    title: { fontSize: 12, color: INK_SOFT, textAlign: align },
    logo: { width: 44, height: 44 },
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
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>AURION</Text>
            <Text style={styles.title}>{t("detailTitle")}</Text>
          </View>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
        </View>

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
      </Page>
    </Document>
  );
}
