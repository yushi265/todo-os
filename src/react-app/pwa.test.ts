/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./registerServiceWorker";

const manifestPath = resolve(process.cwd(), "public/manifest.webmanifest");
const serviceWorkerPath = resolve(process.cwd(), "public/sw.js");

describe("PWA manifest", () => {
  it("defines the installable todo-os application contract", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: Array<{
        src: string;
        sizes: string;
        type: string;
      }>;
    };

    expect(manifest).toMatchObject({
      name: "todo-os",
      short_name: "todo-os",
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: "#52525b",
      background_color: "#f4f4f5",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        {
          src: "/pwa-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/pwa-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ]),
    );
  });

  it.each([
    ["public/pwa-192.png", 192],
    ["public/pwa-512.png", 512],
  ] as const)("contains a valid %s PNG icon", (relativePath, size) => {
    const icon = readFileSync(resolve(process.cwd(), relativePath));

    expect(icon.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(icon.readUInt32BE(16)).toBe(size);
    expect(icon.readUInt32BE(20)).toBe(size);
  });
});

describe("Service Worker source", () => {
  it("declares shell caching, navigation fallback, and API exclusion", () => {
    const serviceWorker = readFileSync(serviceWorkerPath, "utf8");

    expect(serviceWorker).toContain('const CACHE_NAME = "todo-os-shell-v1"');
    expect(serviceWorker).toMatch(/caches\s*\.match\("\/index\.html"\)/);
    expect(serviceWorker).toContain('request.mode === "navigate"');
    expect(serviceWorker).toContain('url.pathname === "/api"');
    expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorker).toContain('request.method !== "GET"');
    expect(serviceWorker).toContain("self.skipWaiting()");
    expect(serviceWorker).toContain("self.clients.claim()");
  });
});

describe("registerServiceWorker", () => {
  it("registers the root-scoped worker in production", () => {
    const register = vi.fn().mockResolvedValue({});
    const serviceWorkerContainer = { register };

    registerServiceWorker(true, serviceWorkerContainer);

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it.each([
    [false, { register: vi.fn() }],
    [true, undefined],
  ] as const)(
    "does not register when production=%s or Service Worker is unavailable",
    (isProduction, serviceWorkerContainer) => {
      registerServiceWorker(isProduction, serviceWorkerContainer);

      if (serviceWorkerContainer) {
        expect(serviceWorkerContainer.register).not.toHaveBeenCalled();
      } else {
        expect(serviceWorkerContainer).toBeUndefined();
      }
    },
  );

  it("does not reject when registration fails", async () => {
    const register = vi
      .fn()
      .mockRejectedValue(new Error("registration failed"));

    registerServiceWorker(true, { register });
    await new Promise<void>((resolvePromise) => queueMicrotask(resolvePromise));

    expect(register).toHaveBeenCalledWith("/sw.js");
  });
});
