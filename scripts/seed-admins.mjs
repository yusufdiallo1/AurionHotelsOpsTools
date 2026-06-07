// One-off: create the two admin accounts via the Supabase Auth admin API.
// Reads ADMIN{1,2}_{EMAIL,PASSWORD,NAME} + SUPABASE creds from .env.local.
// Idempotent: skips if the email already exists. Run: `node scripts/seed-admins.mjs`.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8")
  .split("\n")
  .reduce((a, l) => {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) a[m[1]] = m[2].trim().replace(/^"|"$/g, "");
    return a;
  }, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const admins = [
  { email: env.ADMIN1_EMAIL, password: env.ADMIN1_PASSWORD, name: env.ADMIN1_NAME },
  { email: env.ADMIN2_EMAIL, password: env.ADMIN2_PASSWORD, name: env.ADMIN2_NAME },
];

for (const a of admins) {
  if (!a.email || !a.password) {
    console.log("skip (missing env):", a.email);
    continue;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
    user_metadata: { role: "admin", full_name: a.name },
  });
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) {
      console.log("exists, ensuring admin role:", a.email);
      // find + update the profile role to admin
      const { data: list } = await supabase.auth.admin.listUsers();
      const u = list?.users?.find((x) => x.email === a.email);
      if (u) {
        await supabase
          .from("profiles")
          .update({ role: "admin", full_name: a.name, active: true })
          .eq("id", u.id);
      }
    } else {
      console.log("ERROR:", a.email, error.message);
    }
    continue;
  }
  // Ensure the profile (trigger creates it; enforce admin role + name).
  await supabase
    .from("profiles")
    .update({ role: "admin", full_name: a.name, active: true })
    .eq("id", data.user.id);
  console.log("created admin:", a.email);
}
console.log("done");
process.exit(0);
