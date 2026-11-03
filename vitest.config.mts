import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// The tests sign in as the two throwaway test accounts and talk to the real
// database, so the real privacy rules are what's being tested.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Reads .env.local (database address) and .env.test.local (test
    // logins). Both are private files that are never committed.
    env: loadEnv("test", process.cwd(), ""),
    // One file at a time: the tests share the same two accounts.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
