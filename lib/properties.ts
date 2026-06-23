// Shared property catalogue. Slugs match the `properties` table. (CLAUDE.md §7)

import type { StringKey } from "@/lib/strings";

export type PropertySlug = "al_aqeeq" | "as_salaam";

export const PROPERTIES: { slug: PropertySlug; k: StringKey; totalRooms: number }[] = [
  { slug: "al_aqeeq", k: "propAlAqeeq", totalRooms: 19 },
  { slug: "as_salaam", k: "propAsSalaam", totalRooms: 19 },
];

/** Total rooms for a property slug (fallback 19). */
export function totalRoomsFor(slug: PropertySlug | null): number {
  return PROPERTIES.find((p) => p.slug === slug)?.totalRooms ?? 19;
}
