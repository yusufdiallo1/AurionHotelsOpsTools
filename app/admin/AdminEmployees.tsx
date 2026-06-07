"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { SHIFT_OPTIONS } from "@/lib/handover";

export type EmployeeRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  property_id: string | null;
  shift_type: string | null;
  phone: string | null;
  active: boolean;
  created_at: string | null;
  work_days: number[] | null;
};
type Property = { id: string; code: string; name_en: string; name_ar: string };

// 0=Sun … 6=Sat — matches JS Date.getDay() and the work_days column.
const DOW: { day: number; k: "dowSun" | "dowMon" | "dowTue" | "dowWed" | "dowThu" | "dowFri" | "dowSat" }[] = [
  { day: 0, k: "dowSun" },
  { day: 1, k: "dowMon" },
  { day: 2, k: "dowTue" },
  { day: 3, k: "dowWed" },
  { day: 4, k: "dowThu" },
  { day: 5, k: "dowFri" },
  { day: 6, k: "dowSat" },
];

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

export function AdminEmployees({
  initial,
  properties,
}: {
  initial: EmployeeRow[];
  properties: Property[];
}) {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<EmployeeRow[]>(initial);

  // Add-employee form state
  const [role, setRole] = useState<"receptionist" | "admin">("receptionist");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(randomPassword());
  const [propertyId, setPropertyId] = useState<string>(properties[0]?.id ?? "");
  const [shift, setShift] = useState<string>("morning");
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]); // Sun–Thu default
  const [phone, setPhone] = useState("");
  const toggleDay = (d: number) =>
    setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const propName = (id: string | null) => {
    const p = properties.find((x) => x.id === id);
    return p ? (lang === "ar" ? p.name_ar : p.name_en) : "—";
  };

  async function create() {
    if (busy || !email.trim() || password.length < 8 || !name.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: name,
          role,
          property_id: role === "receptionist" ? propertyId : null,
          shift_type: role === "receptionist" ? shift : null,
          work_days: role === "receptionist" ? workDays : [],
          phone: phone.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMsg({ ok: false, text: t("employeeError") });
      } else {
        // Only receptionists appear in this list; new admins aren't shown here.
        if (role === "receptionist") {
          setRows((prev) => [
            {
              id: json.id,
              full_name: name,
              email: email.trim().toLowerCase(),
              role,
              property_id: propertyId,
              shift_type: shift,
              work_days: workDays,
              phone: phone.trim() || null,
              active: true,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
        setMsg({ ok: true, text: t("employeeCreated") });
        // reset for next entry but keep the credentials visible to copy
        setName("");
        setPhone("");
      }
    } catch {
      setMsg({ ok: false, text: t("employeeError") });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(emp: EmployeeRow) {
    const next = !emp.active;
    setRows((prev) => prev.map((r) => (r.id === emp.id ? { ...r, active: next } : r)));
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: emp.id, active: next }),
    });
  }

  function copyCreds() {
    navigator.clipboard?.writeText(`${email}  ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const inputCls =
    "min-h-[48px] w-full rounded-aurion border border-line bg-paper px-4 text-ink placeholder:text-muted outline-none focus:border-gold-deep";

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-col gap-5 px-4 py-5">
      <Link href="/manager" className="text-[13px] font-bold text-gold-deep">
        ← {t("backToManager")}
      </Link>

      {/* Add employee */}
      <section className="glass flex flex-col gap-4 rounded-aurion p-4">
        <h2 className="text-[15px] font-bold text-ink">{t("addEmployee")}</h2>

        {/* Role */}
        <div className="grid grid-cols-2 gap-2">
          {(["receptionist", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={[
                "min-h-[44px] rounded-aurion px-3 text-[14px] transition-colors",
                role === r
                  ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                  : "border border-line bg-paper text-ink-soft",
              ].join(" ")}
            >
              {r === "receptionist" ? t("roleReceptionist") : t("roleAdmin")}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink">{t("receptionNameLabel")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={80} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink">{t("emailLabel")}</span>
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={inputCls}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink">{t("tempPasswordLabel")}</span>
          <div className="flex gap-2">
            <input dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            <button
              type="button"
              onClick={() => setPassword(randomPassword())}
              className="min-h-[48px] shrink-0 rounded-aurion border border-line-strong bg-paper px-4 text-[14px] font-bold text-ink"
            >
              {t("generate")}
            </button>
          </div>
        </div>

        {role === "receptionist" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink">{t("propertyLabel")}</span>
              <div className="grid grid-cols-2 gap-2">
                {properties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPropertyId(p.id)}
                    className={[
                      "min-h-[44px] rounded-aurion px-3 text-[14px] transition-colors",
                      propertyId === p.id
                        ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                        : "border border-line bg-paper text-ink-soft",
                    ].join(" ")}
                  >
                    {lang === "ar" ? p.name_ar : p.name_en}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink">{t("shiftTimeLabel")}</span>
              <div className="grid grid-cols-3 gap-2">
                {SHIFT_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setShift(s.value)}
                    className={[
                      "min-h-[44px] rounded-aurion px-2 text-[14px] transition-colors",
                      shift === s.value
                        ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                        : "border border-line bg-paper text-ink-soft",
                    ].join(" ")}
                  >
                    {t(s.k)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink">{t("workDaysLabel")}</span>
              <div className="grid grid-cols-7 gap-1.5">
                {DOW.map(({ day, k }) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={[
                      "min-h-[40px] rounded-aurion px-0.5 text-[12px] transition-colors",
                      workDays.includes(day)
                        ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                        : "border border-line bg-paper text-ink-soft",
                    ].join(" ")}
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink">{t("phoneLabel")}</span>
              <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} maxLength={30} />
            </label>
          </>
        ) : null}

        {msg ? (
          <div className="flex items-center justify-between gap-3">
            <p className={`text-[14px] font-medium ${msg.ok ? "text-green-700" : "text-red-700"}`}>
              {msg.text}
            </p>
            {msg.ok ? (
              <button type="button" onClick={copyCreds} className="text-[13px] font-bold text-gold-deep">
                {copied ? t("copied") : t("copyCreds")}
              </button>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={create}
          disabled={busy || !email.trim() || password.length < 8 || !name.trim()}
          className="min-h-[52px] w-full rounded-aurion bg-navy text-[16px] font-bold text-cream disabled:bg-line-strong disabled:text-[#8A8270]"
        >
          {busy ? t("creating") : t("createEmployee")}
        </button>
      </section>

      {/* Employee list */}
      <section className="glass rounded-aurion p-4">
        <h2 className="mb-3 text-[15px] font-bold text-ink">{t("adminTitle")}</h2>
        {rows.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("noEmployees")}</p>
        ) : (
          <ul className="flex flex-col">
            {rows.map((emp) => (
              <li
                key={emp.id}
                className="flex items-center justify-between gap-3 border-b border-line/70 py-3 last:border-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-bold text-ink">
                    {emp.full_name || emp.email}
                  </span>
                  <span className="truncate text-[12px] text-ink-soft" dir="ltr">
                    {emp.email}
                  </span>
                  <span className="text-[12px] text-ink-soft">
                    {emp.role === "admin" ? t("roleAdmin") : t("roleReceptionist")}
                    {emp.role === "receptionist" && emp.property_id
                      ? ` · ${propName(emp.property_id)}`
                      : ""}
                    {emp.shift_type
                      ? ` · ${t(SHIFT_OPTIONS.find((s) => s.value === emp.shift_type)?.k ?? "shiftLabel")}`
                      : ""}
                  </span>
                  {emp.work_days && emp.work_days.length > 0 ? (
                    <span className="text-[11px] text-muted">
                      {emp.work_days
                        .slice()
                        .sort((a, b) => a - b)
                        .map((d) => t(DOW.find((x) => x.day === d)!.k))
                        .join(" · ")}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${emp.active ? "bg-green-100 text-green-800" : "bg-line text-ink-soft"}`}
                  >
                    {emp.active ? t("activeLabel") : t("inactiveLabel")}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleActive(emp)}
                    className="text-[12px] font-bold text-gold-deep"
                  >
                    {emp.active ? t("deactivate") : t("activate")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
