/** YouTube / Instagram 콘텐츠 URL → 카드용 썸네일. */

export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
  } catch {
    return null;
  }
  return null;
}

export function instagramShortcode(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.includes("instagram.com") && host !== "instagr.am") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const kind = parts[0]?.toLowerCase();
    if ((kind === "reel" || kind === "p" || kind === "tv") && parts[1]) {
      return parts[1];
    }
  } catch {
    return null;
  }
  return null;
}

/** 서버 API 프록시 — Instagram CDN·프로필·YouTube 썸네일을 항상 반환. */
export function contentThumbnailProxyUrl(
  contentUrl: string,
  handle?: string | null,
): string {
  const q = new URLSearchParams({ url: contentUrl });
  const h = handle?.replace(/^@+/, "").trim();
  if (h) q.set("handle", h);
  return `/api/content-thumbnail?${q.toString()}`;
}

/** @deprecated 직접 URL — 브라우저에서 Instagram media 차단될 수 있음. proxy 사용 권장. */
export function contentThumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const yt = youtubeVideoId(url);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  if (instagramShortcode(url)) return contentThumbnailProxyUrl(url);
  return null;
}

/** 반려가 아닌 제출 링크 중 콘텐츠 썸네일 API URL (릴/게시물·프로필 모두). */
export function pickContentCoverUrl(
  links: { url: string; status?: string; platform?: string }[],
  handle?: string | null,
): string | null {
  const usable = links.filter((l) => l.status !== "rejected");
  if (usable.length === 0) return null;

  const ranked = [...usable].sort((a, b) => {
    const score = (l: typeof a) => {
      if (instagramShortcode(l.url)) return 0;
      if (l.platform === "instagram") return 1;
      if (l.platform === "youtube" || youtubeVideoId(l.url)) return 2;
      return 3;
    };
    const ay = score(a);
    const by = score(b);
    if (ay !== by) return ay - by;
    if (a.status === "approved" && b.status !== "approved") return -1;
    if (b.status === "approved" && a.status !== "approved") return 1;
    return 0;
  });

  return contentThumbnailProxyUrl(ranked[0].url, handle);
}
