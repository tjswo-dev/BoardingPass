/**
 * Resolve Wikipedia lead images + known YouTube videos per influencer.
 *   node scripts/mock/build-person-media.mjs
 */
import { writeFileSync } from "fs";
import { REAL_BEAUTY_INFLUENCERS } from "./real-beauty-influencers.mjs";

/** handle → curated YouTube video IDs (verified via oembed when possible) */
const KNOWN_VIDEOS = {
  yukos0520: ["W4ZCEWhSPWA"],
  "2525nicole2": ["P6c_dszyZ3w", "jcBVbrHTOEQ"],
  tsubasamasuwaka1013: [], // fill from channel
  mayukokawakitaofficial: [],
  i_am_kiko: [],
  "345insta": [],
  watanabenaomi703: ["yvWptal3UQI"],
  "kannahashimoto.mg": [],
  imada_mio: [],
  _yoshida_akari: [],
  risa_doll_: [],
  airisuzuki_official_uf: [],
  "sekine.risa": ["dzEL7aAzzOk", "MRXMSfwvXMw", "nbEGKGd-wQ0"],
  rei_maruyama: [],
  michopa1030: ["09xmPgqO8ks"],
  enakorin: [],
  nozomisasaki_official: [],
  cocomi_553_official: [],
  yuuuuukko_: [],
  fuwa876: [],
};

const CHANNELS = {
  yukos0520: "UCxS4vbIvtjHQcEW61J2KQIw",
  "2525nicole2": "UC3d5tppwxYrOtv8fP8jk7nA",
  tsubasamasuwaka1013: "UCPpDtwDJqhc7tDwgBNaA8gw",
  "345insta": "UCfnSEB4atVWATf6vzepHzqw",
  watanabenaomi703: "UCFFH1T9H5J7lAr4tkhjoVmw",
  rei_maruyama: "UC0wwyS5MbDCdbLjbtOt0yew",
  michopa1030: "UCEhYhyYq-21gdYQ19hm8gWw",
  enakorin: "UCrUdiKv9LERZmG_MKh63Xgg",
  "sekine.risa": "UC__AsSnEuyVgO9TWvZE_ziA",
};

const INVIDIOUS = [
  "https://invidious.fdn.fr",
  "https://vid.puffyan.us",
  "https://yewtu.be",
  "https://invidious.privacyredirect.com",
];

async function oembed(id) {
  const r = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
  );
  if (!r.ok) return null;
  const j = await r.json();
  return {
    url: `https://www.youtube.com/watch?v=${id}`,
    platform: "youtube",
    author: j.author_name,
    title: j.title,
    thumb: j.thumbnail_url,
  };
}

async function channelVideos(channelId, limit = 4) {
  for (const base of INVIDIOUS) {
    try {
      const r = await fetch(
        `${base}/api/v1/channels/${channelId}/videos?sort_by=newest`,
        { signal: AbortSignal.timeout(12000) },
      );
      if (!r.ok) continue;
      const j = await r.json();
      const list = Array.isArray(j) ? j : j.videos || j.latestVideos || [];
      const ids = list
        .map((v) => v.videoId || v.videoID || v.id)
        .filter(Boolean)
        .slice(0, limit);
      if (ids.length) return ids;
    } catch {
      /* try next */
    }
  }
  // scrape channel page
  try {
    const r = await fetch(`https://www.youtube.com/channel/${channelId}/videos`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language": "ja,en;q=0.8",
      },
      signal: AbortSignal.timeout(20000),
    });
    const html = await r.text();
    const ids = [
      ...new Set(
        [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]),
      ),
    ].slice(0, limit);
    return ids;
  } catch {
    return [];
  }
}

/** Display name → Wikipedia title when they differ */
const WIKI_TITLE = {
  ゆうこす: "菅本裕子",
  みちょぱ: "池田美優",
  フワちゃん: "フワちゃん",
  Cocomi: "Cocomi",
  えなこ: "えなこ",
};

async function wikiThumb(name) {
  const title = WIKI_TITLE[name] || name;
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const r = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.thumbnail?.source || j.originalimage?.source || null;
}

const out = {};
for (const [name, handle] of REAL_BEAUTY_INFLUENCERS) {
  const videos = [];
  const known = KNOWN_VIDEOS[handle] || [];
  for (const id of known) {
    const meta = await oembed(id);
    if (meta) videos.push(meta);
  }
  const ch = CHANNELS[handle];
  if (ch && videos.length < 3) {
    const ids = await channelVideos(ch, 4);
    for (const id of ids) {
      if (videos.some((v) => v.url.includes(id))) continue;
      const meta = await oembed(id);
      if (meta) videos.push(meta);
      if (videos.length >= 3) break;
    }
  }
  const portrait = await wikiThumb(name);
  out[handle] = {
    name,
    portrait,
    videos: videos.map((v) => ({
      url: v.url,
      platform: v.platform,
      author: v.author,
      title: v.title,
    })),
    cover: videos[0]?.thumb || portrait,
  };
  console.log(
    handle,
    videos.length ? videos[0].author : "no-yt",
    portrait ? "portrait" : "no-portrait",
    videos.map((v) => v.url).join(" | ") || "-",
  );
  await new Promise((r) => setTimeout(r, 500));
}

writeFileSync(
  new URL("./person-media.json", import.meta.url),
  JSON.stringify(out, null, 2),
);
console.log("wrote person-media.json");
