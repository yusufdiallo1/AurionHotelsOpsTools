// Server-side PDF render → Buffer, for Drive archiving. Uses @react-pdf/renderer
// with fonts/logo read from the filesystem (the client path uses URLs).
import { createElement, type ReactElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Font, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { HandoverPdf, type HandoverPdfData } from "@/lib/pdf/HandoverPdf";
import type { Lang } from "@/lib/i18n/config";

function pub(rel: string): string {
  return path.join(process.cwd(), "public", rel);
}
function fileDataUrl(rel: string, mime: string): string | undefined {
  try {
    return `data:${mime};base64,${readFileSync(pub(rel)).toString("base64")}`;
  } catch {
    return undefined;
  }
}

let fontsReady = false;
function registerServerFonts() {
  if (fontsReady) return;
  // Re-register the family with filesystem paths so it resolves server-side
  // (the client component registers the same family via /fonts URLs).
  Font.register({
    family: "PlexArabic",
    fonts: [
      { src: pub("fonts/IBMPlexSansArabic-Regular.ttf"), fontWeight: 400 },
      { src: pub("fonts/IBMPlexSansArabic-Bold.ttf"), fontWeight: 700 },
    ],
  });
  fontsReady = true;
}

export async function renderHandoverPdfBuffer(
  data: HandoverPdfData,
  lang: Lang,
): Promise<Buffer> {
  registerServerFonts();
  const logoSrc = fileDataUrl("aurion-logo.png", "image/png");
  const el = createElement(HandoverPdf, { data, lang, logoSrc }) as ReactElement<DocumentProps>;
  return renderToBuffer(el);
}
