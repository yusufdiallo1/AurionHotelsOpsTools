// Test-only module resolver so the standalone *.test.mjs files can run under
// `node --experimental-strip-types` without a bundler. It teaches Node two
// things the TypeScript/Next toolchain normally handles:
//   1. the `@/*` path alias (tsconfig paths → project root), and
//   2. extensionless / `.ts` specifiers (Next imports omit the extension).
// Pure dev tooling — never imported by the app itself.

import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = pathToFileURL(process.cwd()).href + "/";

/** First existing TS file for `spec` (tries as-is, `.ts`, then `/index.ts`). */
function tsCandidate(spec, parentURL) {
  const base = parentURL || ROOT;
  for (const cand of [spec, `${spec}.ts`, `${spec}/index.ts`]) {
    const url = new URL(cand, base);
    if (url.protocol === "file:" && existsSync(fileURLToPath(url))) return url.href;
  }
  return null;
}

registerHooks({
  resolve(spec, ctx, next) {
    // Map the `@/` alias to the project root, mirroring tsconfig `paths`.
    const mapped = spec.startsWith("@/") ? ROOT + spec.slice(2) : spec;
    const isLocal =
      spec.startsWith("@/") ||
      mapped.startsWith("./") ||
      mapped.startsWith("../") ||
      mapped.startsWith("/") ||
      mapped.startsWith("file:");
    if (isLocal) {
      const url = tsCandidate(mapped, ctx.parentURL);
      if (url) return { url, format: "module-typescript", shortCircuit: true };
    }
    return next(mapped, ctx);
  },
});

/** Resolve a project-relative spec to a URL for dynamic import in tests. */
export function fromRoot(spec) {
  return new URL(spec, ROOT).href;
}
