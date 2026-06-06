import { cookies } from "next/headers";
import {
  MANAGER_COOKIE,
  MANAGER_COOKIE_MAX_AGE,
  checkPasscode,
  managerToken,
} from "@/lib/manager-auth";

// Unlock /manager: verify the shared passcode, set an httpOnly cookie.
export async function POST(req: Request) {
  let passcode = "";
  try {
    ({ passcode } = await req.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (!checkPasscode(passcode)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(MANAGER_COOKIE, managerToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MANAGER_COOKIE_MAX_AGE,
  });
  return Response.json({ ok: true });
}

// Lock: clear the cookie.
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(MANAGER_COOKIE);
  return Response.json({ ok: true });
}
