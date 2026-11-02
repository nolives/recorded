import type { NextConfig } from "next";
import { COVER_SITES } from "./src/lib/cover-hosts";

// Cache Components is off: almost every page in Recorded shows the signed-in
// user's own data, so pages render fresh on each request.
const nextConfig: NextConfig = {
  // Saved album covers go through Vercel's image cache: the first view
  // fetches the cover, and later views get a resized copy from Vercel's fast
  // network. Only the cover sites in src/lib/cover-hosts.ts are allowed.
  images: {
    remotePatterns: COVER_SITES.map((site) => ({ ...site })),
    // Album covers don't change, so keep cached copies for 31 days.
    minimumCacheTTL: 2678400,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
