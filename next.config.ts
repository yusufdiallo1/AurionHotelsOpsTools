import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in a parent
  // directory was making Next.js infer the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
