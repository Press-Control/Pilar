import type { NextConfig } from "next";

// Standalone POC. Runs locally with `pnpm dev` (port 3100). API routes run on the Node runtime.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false, // the Next badge overlaps the rail avatar
};

export default nextConfig;
