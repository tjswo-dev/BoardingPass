/**
 * 일본 뷰티/스킨케어 공개 콘텐츠 URL (데모용 폴백 풀).
 * 인플루언서 매칭은 real-person-content.mjs + person-media.json 을 사용하세요.
 */
export const REAL_CONTENT_LINKS = [
  "https://www.youtube.com/watch?v=W4ZCEWhSPWA",
  "https://www.youtube.com/watch?v=jcBVbrHTOEQ",
  "https://www.youtube.com/watch?v=Uh6lmIBhGXg",
  "https://www.youtube.com/watch?v=TdK7CiBpGco",
  "https://www.youtube.com/watch?v=CbFksl3R13c",
  "https://www.youtube.com/watch?v=yvWptal3UQI",
  "https://www.youtube.com/watch?v=_G6vjoLV0rY",
  "https://www.youtube.com/watch?v=kdnnCQJIdUA",
  "https://www.youtube.com/watch?v=dzEL7aAzzOk",
  "https://www.youtube.com/watch?v=-ewW0H6hXs0",
  "https://www.youtube.com/watch?v=09xmPgqO8ks",
  "https://www.youtube.com/watch?v=Jwn7o_Lrhs4",
  "https://www.youtube.com/watch?v=-2h7dTFmvEo",
  "https://www.youtube.com/watch?v=lAMLzKbGmgw",
];

export function platformOf(url) {
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
  return "etc";
}

/** @deprecated Prefer pickPersonLink from real-person-content.mjs */
export function pickRealLink(index) {
  const url = REAL_CONTENT_LINKS[index % REAL_CONTENT_LINKS.length];
  return { url, platform: platformOf(url) };
}

export { pickPersonLink } from "./real-person-content.mjs";
