/**
 * Wikidata P18 portraits for JP female demo influencers → stable card thumbs.
 *   node scripts/mock/resolve-person-portraits.mjs
 */
import { writeFileSync } from "fs";

const PEOPLE = [
  ["yukos0520", "Q5359606"],
  ["2525nicole2", "Q20859398"],
  ["tsubasamasuwaka1013", "Q11581294"],
  ["mayukokawakitaofficial", "Q8977834"],
  ["i_am_kiko", "Q1051455"],
  ["345insta", "Q181881"],
  ["watanabenaomi703", "Q706671"],
  ["kannahashimoto.mg", "Q15147328"],
  ["imada_mio", "Q30923595"],
  ["_yoshida_akari", "Q2909691"],
  ["risa_doll_", "Q17229483"],
  ["airisuzuki_official_uf", "Q1143678"],
  ["sekine.risa", "Q109287900"],
  ["rei_maruyama", "Q26044847"],
  ["michopa1030", "Q22124702"],
  ["enakorin", "Q8951402"],
  ["nozomisasaki_official", "Q465236"],
  ["cocomi_553_official", "Q88311634"],
  ["yuuuuukko_", "Q17193197"],
  ["fuwa876", "Q60989434"],
];

async function portraitUrl(qid) {
  const r = await fetch(
    `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!r.ok) return null;
  const j = await r.json();
  const claims = j.entities?.[qid]?.claims?.P18;
  if (!claims?.[0]) return null;
  const file = claims[0].mainsnak.datavalue.value;
  // Special:FilePath redirects to upload.wikimedia.org
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;
}

const out = {};
for (const [handle, qid] of PEOPLE) {
  try {
    const url = await portraitUrl(qid);
    out[handle] = url;
    console.log(handle, url || "NONE");
  } catch (e) {
    out[handle] = null;
    console.log(handle, "ERR", e.message);
  }
  await new Promise((r) => setTimeout(r, 600));
}

writeFileSync(
  new URL("./person-portraits.json", import.meta.url),
  JSON.stringify(out, null, 2),
);
