"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout";
import {
  DateField,
  NumberField,
  PrimaryButton,
  PropertyPicker,
  SegmentedSelect,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import type { PropertySlug } from "@/lib/properties";

// Visual test surface — renders every shared component. (CLAUDE.md §4, §8)
// Toggle EN/AR in the header to verify RTL + Arabic shaping.

const SWATCHES: { name: string; cls: string; ring?: boolean }[] = [
  { name: "navy", cls: "bg-navy" },
  { name: "navy-deep", cls: "bg-navy-deep" },
  { name: "cream", cls: "bg-cream", ring: true },
  { name: "paper", cls: "bg-paper", ring: true },
  { name: "paper-tint", cls: "bg-paper-tint", ring: true },
  { name: "gold", cls: "bg-gold" },
  { name: "gold-deep", cls: "bg-gold-deep" },
  { name: "gold-soft", cls: "bg-gold-soft" },
  { name: "line", cls: "bg-line" },
  { name: "line-strong", cls: "bg-line-strong" },
  { name: "ink", cls: "bg-ink" },
  { name: "muted", cls: "bg-muted" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-aurion border border-line bg-paper/60 p-4">
      <h2 className="text-[15px] font-bold uppercase tracking-wide text-ink-soft">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const { t } = useLang();

  const [name, setName] = useState("");
  const [cash, setCash] = useState("");
  const [notes, setNotes] = useState("");
  const [shift, setShift] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertySlug | null>(null);
  const [demoDate, setDemoDate] = useState("2026-06-07");

  return (
    <>
      <AppHeader titleKey="sgTitle" steps={3} currentStep={2} />

      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5 py-6">
        <p className="text-[14px] text-ink-soft">{t("sgSubtitle")}</p>

        <Section title="Color tokens">
          <div className="grid grid-cols-4 gap-3">
            {SWATCHES.map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-1">
                <span
                  className={[
                    "h-12 w-12 rounded-aurion",
                    s.cls,
                    s.ring ? "ring-1 ring-line-strong" : "",
                  ].join(" ")}
                />
                <span className="text-[11px] text-ink-soft">{s.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.12em] text-navy">
            AURION
          </p>
          <p className="text-[17px] font-bold text-ink">
            Plus Jakarta Sans — UI Latin
          </p>
          <p className="font-ar text-[17px] font-bold text-ink" dir="rtl">
            IBM Plex Sans Arabic — الخط العربي
          </p>
        </Section>

        <Section title="Date picker">
          <DateField labelKey="fieldDate" value={demoDate} onChange={setDemoDate} />
        </Section>

        <Section title="Text fields">
          <TextField
            labelKey="demoName"
            placeholderKey="demoNamePlaceholder"
            value={name}
            onChange={setName}
            autoComplete="name"
          />
          <NumberField
            labelKey="demoCash"
            value={cash}
            onChange={setCash}
            mode="money"
            suffix="SAR"
          />
          <TextAreaField
            labelKey="demoNotes"
            placeholderKey="demoNotesPlaceholder"
            value={notes}
            onChange={setNotes}
            rows={3}
          />
        </Section>

        <Section title="Segmented select (3-up)">
          <SegmentedSelect
            options={[
              { value: "night", k: "shiftNight" },
              { value: "morning", k: "shiftMorning" },
              { value: "afternoon", k: "shiftAfternoon" },
            ]}
            value={shift}
            onChange={setShift}
            columns={3}
          />
        </Section>

        <Section title="Property picker">
          <PropertyPicker value={property} onChange={setProperty} />
        </Section>

        <Section title="Primary button">
          <PrimaryButton labelKey="continue" disabled={!name} />
          <PrimaryButton labelKey="save" showArrow={false} />
        </Section>
      </main>
    </>
  );
}
