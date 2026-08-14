/**
 * 인플루언서 핸들 → 본인 Instagram 콘텐츠 (데모용).
 * profile-instagram-posts.json 은 fetch-instagram-profile-posts.mjs 로 갱신.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { snsUrlFor } from "./real-beauty-influencers.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const PROFILE_POSTS = JSON.parse(
  readFileSync(join(dir, "profile-instagram-posts.json"), "utf8"),
);
const MEDIA = JSON.parse(
  readFileSync(join(dir, "person-media.json"), "utf8"),
);

/** 잘못된 채널 매칭으로 들어온 YouTube 제외 */
const BLOCKED_AUTHORS = new Set(["Kikoxxx", "MrLusy"]);

export function personMedia(handle) {
  const key = String(handle || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  return MEDIA[key] || null;
}

export function personVideos(handle) {
  const m = personMedia(handle);
  if (!m?.videos?.length) return [];
  return m.videos.filter((v) => !BLOCKED_AUTHORS.has(v.author));
}

/** Instagram 릴/게시물/캐러셀 (프로필에서 수집). */
export function personInstagramPosts(handle) {
  const key = String(handle || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();

  const entry = PROFILE_POSTS[key];
  if (!entry?.posts?.length) return [];

  const ranked = [...entry.posts].sort((a, b) => {
    if (a.thumbOk && !b.thumbOk) return -1;
    if (b.thumbOk && !a.thumbOk) return 1;
    return 0;
  });

  const seen = new Set();
  const out = [];
  for (const p of ranked) {
    if (!p.url || seen.has(p.url)) continue;
    seen.add(p.url);
    out.push({ url: p.url, platform: "instagram" });
  }
  return out;
}

/** 카드 커버용 공개 초상 (YouTube 없을 때). */
export function personPortraitUrl(handle) {
  const m = personMedia(handle);
  const url = m?.portrait || null;
  if (!url || url.includes("Replace_this_image")) return null;
  return url.split("?")[0];
}

/**
 * 해당 인플루언서의 n번째 콘텐츠.
 * 프로필에서 수집한 게시물 우선 → 없으면 @handle 프로필.
 */
export function pickPersonLink(handle, index = 0) {
  const key = String(handle || "")
    .replace(/^@+/, "")
    .trim();

  const ig = personInstagramPosts(key);
  if (ig.length > 0) {
    const p = ig[index % ig.length];
    return { url: p.url, platform: "instagram" };
  }

  const profile = snsUrlFor(key);
  const fallbacks = [profile, `${profile}reels/`];
  return { url: fallbacks[index % fallbacks.length], platform: "instagram" };
}

/** @deprecated YouTube 우선 (썸네일용). Instagram 전환 후에는 pickPersonLink 사용. */
export function pickPersonLinkYoutube(handle, index = 0) {
  const videos = personVideos(handle);
  if (videos.length > 0) {
    const v = videos[index % videos.length];
    return { url: v.url, platform: "youtube" };
  }
  return pickPersonLink(handle, index);
}
