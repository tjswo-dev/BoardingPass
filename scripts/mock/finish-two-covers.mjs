import { readFileSync, writeFileSync } from "fs";

const media = JSON.parse(
  readFileSync(new URL("./person-media.json", import.meta.url), "utf8"),
);

const r = await fetch(
  "https://html.duckduckgo.com/html/?q=" +
    encodeURIComponent("河北麻友子 スリムビューティハウス site:youtube.com"),
  { headers: { "user-agent": "Mozilla/5.0" } },
);
const html = await r.text();
const re = /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/g;
const ids = [];
let m;
while ((m = re.exec(html))) {
  if (!ids.includes(m[1])) ids.push(m[1]);
}
console.log("mayuko ids", ids.slice(0, 6));

async function oembed(id) {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
  );
  if (!res.ok) return null;
  return res.json();
}

const videos = [];
for (const id of ids.slice(0, 6)) {
  const j = await oembed(id);
  if (!j) continue;
  console.log(id, j.author_name, j.title);
  if (/河北麻友子|スリムビューティ|Mayuko/i.test(j.title + j.author_name)) {
    videos.push({
      url: `https://www.youtube.com/watch?v=${id}`,
      platform: "youtube",
      author: j.author_name,
      title: j.title,
      thumb: j.thumbnail_url,
    });
  }
}

if (videos.length) {
  media.mayukokawakitaofficial.videos = videos.slice(0, 3).map((v) => ({
    url: v.url,
    platform: v.platform,
    author: v.author,
    title: v.title,
  }));
  media.mayukokawakitaofficial.cover = videos[0].thumb;
}

const imadaThumb =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Rakuten_GirlsAward_2025_AW_%E5%B9%95%E5%BC%B5%E3%83%A1%E3%83%83%E3%82%BB9-11%E3%83%9B%E3%83%BC%E3%83%AB_2025%E5%B9%B410%E6%9C%8818%E6%97%A5%E3%81%AE%E5%8D%83%E8%91%89%E5%B8%82_202510181305_IMG_8092.jpg/640px-Rakuten_GirlsAward_2025_AW_%E5%B9%95%E5%BC%B5%E3%83%A1%E3%83%83%E3%82%BB9-11%E3%83%9B%E3%83%BC%E3%83%AB_2025%E5%B9%B410%E6%9C%8818%E6%97%A5%E3%81%AE%E5%8D%83%E8%91%89%E5%B8%82_202510181305_IMG_8092.jpg";
const h = await fetch(imadaThumb, { method: "HEAD" });
console.log("imada", h.status, h.headers.get("content-type"));
if (h.ok) {
  media.imada_mio.portrait = imadaThumb;
  media.imada_mio.cover = imadaThumb;
}

writeFileSync(
  new URL("./person-media.json", import.meta.url),
  JSON.stringify(media, null, 2),
);
