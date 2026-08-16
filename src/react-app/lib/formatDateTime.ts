const TOKYO_TIME_ZONE = "Asia/Tokyo";

const TOKYO_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(
  "ja-JP-u-ca-gregory",
  {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
);

function parseUtcDateTime(value: string): Date {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasTimeZone = /(?:z|[+-]\d{2}(?::?\d{2})?)$/i.test(normalized);
  return new Date(hasTimeZone ? normalized : `${normalized}Z`);
}

/** UTCで保存された日時を日本時間（Asia/Tokyo）で表示する。 */
export function formatDateTimeInTokyo(value: string): string {
  const date = parseUtcDateTime(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = TOKYO_DATE_TIME_FORMATTER.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}`;
}
