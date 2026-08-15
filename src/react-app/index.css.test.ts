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
    expect(defaultTheme).toContain("--color-status-inprogress-fg: #1d4ed8;");
    expect(defaultTheme).not.toContain("#4f46e5");
  });

  it("keeps monochrome as the higher-contrast black and white option", () => {
    const monochromeTheme = stylesheet.slice(
      stylesheet.indexOf('[data-theme="monochrome"]'),
    );

    expect(monochromeTheme).toContain("--color-primary: #111827;");
    expect(monochromeTheme).toContain("--color-primary-hover: #000000;");
  });

  it("keeps status colors fixed across all themes", () => {
    const expectedStatusColors = {
      "status-todo-bg": "#f4f4f5",
      "status-todo-fg": "#52525b",
      "status-inprogress-bg": "#dbeafe",
      "status-inprogress-fg": "#1d4ed8",
      "status-done-bg": "#dcf5e7",
      "status-done-fg": "#166534",
      "status-canceled-bg": "#f4f4f5",
      "status-canceled-fg": "#52525b",
    };

    for (const theme of [
      "default",
      "ocean",
      "forest",
      "sunset",
      "lavender",
      "monochrome",
    ]) {
      const colors = themeTokens(theme);
      for (const [name, value] of Object.entries(expectedStatusColors)) {
        expect(colors[name], `${theme}: ${name}`).toBe(value);
      }
    }
  });
});

function parseColorTokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(
      ([, name, value]) => [name, value],
    ),
  );
}

function themeTokens(theme: string): Record<string, string> {
  const defaultBlock = stylesheet.slice(
    stylesheet.indexOf("@theme"),
    stylesheet.indexOf('[data-theme="ocean"]'),
  );
  if (theme === "default") return parseColorTokens(defaultBlock);
  const themeStart = stylesheet.indexOf(`[data-theme="${theme}"]`);
  const themeBlock = stylesheet.slice(
    themeStart,
    stylesheet.indexOf("\n}", themeStart),
  );
  return { ...parseColorTokens(defaultBlock), ...parseColorTokens(themeBlock) };
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

describe("WCAG 2.1 AA color contracts", () => {
  const themes = [
    "default",
    "ocean",
    "forest",
    "sunset",
    "lavender",
    "monochrome",
  ];

  it.each(themes)(
    "keeps readable text and controls in the %s theme",
    (theme) => {
      const colors = themeTokens(theme);
      const white = "#ffffff";
      const textColors = [
        "text-primary",
        "text-secondary",
        "text-tertiary",
        "text-quaternary",
      ];

      for (const name of textColors) {
        expect(
          contrastRatio(colors[name], colors.card),
          `${theme}: ${name} on card`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      for (const [foreground, background] of [
        ["primary", white],
        ["danger", white],
        ["status-todo-fg", "status-todo-bg"],
        ["status-inprogress-fg", "status-inprogress-bg"],
        ["status-done-fg", "status-done-bg"],
        ["status-canceled-fg", "status-canceled-bg"],
        ["priority-high", "card"],
        ["priority-medium", "card"],
        ["priority-low", "card"],
        ["tag-fg", "tag-bg"],
        ["tag-fg-muted", "tag-bg"],
        ["chip-fg", "chip-bg"],
      ] as const) {
        const backgroundColor = background.startsWith("#")
          ? background
          : colors[background];
        expect(
          contrastRatio(colors[foreground], backgroundColor),
          `${theme}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("defines a visible keyboard focus indicator for interactive elements", () => {
    expect(stylesheet).toContain(
      ":where(button, a, input, select, textarea, [tabindex]):focus-visible",
    );
    expect(stylesheet).toContain(
      "outline: 3px solid var(--color-primary) !important",
    );
  });
});
