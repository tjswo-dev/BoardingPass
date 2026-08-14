import { writeFileSync } from "fs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36";
const handle = process.argv[2] || "yukos0520";

const r = await fetch(`https://www.instagram.com/${handle}/`, {
  headers: { "user-agent": UA, "accept-language": "ja,en;q=0.8" },
});
const html = await r.text();

const patterns = [
  ["shortcode", /shortcode/g],
  ["edge_owner", /edge_owner_to_timeline_media/g],
  ["xdt_user", /xdt_user/g],
  ["polaris", /PolarisProfilePostsTabContent/g],
  ["reel/", /\/reel\/[A-Za-z0-9_-]{11}/g],
  ["/p/", /\/p\/[A-Za-z0-9_-]{11}/g],
  ["media_id", /"media_id":"(\d+)"/g],
];

for (const [name, re] of patterns) {
  const m = html.match(re);
  console.log(name, m ? (Array.isArray(m) ? m.length : 1) : 0, m?.slice?.(0, 3));
}

// try parse embedded json
const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
console.log("ld+json scripts", scripts.length);

const jsonChunks = [...html.matchAll(/"shortcode":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]);
console.log("shortcode quotes", jsonChunks.length, jsonChunks.slice(0, 5));

// look for escaped
const esc = [...html.matchAll(/\\"shortcode\\":\\"([A-Za-z0-9_-]{11})\\"/g)].map((m) => m[1]);
console.log("escaped shortcode", esc.length, esc.slice(0, 5));

// save snippet around first 'shortcode' if any
const idx = html.indexOf("shortcode");
console.log("first shortcode idx", idx);
if (idx > 0) console.log(html.slice(idx - 50, idx + 200));

writeFileSync(`scripts/mock/_ig-html-${handle}.txt`, html.slice(0, 50000));
