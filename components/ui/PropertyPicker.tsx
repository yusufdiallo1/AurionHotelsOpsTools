"use client";

import { PROPERTIES, type PropertySlug } from "@/lib/properties";
import { FieldLabel } from "./FieldLabel";
import { SegmentedSelect } from "./SegmentedSelect";

// Property selector built on SegmentedSelect. (CLAUDE.md §7, §8)
export function PropertyPicker({
  value,
  onChange,
}: {
  value: PropertySlug | null;
  onChange: (slug: PropertySlug) => void;
}) {
  return (
    <div>
      <FieldLabel k="propertyLabel" />
      <SegmentedSelect
        options={PROPERTIES.map((p) => ({ value: p.slug, k: p.k }))}
        value={value}
        onChange={(v) => onChange(v as PropertySlug)}
        columns={3}
      />
    </div>
  );
}
