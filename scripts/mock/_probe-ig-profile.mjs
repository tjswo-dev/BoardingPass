import { REAL_BEAUTY_INFLUENCERS } from "./real-beauty-influencers.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const IG_APP_ID = "936619743392459";

function extractShortcodes(html) {
  const codes = new Set();
  for (const re of [
    /"shortcode":"([A-Za-z0-9_-]{11})"/g,
    /"code":"([A-Za-z0-9_-]{11})"/g,
    /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]{11})/g,
  ]) {
    let m;
    while ((m = re.exec(html))) codes.add(m[1]);
  }
  return [...codes];
}

async function viaWebProfileInfo(handle) {
  const r = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    {
      headers: {
        "user-agent": UA,
        "x-ig-app-id": IG_APP_ID,
        "x-requested-with": "XMLHttpRequest",
        accept: "*/*",
      },
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!r.ok) return { status: r.status, codes: [] };
  const j = await r.json();
  const edges =
    j?.data?.user?.edge_owner_to_timeline_media?.edges ||
    j?.data?.user?.edge_felix_video_timeline?.edges ||
    [];
  const items = edges.map((e) => {
    const n = e.node;
    const code = n?.shortcode;
    const isVideo = n?.is_video || n?.__typename === "GraphVideo";
    const thumb =
      n?.thumbnail_src ||
      n?.display_url ||
      n?.thumbnail_resources?.slice(-1)?.[0]?.src;
    const url = code
      ? isVideo
        ? `https://www.instagram.com/reel/${code}/`
        : `https://www.instagram.com/p/${code}/`
      : null;
    return { code, url, thumb, isVideo, typename: n?.__typename };
  }).filter((x) => x.url);
  return { status: r.status, items };
}

async function viaJina(handle) {
  const r = await fetch(`https://r.jina.ai/https://www.instagram.com/${handle}/`, {
    headers: { accept: "text/plain" },
    signal: AbortSignal.timeout(30000),
  });
  const t = await r.text();
  const codes = extractShortcodes(t);
  return { status: r.status, codes, len: t.length };
}

async function viaHtml(handle) {
  const r = await fetch(`https://www.instagram.com/${handle}/`, {
    headers: { "user-agent": UA, "accept-language": "ja,en;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const t = await r.text();
  return { status: r.status, codes: extractShortcodes(t), len: t.length };
}

const handle = process.argv[2] || "yukos0520";
console.log("===", handle, "===");
console.log("web_profile_info", JSON.stringify(await viaWebProfileInfo(handle), null, 2).slice(0, 2000));
console.log("jina codes", await viaJina(handle));
console.log("html codes", await viaHtml(handle));
