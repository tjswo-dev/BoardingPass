/**
 * Resolve person-matched YouTube videos via DuckDuckGo + oembed.
 *   node scripts/mock/resolve-person-youtube.mjs
 */
import { writeFileSync } from "fs";

const PEOPLE = [
  ["yukos0520", "ゆうこす モテちゃんねる"],
  ["2525nicole2", "藤田ニコル 毎日メイク"],
  ["tsubasamasuwaka1013", "益若つばさ YouTube"],
  ["mayukokawakitaofficial", "河北麻友子 YouTube"],
  ["i_am_kiko", "水原希子 YouTube"],
  ["345insta", "指原莉乃 YouTube"],
  ["watanabenaomi703", "渡辺直美 YouTube"],
  ["kannahashimoto.mg", "橋本環奈 YouTube"],
  ["imada_mio", "今田美桜 YouTube"],
  ["_yoshida_akari", "吉田朱里 YouTube"],
  ["risa_doll_", "中村里砂 YouTube"],
  ["airisuzuki_official_uf", "鈴木愛理 YouTube"],
  ["sekine.risa", "関根りさ YouTube"],
  ["rei_maruyama", "丸山礼 YouTube"],
  ["michopa1030", "みちょぱ マブマブTV"],
  ["enakorin", "えなこ YouTube"],
  ["nozomisasaki_official", "佐々木希 YouTube"],
  ["cocomi_553_official", "Cocomi flute YouTube"],
  ["yuuuuukko_", "新木優子 YouTube"],
  ["fuwa876", "フワちゃん YouTube"],
];

async function oembed(id) {
  const r = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
  );
  if (!r.ok) return null;
  return r.json();
}

function extractIds(html) {
  const re =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/g;
  const ids = [];
  let m;
  while ((m = re.exec(html))) ids.push(m[1]);
  return [...new Set(ids)];
}

const out = {};
for (const [handle, query] of PEOPLE) {
  let found = null;
  try {
    const r = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " site:youtube.com")}`,
      {
        headers: { "user-agent": "Mozilla/5.0 BoardingPassDemo/1.0" },
        signal: AbortSignal.timeout(20000),
      },
    );
    const html = await r.text();
    const ids = extractIds(html).slice(0, 8);
    for (const id of ids) {
      const j = await oembed(id);
      if (!j) continue;
      found = {
        url: `https://www.youtube.com/watch?v=${id}`,
        platform: "youtube",
        author: j.author_name,
        title: j.title,
        thumb: j.thumbnail_url,
      };
      break;
    }
  } catch (e) {
    found = { error: String(e.message || e) };
  }
  out[handle] = found;
  console.log(
    handle,
    found?.url
      ? `${found.url} | ${found.author}`
      : found?.error || "NONE",
  );
  await new Promise((r) => setTimeout(r, 900));
}

writeFileSync(
  new URL("./person-content-links.json", import.meta.url),
  JSON.stringify(out, null, 2),
);
console.log("wrote person-content-links.json");
