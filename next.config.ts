import type { NextConfig } from "next";

// Cache Components is off: almost every page in Recorded shows the signed-in
// user's own data, so pages render fresh on each request.
const nextConfig: NextConfig = {
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
