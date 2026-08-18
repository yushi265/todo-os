export const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'`。、！？；：]+/gi;
const HTTP_URL_SEARCH_PATTERN = /https?:\/\/[^\s<>"'`。、！？；：]+/i;
const TRAILING_PUNCTUATION_PATTERN = /[.,!?;:、。]+$/;
const MAX_DISPLAY_URL_LENGTH = 40;

export function containsHttpUrl(value: string): boolean {
  return HTTP_URL_SEARCH_PATTERN.test(value);
}

export function splitTrailingPunctuation(value: string): [string, string] {
  const match = value.match(TRAILING_PUNCTUATION_PATTERN);
  if (!match) return [value, ""];
  return [value.slice(0, -match[0].length), match[0]];
}

export function shortenHttpUrl(
  url: string,
  maxLength = MAX_DISPLAY_URL_LENGTH,
): string {
  let displayUrl = url;
  try {
    const parsed = new URL(url);
    displayUrl = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // URLとして解析できない場合も、hrefは元の値を維持して表示だけ短縮する。
  }

  if (displayUrl.length <= maxLength) return displayUrl;
  return `${displayUrl.slice(0, maxLength - 1)}…`;
}
