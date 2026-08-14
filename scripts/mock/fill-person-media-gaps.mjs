/**
 * Fill remaining person-media gaps (channel scrape + commons portraits).
 *   node scripts/mock/fill-person-media-gaps.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const media = JSON.parse(
  readFileSync(new URL("./person-media.json", import.meta.url), "utf8"),
);

async function scrape(ch) {
  const r = await fetch(`https://www.youtube.com/channel/${ch}/videos`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122 Safari/537.36",
      "accept-language": "ja",
    },
    signal: AbortSignal.timeout(25000),
  });
  const html = await r.text();
  const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  const ids = [];
  let m;
  while ((m = re.exec(html))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
    if (ids.length >= 4) break;
  }
  console.log(ch, "html", html.length, "ids", ids);
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

for (const [h, ch] of Object.entries({
  i_am_kiko: "UCNJIjVuEv7_9Dv7zcmZ7nwg",
  _yoshida_akari: "UCNIwy_Q7EjUxLlsewfuhjgg",
})) {
  const ids = await scrape(ch);
  const videos = [];
  for (const id of ids) {
    const meta = await oembed(id);
    if (meta) {
      console.log(h, meta.author, meta.title);
      videos.push(meta);
    }
  }
  if (videos.length) {
    media[h].videos = videos.map((v) => ({
      url: v.url,
      platform: v.platform,
      author: v.author,
      title: v.title,
    }));
    media[h].cover = videos[0].thumb;
  }
}

const portraits = {
  cocomi_553_official:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Cocomi_Kimura_in_March_2021.png/640px-Cocomi_Kimura_in_March_2021.png",
  risa_doll_:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Super%21_C_CHANNEL_2017-_Nakamura_Risa_%2838042612411%29.jpg/640px-Super%21_C_CHANNEL_2017-_Nakamura_Risa_%2838042612411%29.jpg",
  airisuzuki_official_uf:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Airi_Suzuki_at_Japan_Expo_2013.jpg/640px-Airi_Suzuki_at_Japan_Expo_2013.jpg",
  fuwa876:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Fuwa-chan_%28cropped%29.jpg/640px-Fuwa-chan_%28cropped%29.jpg",
};

for (const [h, url] of Object.entries(portraits)) {
  media[h].portrait = url;
  if (!media[h].videos?.length) media[h].cover = url;
}

for (const h of ["imada_mio", "mayukokawakitaofficial"]) {
  if (media[h].portrait?.includes("Replace_this_image")) media[h].portrait = null;
  if (media[h].cover?.includes("Replace_this_image")) media[h].cover = null;
}

writeFileSync(
  new URL("./person-media.json", import.meta.url),
  JSON.stringify(media, null, 2),
);
console.log("updated person-media.json");
