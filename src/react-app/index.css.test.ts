/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/react-app/index.css"),
  "utf8",
);
const defaultTheme = stylesheet.slice(
  stylesheet.indexOf("@theme"),
  stylesheet.indexOf('[data-theme="ocean"]'),
);

describe("default theme color tokens", () => {
  it("uses neutral gray as the baseline palette", () => {
    expect(defaultTheme).toContain("--color-primary: #52525b;");
    expect(defaultTheme).toContain("--color-primary-hover: #3f3f46;");
    expect(defaultTheme).toContain("--color-surface: #f4f4f5;");
    expect(defaultTheme).toContain("--color-chip-bg: #e4e4e7;");
    expect(defaultTheme).toContain("--color-status-inprogress-fg: #52525b;");
    expect(defaultTheme).not.toContain("#4f46e5");
  });

  it("keeps monochrome as the higher-contrast black and white option", () => {
    const monochromeTheme = stylesheet.slice(
      stylesheet.indexOf('[data-theme="monochrome"]'),
    );

    expect(monochromeTheme).toContain("--color-primary: #111827;");
    expect(monochromeTheme).toContain("--color-primary-hover: #000000;");
  });
});
