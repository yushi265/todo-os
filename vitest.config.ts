import path from "node:path";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      // v8 のネイティブカバレッジは @cloudflare/vitest-pool-workers（Workers runtime）で
      // 未サポート（node:inspector 未実装）。Istanbul の計装カバレッジを使う。
      // https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/
      //
      // 既知の制約: Istanbul でも service プロジェクト（workerd 内で実行）は、計装データが
      // Node.js プロセス側のレポーターへ橋渡しされない既知の未解決 issue があり、
      // src/worker 配下のカバレッジ数値は不正確（過少）になる（cloudflare/workers-sdk#12951 系）。
      // ui プロジェクト（jsdom・Node.js プロセス内実行）の数値は正確。
      // service レイヤーの網羅性は spec のテストケース一覧との手動突合を正とする。
      provider: "istanbul",
      include: ["src/worker/**", "src/shared/**", "src/react-app/**"],
      exclude: ["**/*.test.{ts,tsx}", "src/react-app/main.tsx"],
    },
    projects: [
      {
        plugins: [
          cloudflareTest(async () => {
            const migrationsPath = path.join(import.meta.dirname, "drizzle");
            const migrations = await readD1Migrations(migrationsPath);
            return {
              wrangler: { configPath: "./wrangler.jsonc" },
              miniflare: {
                bindings: { TEST_MIGRATIONS: migrations },
              },
            };
          }),
        ],
        test: {
          name: "service",
          include: ["src/worker/**/*.test.ts", "src/shared/**/*.test.ts"],
          setupFiles: ["./test/apply-migrations.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "ui",
          include: ["src/react-app/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./test/setup-ui.ts"],
        },
      },
    ],
  },
});
