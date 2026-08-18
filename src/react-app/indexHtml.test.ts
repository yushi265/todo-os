/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const favicon = readFileSync(
  resolve(process.cwd(), "public/favicon.svg"),
  "utf8",
);

describe("favicon", () => {
  it("links the project-owned SVG favicon from the document head", () => {
    expect(indexHtml).toContain(
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    );
    expect(favicon).toContain("<title>todo-os</title>");
    expect(favicon).toContain('fill="#52525b"');
  });
});

describe("PWA metadata", () => {
  it("links the manifest and mobile app metadata from the document head", () => {
    expect(indexHtml).toContain(
      '<link rel="manifest" href="/manifest.webmanifest" />',
    );
    expect(indexHtml).toContain(
      '<meta name="theme-color" content="#52525b" />',
    );
    expect(indexHtml).toContain(
      '<meta name="mobile-web-app-capable" content="yes" />',
    );
    expect(indexHtml).toContain(
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
    );
    expect(indexHtml).toContain(
      '<meta name="apple-mobile-web-app-title" content="todo-os" />',
    );
    expect(indexHtml).toContain(
      '<link rel="apple-touch-icon" href="/pwa-192.png" />',
    );
  });
});
