import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

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

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { data: c } = await sb
  .from("companies")
  .select("id")
  .eq("login_id", "company")
  .single();

const { data } = await sb
  .from("allocations")
  .select(
    "id,status,influencers(name,instagram_handle),creator_links(url,platform)",
  )
  .eq("company_id", c.id);

const by = {};
for (const a of data || []) {
  const h = a.influencers?.instagram_handle;
  if (!by[h]) {
    by[h] = { name: a.influencers?.name, links: [] };
  }
  for (const l of a.creator_links || []) by[h].links.push(l);
}

for (const [h, v] of Object.entries(by).sort((a, b) =>
  a[1].name.localeCompare(b[1].name, "ja"),
)) {
  const sample = v.links[0];
  console.log(
    v.name,
    "@" + h,
    "links=" + v.links.length,
    sample ? sample.platform + " " + sample.url.slice(0, 70) : "NONE",
  );
}
