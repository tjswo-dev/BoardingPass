"use client";

import {
  CREATOR_PLATFORM_LABEL,
  type CreatorPlatform,
} from "@/lib/creator-link";
import { type CreatorLink } from "@/lib/types";

function viewableLinks(links: CreatorLink[] | undefined) {
  return (links || []).filter(
    (link) => Boolean(link.url) && link.status !== "rejected",
  );
}

export function SubmittedContentButtons({
  links,
  full = false,
}: {
  links: CreatorLink[] | undefined;
  full?: boolean;
}) {
  const list = viewableLinks(links);
  if (list.length === 0) return null;

  return (
    <div className={full ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
      {list.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            full
              ? "flex h-14 items-center justify-center rounded-xl bg-[var(--accent)] text-base font-bold !text-white transition hover:brightness-110"
              : "inline-flex whitespace-nowrap rounded-lg border border-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          }
        >
          {list.length > 1
            ? `제출 컨텐츠 보기 (${CREATOR_PLATFORM_LABEL[link.platform as CreatorPlatform] || link.platform})`
            : "제출 컨텐츠 보기"}
        </a>
      ))}
    </div>
  );
}
