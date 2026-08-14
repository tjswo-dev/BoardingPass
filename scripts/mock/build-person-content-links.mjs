/**
 * Build person-matched YouTube/Instagram content URLs for KnownBeauty demo.
 * Only keeps oembed-verified videos whose author (+ JP title when needed) match.
 *
 *   node scripts/mock/build-person-content-links.mjs
 */
import { writeFileSync } from "fs";
import { REAL_BEAUTY_INFLUENCERS, snsUrlFor } from "./real-beauty-influencers.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36";

/** Prefer channel pages over @handles when handles collide. */
const YT_SOURCES = {
  yukos0520: "https://www.youtube.com/@yukos_0520/videos",
  "2525nicole2": "https://www.youtube.com/@nicolefujita7284/videos",
  tsubasamasuwaka1013: "https://www.youtube.com/@tsubasamasuwaka/videos",
  "345insta": "https://www.youtube.com/@345chan/videos",
  watanabenaomi703:
    "https://www.youtube.com/channel/UCFFH1T9H5J7lAr4tkhjoVmw/videos",
  _yoshida_akari:
    "https://www.youtube.com/channel/UCNIwy_Q7EjUxLlsewfuhjgg/videos",
  airisuzuki_official_uf: "https://www.youtube.com/@airisuzukich/videos",
  "sekine.risa": "https://www.youtube.com/@SekineRisa/videos",
  rei_maruyama: "https://www.youtube.com/@reimaruyama/videos",
  michopa1030: "https://www.youtube.com/@mabumabu_tv/videos",
  enakorin: "https://www.youtube.com/@enako_channel/videos",
  nozomisasaki_official:
    "https://www.youtube.com/channel/UCQ2_aUkMhXnaQYd8JkkFTtA/videos",
  fuwa876: "https://www.youtube.com/@fuwachantv/videos",
};

const AUTHOR_HINT = {
  yukos0520: ["ゆうこす"],
  "2525nicole2": ["ニコル", "nicole", "fujita"],
  tsubasamasuwaka1013: ["つばさ", "tsubasa", "masuwaka"],
  i_am_kiko: ["kiko", "水原", "vogue"],
  "345insta": ["さしはら", "指原", "345"],
  watanabenaomi703: ["naomi", "渡辺", "watanabe"],
  _yoshida_akari: ["yoshidaakari", "yoshida akari", "朱里"],
  airisuzuki_official_uf: ["鈴木愛理", "airi"],
  "sekine.risa": ["sekine", "関根"],
  rei_maruyama: ["丸山", "maruyama"],
  michopa1030: ["みちょぱ", "マブマブ", "mabu"],
  enakorin: ["えなこ", "enako"],
  nozomisasaki_official: ["佐々木", "nozomi", "sasaki"],
  fuwa876: ["フワ", "fuwa"],
};

/** require JP script in title (avoids same-name foreign channels) */
const REQUIRE_JP_TITLE = new Set([
  "yukos0520",
  "2525nicole2",
  "tsubasamasuwaka1013",
  "345insta",
  "watanabenaomi703",
  "_yoshida_akari",
  "airisuzuki_official_uf",
  "sekine.risa",
  "rei_maruyama",
  "michopa1030",
  "enakorin",
  "nozomisasaki_official",
  "fuwa876",
]);

const CURATED = {
  yukos0520: ["W4ZCEWhSPWA", "HNSsCI9tcdQ"],
  "2525nicole2": ["jcBVbrHTOEQ", "nkuisqXn7y8", "xCXsq9V3Kjg"],
  tsubasamasuwaka1013: ["Uh6lmIBhGXg"],
  i_am_kiko: ["TdK7CiBpGco", "uPCMoIHpOqs"], // Vogue EN titles OK
  "345insta": ["CbFksl3R13c", "OmELSXdk4Bk"],
  watanabenaomi703: ["XY23fVyh4Y4"],
  _yoshida_akari: ["_G6vjoLV0rY", "QrgTIT86rGs", "8fKVmrlSmlE"],
  airisuzuki_official_uf: ["kdnnCQJIdUA", "do8qTPlchVo"],
  "sekine.risa": ["dzEL7aAzzOk", "Vuk5R72g5_w"],
  rei_maruyama: ["lPRxynRzwf4"],
  michopa1030: ["09xmPgqO8ks", "9Id4rtZJD5s"],
  enakorin: ["Jwn7o_Lrhs4"],
  nozomisasaki_official: ["-2h7dTFmvEo"],
  fuwa876: ["lAMLzKbGmgw"],
};

const hasJp = (s) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(s || "");

async function oembed(id) {
  const r = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (!r.ok) return null;
  return r.json();
}

function authorMatches(handle, authorName) {
  const hints = AUTHOR_HINT[handle] || [];
  const a = (authorName || "").toLowerCase().replace(/\s+/g, "");
  return hints.some((h) => a.includes(h.toLowerCase().replace(/\s+/g, "")));
}

async function scrapeIds(url) {
  const r = await fetch(url, {
    headers: { "user-agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) return [];
  const html = await r.text();
  return [
    ...new Set(
      [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]),
    ),
  ].slice(0, 15);
}

const out = {};
for (const [name, handle] of REAL_BEAUTY_INFLUENCERS) {
  const candidates = [...(CURATED[handle] || [])];
  if (YT_SOURCES[handle]) {
    try {
      candidates.push(...(await scrapeIds(YT_SOURCES[handle])));
    } catch (e) {
      console.log(handle, "scrape ERR", e.message);
    }
  }

  const seen = new Set();
  const videos = [];
  for (const id of candidates) {
    if (seen.has(id) || videos.length >= 2) continue;
    seen.add(id);
    const meta = await oembed(id);
    if (!meta) continue;
    if (!authorMatches(handle, meta.author_name)) continue;
    if (REQUIRE_JP_TITLE.has(handle) && !hasJp(meta.title)) continue;
    videos.push({
      url: `https://www.youtube.com/watch?v=${id}`,
      platform: "youtube",
      author: meta.author_name,
      title: meta.title,
      thumb: meta.thumbnail_url,
    });
  }

  const ig = {
    url: snsUrlFor(handle),
    platform: "instagram",
    author: name,
    title: `${name} Instagram`,
    thumb: null,
  };

  out[handle] = {
    name,
    videos,
    primary: videos[0] || ig,
    secondary: videos[1] || videos[0] || ig,
  };

  console.log(
    handle,
    videos[0]
      ? `${videos[0].url} | ${videos[0].author}`
      : `IG @${handle}`,
  );
  await new Promise((r) => setTimeout(r, 150));
}

writeFileSync(
  new URL("./person-content-links.json", import.meta.url),
  JSON.stringify(out, null, 2),
);
const ytCount = Object.values(out).filter((x) => x.videos.length).length;
console.log(`wrote person-content-links.json (${ytCount}/20 with YouTube)`);
