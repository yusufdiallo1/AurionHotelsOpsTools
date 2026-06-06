"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout";
import {
  ConfirmDialog,
  NumberField,
  PrimaryButton,
  PropertyPicker,
  SegmentedSelect,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useLang } from "@/lib/i18n";
import { useOnline } from "@/lib/useOnline";
import { createClient } from "@/lib/supabase/client";
import { withRetry } from "@/lib/retry";
import { PROPERTIES, type PropertySlug } from "@/lib/properties";
import {
  MAX_NAME,
  MAX_TEXTAREA,
  SHIFT_OPTIONS,
  parseAmount,
  todayIso,
  type ShiftType,
} from "@/lib/handover";

const DRAFT_KEY = "aurion-handover-draft-v1";

type Draft = {
  shiftDate: string;
  property: PropertySlug | null;
  shift: string | null;
  name: string;
  rooms: string;
  cash: string;
  pending: string;
  maintenance: string;
  notes: string;
};

const EMPTY: Draft = {
  shiftDate: todayIso(),
  property: null,
  shift: null,
  name: "",
  rooms: "",
  cash: "",
  pending: "",
  maintenance: "",
  notes: "",
};

export default function NewHandoverPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const online = useOnline();

  const [d, setD] = useState<Draft>(EMPTY);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft restore prompt + duplicate prompt + leave guard.
  const [restorable, setRestorable] = useState<Draft | null>(null);
  const [dup, setDup] = useState<{ id: string } | null>(null);
  const dirtyRef = useRef(false);

  const roomsNum = parseAmount(d.rooms);
  const cashNum = parseAmount(d.cash);
  const valid =
    !!d.property &&
    !!d.shift &&
    d.name.trim().length > 0 &&
    roomsNum !== null &&
    Number.isInteger(roomsNum) &&
    roomsNum >= 0 &&
    cashNum !== null &&
    cashNum >= 0;

  // On mount: offer to restore a saved draft (if it has real content). Reading
  // localStorage + setState happens after a microtask so it's not a synchronous
  // setState within the effect body.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Draft;
        if (saved.name || saved.property || saved.cash || saved.rooms) {
          setRestorable(saved);
        }
      } catch {
        /* ignore malformed draft */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave as the user types (debounced lightly via effect on `d`).
  useEffect(() => {
    const isDirty =
      d.name || d.property || d.shift || d.rooms || d.cash || d.pending || d.maintenance || d.notes;
    dirtyRef.current = !!isDirty && !submitting;
    if (isDirty) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      } catch {
        /* storage full / unavailable — non-fatal */
      }
    }
  }, [d, submitting]);

  // Warn before leaving a half-filled handover (tab close / reload).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  // Check for an existing same property+date+shift handover before creating.
  async function findDuplicate(): Promise<string | null> {
    const supabase = createClient();
    const prop = PROPERTIES.find((p) => p.slug === d.property);
    const { data: pr } = await supabase
      .from("properties")
      .select("id")
      .eq("code", prop!.slug)
      .maybeSingle();
    if (!pr) return null;
    const { data } = await supabase
      .from("handovers")
      .select("id")
      .eq("property_id", pr.id)
      .eq("shift_date", d.shiftDate)
      .eq("shift_type", d.shift as ShiftType)
      .order("created_at", { ascending: false })
      .limit(1);
    return data && data.length ? data[0].id : null;
  }

  async function attemptSubmit() {
    if (!valid || submitting || !online) return;
    const existing = await findDuplicate();
    if (existing) {
      setDup({ id: existing });
      return;
    }
    await doSubmit();
  }

  async function doSubmit() {
    if (submitting) return; // guard double-tap
    setDup(null);
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const prop = PROPERTIES.find((p) => p.slug === d.property);
      const { data: propRow, error: propErr } = await withRetry(async () =>
        supabase.from("properties").select("id").eq("code", prop!.slug).single(),
      );
      if (propErr || !propRow) throw propErr ?? new Error("property");

      const { data: inserted, error: insErr } = await withRetry(async () =>
        supabase
          .from("handovers")
          .insert({
            property_id: propRow.id,
            shift_date: d.shiftDate,
            shift_type: d.shift as ShiftType,
            outgoing_name: d.name.trim(),
            rooms_occupied: roomsNum!,
            cash_drawer: cashNum!,
            pending_requests: d.pending.trim() || null,
            maintenance_issues: d.maintenance.trim() || null,
            notes: d.notes.trim() || null,
            status: "pending_incoming",
            // Sign-off = typed name + timestamp (no drawn signature).
            outgoing_signed_at: new Date().toISOString(),
          })
          .select("id")
          .single(),
      );
      if (insErr || !inserted) throw insErr ?? new Error("insert");

      clearDraft();
      dirtyRef.current = false;
      router.push(`/new/${inserted.id}`);
    } catch {
      // Keep the entered data on screen; let them retry.
      setError(t("errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader titleKey="step1Title" steps={3} currentStep={1} />

      {!online ? (
        <div className="bg-amber-100 px-5 py-2 text-center text-[13px] font-medium text-amber-900">
          {t("offlineBanner")}
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5 py-6">
        <div>
          <FieldLabel k="fieldDate" htmlFor="shift-date" />
          <input
            id="shift-date"
            type="date"
            value={d.shiftDate}
            onChange={(e) => set("shiftDate", e.target.value)}
            dir="ltr"
            className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink outline-none focus:border-gold-deep"
          />
        </div>

        <PropertyPicker value={d.property} onChange={(v) => set("property", v)} />

        <div>
          <FieldLabel k="shiftLabel" />
          <SegmentedSelect
            options={SHIFT_OPTIONS.map((s) => ({ value: s.value, k: s.k }))}
            value={d.shift}
            onChange={(v) => set("shift", v)}
            columns={3}
          />
        </div>

        <TextField
          labelKey="fieldYourName"
          placeholderKey="fieldYourNamePlaceholder"
          value={d.name}
          onChange={(v) => set("name", v)}
          autoComplete="name"
          maxLength={MAX_NAME}
        />

        <NumberField
          labelKey="fieldRooms"
          value={d.rooms}
          onChange={(v) => set("rooms", v)}
          mode="integer"
        />

        <NumberField
          labelKey="fieldCashDrawer"
          value={d.cash}
          onChange={(v) => set("cash", v)}
          mode="money"
          suffix={lang === "ar" ? "ر.س" : "SAR"}
        />

        <TextAreaField
          labelKey="fieldPending"
          placeholderKey="fieldPendingPlaceholder"
          value={d.pending}
          onChange={(v) => set("pending", v)}
          maxLength={MAX_TEXTAREA}
        />
        <TextAreaField
          labelKey="fieldMaintenance"
          placeholderKey="fieldMaintenancePlaceholder"
          value={d.maintenance}
          onChange={(v) => set("maintenance", v)}
          maxLength={MAX_TEXTAREA}
        />
        <TextAreaField
          labelKey="fieldNotes"
          placeholderKey="fieldNotesPlaceholder"
          value={d.notes}
          onChange={(v) => set("notes", v)}
          maxLength={MAX_TEXTAREA}
        />

        {error ? (
          <p role="alert" className="text-[14px] font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <PrimaryButton
          labelKey={submitting ? "saving" : !online ? "offlineSubmit" : "step1Submit"}
          onClick={attemptSubmit}
          disabled={!valid || submitting || !online}
        />
      </main>

      {/* Restore-draft prompt */}
      <ConfirmDialog
        open={!!restorable}
        titleKey="draftFound"
        confirmKey="draftRestore"
        cancelKey="draftDiscard"
        onConfirm={() => {
          if (restorable) setD(restorable);
          setRestorable(null);
        }}
        onCancel={() => {
          clearDraft();
          setRestorable(null);
        }}
      />

      {/* Duplicate prompt: open the existing one, or create anyway. */}
      {dup ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          onClick={() => setDup(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-aurion bg-paper p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-ink">{t("dupTitle")}</h2>
            <p className="mt-2 text-[15px] text-ink-soft">{t("dupBody")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => router.push(`/new/${dup.id}`)}
                className="min-h-[52px] rounded-aurion bg-navy text-[16px] font-bold text-cream"
              >
                {t("dupOpen")}
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={submitting}
                className="min-h-[48px] rounded-aurion border border-line-strong bg-paper text-[15px] font-bold text-ink-soft disabled:opacity-60"
              >
                {t("dupProceed")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
