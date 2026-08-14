/**
 * KnownBeauty creator_links 를 인플루언서 본인 Instagram 콘텐츠 URL 로 교체.
 *
 *   node scripts/mock/patch-real-links.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { pickPersonLink } from "./real-person-content.mjs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
      ];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function uniqueInstagramLinks(handle, count) {
  const used = new Set();
  const out = [];
  for (let i = 0; i < count; i += 1) {
    let n = 0;
    let payload = pickPersonLink(handle, i);
    while (used.has(payload.url) && n < 8) {
      n += 1;
      payload = pickPersonLink(handle, i + n);
    }
    if (used.has(payload.url)) {
      payload = {
        url: `https://www.instagram.com/${handle}/?demo=${used.size}`,
        platform: "instagram",
      };
    }
    used.add(payload.url);
    out.push(payload);
  }
  return out;
}

const { data: company, error: companyError } = await supabase
  .from("companies")
  .select("id")
  .eq("login_id", "company")
  .maybeSingle();
if (companyError) throw companyError;
if (!company?.id) throw new Error("KnownBeauty company not found");

const { data: allocs, error } = await supabase
  .from("allocations")
  .select(
    "id, influencer_id, influencers(instagram_handle, name), creator_links(id, url, platform)",
  )
  .eq("company_id", company.id)
  .order("visit_date", { ascending: true });
if (error) throw error;

let updated = 0;
const byPlat = { instagram: 0, tiktok: 0, youtube: 0, etc: 0 };
const samples = [];

for (const a of allocs || []) {
  const handle = a.influencers?.instagram_handle || "";
  const links = [...(a.creator_links || [])].sort((x, y) =>
    String(x.id).localeCompare(String(y.id)),
  );
  if (!handle || links.length === 0) continue;

  const payloads = uniqueInstagramLinks(handle, links.length);

  for (let i = 0; i < links.length; i += 1) {
    const temp = `https://example.invalid/boardingpass-temp/${a.id}/${links[i].id}`;
    const { error: tmpErr } = await supabase
      .from("creator_links")
      .update({ url: temp, updated_at: new Date().toISOString() })
      .eq("id", links[i].id);
    if (tmpErr) throw tmpErr;
  }

  for (let i = 0; i < links.length; i += 1) {
    const payload = payloads[i];
    const { error: upd } = await supabase
      .from("creator_links")
      .update({
        url: payload.url,
        platform: payload.platform,
        updated_at: new Date().toISOString(),
      })
      .eq("id", links[i].id);
    if (upd) throw upd;
    byPlat[payload.platform] = (byPlat[payload.platform] || 0) + 1;
    updated += 1;
    if (samples.length < 8) {
      samples.push({
        name: a.influencers?.name,
        handle,
        ...payload,
      });
    }
  }
}

console.log(JSON.stringify({ updated, byPlat, samples }, null, 2));
