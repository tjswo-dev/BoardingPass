/**
 * Scrape a few more official channels into person-media.json
 *   node scripts/mock/scrape-more-channels.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const media = JSON.parse(
  readFileSync(new URL("./person-media.json", import.meta.url), "utf8"),
);

const CHANNELS = {
  fuwa876: "UC1B51m7HSWGpm_qDDgoIeqA",
  // 鈴木愛理 Official YouTube (from common knowledge / search)
  airisuzuki_official_uf: "UCxxxxxxxx", // filled below via @ page
};

async function resolveAt(at) {
  const r = await fetch(`https://www.youtube.com/@${at}/videos`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122 Safari/537.36",
    },
    signal: AbortSignal.timeout(25000),
  });
  const html = await r.text();
  const ch = html.match(/"channelId":"(UC[\w-]{22})"/);
  const ids = [];
  const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  let m;
  while ((m = re.exec(html))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
    if (ids.length >= 4) break;
  }
  return { channelId: ch?.[1] || null, ids, bytes: html.length };
}

async function scrape(ch) {
  const r = await fetch(`https://www.youtube.com/channel/${ch}/videos`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122 Safari/537.36",
    },
    signal: AbortSignal.timeout(25000),
  });
  const html = await r.text();
  const ids = [];
  const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  let m;
  while ((m = re.exec(html))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
    if (ids.length >= 4) break;
  }
  return ids;
}

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

async function apply(handle, ids) {
  const videos = [];
  for (const id of ids) {
    const meta = await oembed(id);
    if (meta) {
      console.log(handle, meta.author, meta.title.slice(0, 40));
      videos.push(meta);
    }
  }
  if (!videos.length) return;
  media[handle].videos = videos.map((v) => ({
    url: v.url,
    platform: v.platform,
    author: v.author,
    title: v.title,
  }));
  media[handle].cover = videos[0].thumb;
}

const fuwaIds = await scrape(CHANNELS.fuwa876);
await apply("fuwa876", fuwaIds);

for (const [handle, at] of [
  ["airisuzuki_official_uf", "airisuzuki_uf"],
  ["airisuzuki_official_uf", "airisuzuki"],
  ["mayukokawakitaofficial", "mayukokawakita"],
  ["imada_mio", "imada_mio"],
  ["kannahashimoto.mg", "kannahashimoto"],
]) {
  if (media[handle]?.videos?.length) continue;
  const { channelId, ids, bytes } = await resolveAt(at);
  console.log(handle, "@" + at, channelId, bytes, ids);
  if (ids.length) await apply(handle, ids);
  await new Promise((r) => setTimeout(r, 600));
}

writeFileSync(
  new URL("./person-media.json", import.meta.url),
  JSON.stringify(media, null, 2),
);
console.log("done");
