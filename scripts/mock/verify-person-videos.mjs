/**
 * Verify candidate YouTube video IDs with oembed; pull RSS for known channel IDs.
 *   node scripts/mock/verify-person-videos.mjs
 */
import { writeFileSync } from "fs";

const CANDIDATES = {
  yukos0520: {
    channels: ["UCxS4vbIvtjHQcEW61J2KQIw"],
    videos: ["W4ZCEWhSPWA"],
  },
  "2525nicole2": {
    channels: ["UC3d5tppwxYrOtv8fP8jk7nA"],
    videos: ["P6c_dszyZ3w", "jcBVbrHTOEQ"],
  },
  tsubasamasuwaka1013: {
    channels: [],
    videos: [],
    searchNames: ["益若つばさ"],
  },
  mayukokawakitaofficial: { channels: [], videos: [] },
  i_am_kiko: { channels: ["UCm6jVhC5zpDuNuZYnWRdfdQ"], videos: [] },
  "345insta": { channels: ["UCJIvEMaaIp9NImCsAveSoew"], videos: [] },
  watanabenaomi703: {
    channels: ["UCFFH1T9H5J7lAr4tkhjoVmw"],
    videos: ["yvWptal3UQI"],
  },
  "kannahashimoto.mg": {
    channels: ["UC1dtcwJdLwPpXVhrD4Ulsbg"],
    videos: [],
  },
  imada_mio: { channels: [], videos: [] },
  _yoshida_akari: {
    channels: ["UCf1yPMDYnNj_vQWY0Xbw8zQ"],
    videos: [],
  },
  risa_doll_: { channels: ["UC74_rsoFufbYIUBr8QFCPdQ"], videos: [] },
  airisuzuki_official_uf: { channels: [], videos: [] },
  "sekine.risa": {
    channels: ["UC__AsSnEuyVgO9TWvZE_ziA"],
    videos: ["dzEL7aAzzOk", "MRXMSfwvXMw"],
  },
  rei_maruyama: { channels: [], videos: [] },
  michopa1030: {
    channels: ["UCEhYhyYq-21gdYQ19hm8gWw"],
    videos: ["09xmPgqO8ks"],
  },
  enakorin: { channels: [], videos: [] },
  nozomisasaki_official: { channels: [], videos: [] },
  cocomi_553_official: {
    channels: ["UCalz7lIcxHn4y2lNcUUHL0A"],
    videos: [],
  },
  yuuuuukko_: { channels: ["UCDC7-sNHu-ui3wqCbDVq9jg"], videos: [] },
  fuwa876: { channels: [], videos: [] },
};

async function oembed(id) {
  const r = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
  );
  if (!r.ok) return null;
  const j = await r.json();
  return { id, author: j.author_name, title: j.title, thumb: j.thumbnail_url };
}

async function rssVideos(channelId) {
  const r = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; BoardingPassDemo/1.0; +https://localhost)",
        accept: "application/atom+xml,application/xml,text/xml,*/*",
      },
      signal: AbortSignal.timeout(20000),
    },
  );
  const xml = await r.text();
  const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map(
    (m) => m[1],
  );
  return { status: r.status, ids: ids.slice(0, 5), len: xml.length };
}

const out = {};
for (const [handle, cfg] of Object.entries(CANDIDATES)) {
  const entry = { videos: [], rss: [] };
  for (const ch of cfg.channels || []) {
    const rss = await rssVideos(ch);
    entry.rss.push({ channelId: ch, ...rss });
    for (const id of rss.ids) {
      const meta = await oembed(id);
      if (meta) entry.videos.push(meta);
    }
  }
  for (const id of cfg.videos || []) {
    if (entry.videos.some((v) => v.id === id)) continue;
    const meta = await oembed(id);
    if (meta) entry.videos.push(meta);
  }
  out[handle] = entry;
  console.log(
    handle,
    "rss",
    entry.rss.map((r) => `${r.channelId}:${r.status}/${r.ids.length}`).join(","),
    "vids",
    entry.videos.map((v) => `${v.id}(${v.author})`).join(" | ") || "NONE",
  );
  await new Promise((r) => setTimeout(r, 400));
}

writeFileSync(
  new URL("./verified-person-videos.json", import.meta.url),
  JSON.stringify(out, null, 2),
);
