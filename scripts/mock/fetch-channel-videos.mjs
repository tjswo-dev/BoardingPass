/**
 * Fetch latest public videos from known YouTube channels (RSS, no API key).
 *   node scripts/mock/fetch-channel-videos.mjs
 */
import { writeFileSync } from "fs";

/** handle → YouTube channel id or @handle */
const CHANNELS = {
  yukos0520: "UCxS4vbIvtjHQcEW61J2KQIw",
  "2525nicole2": "@nicolefujita",
  tsubasamasuwaka1013: "@tsubasamasuwaka",
  mayukokawakitaofficial: "@mayukokawakita",
  i_am_kiko: "@KikoMizuhara",
  "345insta": "@345insta",
  watanabenaomi703: "@naomiclub5656",
  "kannahashimoto.mg": "@hashimotokanna",
  imada_mio: "@imadamio",
  _yoshida_akari: "@akariyoshida",
  risa_doll_: "@risanaka",
  airisuzuki_official_uf: "@airisuzuki_official",
  "sekine.risa": "@sekinerisa",
  rei_maruyama: "@reimaruyama",
  michopa1030: "UCEhYhyYq-21gdYQ19hm8gWw",
  enakorin: "@enako_official",
  nozomisasaki_official: "@nozomisasaki",
  cocomi_553_official: "@cocomi_official",
  yuuuuukko_: "@yukoaraki",
  fuwa876: "@fuwachan",
};

async function resolveChannelId(ref) {
  if (ref.startsWith("UC") && ref.length >= 20) return ref;
  const url = ref.startsWith("@")
    ? `https://www.youtube.com/${ref}/videos`
    : `https://www.youtube.com/channel/${ref}/videos`;
  const r = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept-language": "ja,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const html = await r.text();
  const m =
    html.match(/"channelId":"(UC[\w-]{22})"/) ||
    html.match(/\/channel\/(UC[\w-]{22})/);
  return m?.[1] || null;
}

async function videosFromRss(channelId, limit = 4) {
  const r = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!r.ok) return [];
  const xml = await r.text();
  const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map(
    (m) => m[1],
  );
  const titles = [...xml.matchAll(/<title>([^<]+)<\/title>/g)]
    .map((m) => m[1])
    .slice(1); // first title is channel
  return ids.slice(0, limit).map((id, i) => ({
    url: `https://www.youtube.com/watch?v=${id}`,
    platform: "youtube",
    title: titles[i] || id,
  }));
}

async function oembedAuthor(url) {
  const r = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );
  if (!r.ok) return null;
  const j = await r.json();
  return j.author_name || null;
}

const out = {};
for (const [handle, ref] of Object.entries(CHANNELS)) {
  try {
    const channelId = await resolveChannelId(ref);
    if (!channelId) {
      out[handle] = { error: "no channel id", ref };
      console.log(handle, "NO_CHANNEL", ref);
      continue;
    }
    const videos = await videosFromRss(channelId, 4);
    let author = null;
    if (videos[0]) author = await oembedAuthor(videos[0].url);
    out[handle] = { channelId, author, videos };
    console.log(
      handle,
      channelId,
      author || "-",
      videos.map((v) => v.url).join(" | ") || "NO_VIDEOS",
    );
  } catch (e) {
    out[handle] = { error: String(e.message || e), ref };
    console.log(handle, "ERR", e.message);
  }
  await new Promise((r) => setTimeout(r, 700));
}

writeFileSync(
  new URL("./person-youtube.json", import.meta.url),
  JSON.stringify(out, null, 2),
);
console.log("wrote person-youtube.json");
