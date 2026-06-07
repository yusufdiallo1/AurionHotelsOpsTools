import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Return a short-lived signed URL for an archived handover PDF. Admins only.
export async function GET(req: Request) {
  const session = await getSessionProfile();
  if (!session || session.role !== "admin") {
    return Response.json({ ok: false }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "missing id" }, { status: 400 });

  const admin = createServiceClient();
  const { data: h } = await admin
    .from("handovers")
    .select("pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (!h?.pdf_path) return Response.json({ ok: false, error: "not archived" }, { status: 404 });

  const { data, error } = await admin.storage
    .from("handover-pdfs")
    .createSignedUrl(h.pdf_path, 60 * 5);
  if (error || !data) return Response.json({ ok: false, error: "sign failed" }, { status: 500 });

  // Redirect straight to the signed URL so the link opens the PDF.
  return Response.redirect(data.signedUrl, 302);
}
