const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36";

function codesFromHtml(html) {
  const set = new Set();
  for (const re of [
    /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]{11})/g,
    /\/(?:p|reel|tv)\/([A-Za-z0-9_-]{11})/g,
  ]) {
    let m;
    while ((m = re.exec(html))) set.add(m[1]);
  }
  return [...set];
}

async function tryUrl(label, url, headers = {}) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, ...headers },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    const t = await r.text();
    const codes = codesFromHtml(t);
    console.log(label, r.status, "len", t.length, "codes", codes.slice(0, 6));
    return codes;
  } catch (e) {
    console.log(label, "ERR", e.message);
    return [];
  }
}

const handle = process.argv[2] || "yukos0520";
await tryUrl("picuki", `https://www.picuki.com/profile/${handle}`);
await tryUrl("imginn", `https://imginn.com/${handle}`);
await tryUrl("gramhir", `https://gramhir.com/profile/${handle}`);
await tryUrl("dumpor", `https://dumpor.com/v/${handle}`);
await tryUrl("greatfon", `https://greatfon.com/v/${handle}`);
