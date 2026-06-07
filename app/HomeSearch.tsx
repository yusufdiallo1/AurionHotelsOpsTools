"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";

// Receptionist name search on the home page → opens /history filtered by name.
export function HomeSearch() {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");

  function submit() {
    const q = name.trim();
    router.push(q ? `/history?name=${encodeURIComponent(q)}` : "/history");
  }

  return (
    <div className="glass flex flex-col gap-2 rounded-aurion p-4">
      <label htmlFor="home-search" className="text-[13px] font-bold text-ink">
        {t("searchReception")}
      </label>
      <div className="flex gap-2">
        <input
          id="home-search"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("searchReceptionPlaceholder")}
          className="min-h-[48px] flex-1 rounded-aurion border border-line bg-paper px-4 text-ink placeholder:text-muted outline-none focus:border-gold-deep"
        />
        <button
          type="button"
          onClick={submit}
          className="min-h-[48px] shrink-0 rounded-aurion bg-navy px-5 text-[15px] font-bold text-cream"
        >
          {t("search")}
        </button>
      </div>
    </div>
  );
}
