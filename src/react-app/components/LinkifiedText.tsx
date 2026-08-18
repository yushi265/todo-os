import type { ReactNode } from "react";
import {
  HTTP_URL_PATTERN,
  shortenHttpUrl,
  splitTrailingPunctuation,
} from "../lib/linkify";

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

function LinkifiedText({ text, className }: LinkifiedTextProps) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(HTTP_URL_PATTERN)) {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;
    const [url, trailingPunctuation] = splitTrailingPunctuation(rawUrl);

    if (!url) continue;
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }
    parts.push(
      <a
        key={`${matchIndex}-${url}`}
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={url}
        title={url}
        data-drag-exclude="true"
        className="break-all text-primary underline underline-offset-2 hover:text-primary-hover"
        onClick={(event) => event.stopPropagation()}
      >
        {shortenHttpUrl(url)}
      </a>,
    );
    if (trailingPunctuation) parts.push(trailingPunctuation);
    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return <span className={className}>{parts.length > 0 ? parts : text}</span>;
}

export default LinkifiedText;
