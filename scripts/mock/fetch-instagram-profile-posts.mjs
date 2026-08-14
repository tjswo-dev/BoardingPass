/**
 * 등록된 인플루언서 Instagram 프로필 → 최근 게시물 shortcode 수집.
 * imginn.com 미러 HTML에서 /p/{code}/ 링크 추출 (릴·캐러셀·피드 공통).
 *
 *   node scripts/mock/fetch-instagram-profile-posts.mjs
 */
import { writeFileSync } from "fs";
import { REAL_BEAUTY_INFLUENCERS } from "./real-beauty-influencers.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36";

const MIRROR_URLS = (handle) => [
  `https://imginn.com/${handle}`,
  `https://dumpor.com/v/${handle}`,
  `https://greatfon.com/v/${handle}`,
];

function shortcodesFromHtml(html) {
  const set = new Set();
  for (const re of [
    /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]{11})/g,
    /\/(?:p|reel|tv)\/([A-Za-z0-9_-]{11})/g,
  ]) {
    let m;
    while ((m = re.exec(html))) set.add(m[1]);
  }
  return [...set];
}

async function fetchProfilePosts(handle) {
  for (const url of MIRROR_URLS(handle)) {
    try {
      const r = await fetch(url, {
        headers: { "user-agent": UA, accept: "text/html,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) continue;
      const html = await r.text();
      const codes = shortcodesFromHtml(html);
      if (codes.length > 0) {
        return { source: url, codes };
      }
    } catch {
      /* try next mirror */
    }
  }
  return { source: null, codes: [] };
}

async function verifyThumbnail(shortcode) {
  try {
    const r = await fetch(
      `https://www.instagram.com/p/${shortcode}/media/?size=l`,
      {
        headers: {
          "user-agent": UA,
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      },
    );
    const ct = r.headers.get("content-type") || "";
    return r.ok && ct.includes("image");
  } catch {
    return false;
  }
}

function instagramPostUrl(shortcode) {
  return `https://www.instagram.com/p/${shortcode}/`;
}

const out = {};
let ok = 0;
let empty = 0;

for (const [name, handle] of REAL_BEAUTY_INFLUENCERS) {
  const { source, codes } = await fetchProfilePosts(handle);
  const posts = [];

  for (const code of codes.slice(0, 8)) {
    const thumbOk = await verifyThumbnail(code);
    posts.push({
      url: instagramPostUrl(code),
      shortcode: code,
      thumbOk,
    });
    await new Promise((r) => setTimeout(r, 120));
  }

  out[handle] = { name, source, posts };

  if (posts.length > 0) {
    ok += 1;
    console.log(
      handle,
      posts.length,
      "posts",
      posts.filter((p) => p.thumbOk).length,
      "thumbOk",
      source?.replace("https://", "").slice(0, 20),
    );
  } else {
    empty += 1;
    console.log(handle, "EMPTY");
  }

  await new Promise((r) => setTimeout(r, 400));
}

writeFileSync(
  new URL("./profile-instagram-posts.json", import.meta.url),
  JSON.stringify(out, null, 2),
);

console.log(`wrote profile-instagram-posts.json (${ok}/20 with posts, ${empty} empty)`);
