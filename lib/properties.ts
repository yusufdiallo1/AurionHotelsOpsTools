// Shared property catalogue. Slugs match the `properties` table. (CLAUDE.md §7)
// Confirm the full list with Malsor; these three are known.

import type { StringKey } from "@/lib/strings";

export type PropertySlug = "al_aqeeq" | "as_salaam" | "quba";

export const PROPERTIES: { slug: PropertySlug; k: StringKey }[] = [
  { slug: "al_aqeeq", k: "propAlAqeeq" },
  { slug: "as_salaam", k: "propAsSalaam" },
  { slug: "quba", k: "propQuba" },
];
