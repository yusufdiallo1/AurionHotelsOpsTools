"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { openIssues, type OpenIssue, type WidgetScope } from "@/lib/homeWidgets";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import { useScopedHandovers } from "./useScopedHandovers";

const KIND_K: Record<OpenIssue["kind"], StringKey> = {
  maintenance: "widgetIssueMaintenance",
  pending: "widgetIssuePending",
  variance: "widgetIssueVariance",
};

export function IssuesPanel({ scope }: { scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -6), toDate: today },
    "widget-issues",
  );

  if (rows === null) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  const issues = openIssues(rows);

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetIssues")}</h2>
      {issues.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-soft">{t("widgetIssuesNone")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {issues.map((it, i) => (
            <li key={`${it.id}-${it.kind}-${i}`}>
              <Link href={`/history/${it.id}`} className="block rounded-aurion border border-line bg-paper-tint p-2.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-ink">{t(KIND_K[it.kind])}</span>
                  <span className="text-[11px] text-muted" dir="ltr">{it.shift_date}</span>
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-soft">{t(it.hotelK)} · {t(it.shiftK)} · {it.outgoing_name}</span>
                <span className="mt-1 block text-[13px] text-ink">{it.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
