import { Readable } from "node:stream";
import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/server";
import { renderHandoverPdfBuffer } from "@/lib/pdf/render";
import { logAudit } from "@/lib/audit";
import type { HandoverPdfData } from "@/lib/pdf/HandoverPdf";

const DRIVE_FOLDERS: Record<string, string | undefined> = {
  al_aqeeq: process.env.DRIVE_FOLDER_AL_AQEEQ,
  as_salaam: process.env.DRIVE_FOLDER_AS_SALAAM,
};

// Render the branded PDF and upload it to the hotel's Drive folder. Idempotent
// (skips if drive_file_id present). Never blocks; records drive_error on failure.
async function archiveToDrive(
  supabase: ReturnType<typeof createServiceClient>,
  h: Record<string, unknown> & { id: string; drive_file_id: string | null },
  saEmail: string,
  saKey: string,
): Promise<void> {
  if (h.drive_file_id) return;
  const prop = h.properties as { code?: string; name_en?: string } | null;
  const folderId = prop?.code ? DRIVE_FOLDERS[prop.code] : undefined;
  if (!folderId) {
    await supabase.from("handovers").update({ drive_error: "no drive folder for property" }).eq("id", h.id);
    return;
  }
  try {
    const lang = "en" as const;
    const pdf = await renderHandoverPdfBuffer(
      { ...(h as unknown as HandoverPdfData), propertyName: prop?.name_en ?? "" },
      lang,
    );
    const auth = new google.auth.JWT({
      email: saEmail,
      key: saKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });
    const name = `Aurion ${prop?.name_en ?? "Handover"} ${h.shift_date} ${h.id.slice(0, 8)}.pdf`;
    const res = await drive.files.create({
      requestBody: { name, parents: [folderId] },
      media: { mimeType: "application/pdf", body: Readable.from(pdf) },
      fields: "id",
      supportsAllDrives: true,
    });
    await supabase
      .from("handovers")
      .update({ drive_file_id: res.data.id, drive_uploaded_at: new Date().toISOString(), drive_error: null })
      .eq("id", h.id);
    await logAudit({ action: "drive_uploaded", handoverId: h.id, meta: { fileId: res.data.id } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "drive upload failed";
    await supabase.from("handovers").update({ drive_error: msg }).eq("id", h.id);
  }
}

// Append a completed handover as ONE row to Google Sheets.
// - Server-only: the Google key never reaches the browser.
// - Idempotent: a row already synced returns ok without re-appending.
// - Never loses data: failures are recorded on the row; Supabase stays the source of truth.
export async function POST(req: Request) {
  let id: string;
  try {
    ({ id } = await req.json());
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!id) return Response.json({ ok: false, error: "missing id" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: h, error } = await supabase
    .from("handovers")
    .select("*, properties(code, name_en, name_ar)")
    .eq("id", id)
    .maybeSingle();

  if (error || !h) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const sheetId = process.env.HANDOVER_SHEET_ID;
  const saEmail = process.env.GOOGLE_SA_EMAIL;
  const saKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Archive the PDF to the hotel's Drive folder (idempotent, independent of Sheets).
  if (saEmail && saKey) {
    await archiveToDrive(supabase, h as never, saEmail, saKey);
  }

  // Idempotent: already sheet-synced → no double-append (Drive handled above).
  if (h.synced_to_sheets) {
    return Response.json({ ok: true, alreadySynced: true });
  }

  if (!sheetId || !saEmail || !saKey) {
    await supabase
      .from("handovers")
      .update({ sheet_sync_error: "missing Sheets env config" })
      .eq("id", id);
    return Response.json({ ok: false, error: "sheets not configured" }, { status: 200 });
  }

  const propertyName =
    (h.properties as { name_en?: string } | null)?.name_en ?? h.property_id;

  // Column order A:Q (17 cols) — keep stable; the Sheet header should match.
  const row = [
    h.shift_date, // A Date
    propertyName, // B Property
    h.shift_type, // C Shift
    h.outgoing_name, // D Outgoing
    h.rooms_occupied, // E Rooms occupied
    h.cash_drawer, // F Cash drawer
    h.cash_recount ?? "", // G Cash recount
    h.cash_variance ?? "", // H Variance
    h.variance_note ?? "", // I Variance note
    h.incoming_name ?? "", // J Incoming
    h.outgoing_signed_at ?? "", // K Outgoing signed at
    h.incoming_signed_at ?? "", // L Incoming signed at
    h.status, // M Status
    h.pending_requests ?? "", // N Pending requests
    h.maintenance_issues ?? "", // O Maintenance issues
    h.notes ?? "", // P Notes
    h.id, // Q Handover id
  ];

  try {
    const auth = new google.auth.JWT({
      email: saEmail,
      key: saKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Handovers!A:Q",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    await supabase
      .from("handovers")
      .update({
        synced_to_sheets: true,
        sheet_synced_at: new Date().toISOString(),
        sheet_sync_error: null,
      })
      .eq("id", id);

    await logAudit({
      action: "handover_completed",
      handoverId: id,
      meta: {
        property: propertyName,
        variance: h.cash_variance,
        incoming: h.incoming_name,
      },
    });
    await logAudit({ action: "sheet_synced", handoverId: id });

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sheets append failed";
    await supabase
      .from("handovers")
      .update({ synced_to_sheets: false, sheet_sync_error: message })
      .eq("id", id);
    // 200: the handover itself is safe; the client shows a "will retry" note.
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
