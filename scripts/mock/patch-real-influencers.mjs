/**
 * KnownBeauty 시드 인플루언서의 이름·핸들·프로필 URL 을
 * 실제 공개 뷰티 인플루언서 Instagram 으로 교체.
 *
 *   node scripts/mock/patch-real-influencers.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import {
  REAL_BEAUTY_INFLUENCERS,
  snsUrlFor,
} from "./real-beauty-influencers.mjs";

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

const { data: rows, error } = await supabase
  .from("influencers")
  .select("id, name, instagram_handle, notes")
  .eq("notes", "seed:knownbeauty-jp")
  .order("created_at", { ascending: true });
if (error) throw error;

const list = rows || [];
if (list.length === 0) {
  console.log("seed:knownbeauty-jp influencers not found");
  process.exit(0);
}

const n = Math.min(list.length, REAL_BEAUTY_INFLUENCERS.length);

// unique(instagram_handle_normalized) 충돌 방지: 먼저 임시 핸들로 비움
for (let i = 0; i < n; i += 1) {
  const { error: tmpErr } = await supabase
    .from("influencers")
    .update({
      instagram_handle: `__kb_tmp_${i}_${Date.now()}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", list[i].id);
  if (tmpErr) throw tmpErr;
}

const updated = [];
for (let i = 0; i < n; i += 1) {
  const [name, handle] = REAL_BEAUTY_INFLUENCERS[i];
  const { data, error: upd } = await supabase
    .from("influencers")
    .update({
      name,
      instagram_handle: handle,
      sns_url: snsUrlFor(handle),
      updated_at: new Date().toISOString(),
    })
    .eq("id", list[i].id)
    .select("id, name, instagram_handle, sns_url")
    .single();
  if (upd) throw upd;
  updated.push(data);
}

console.log(
  JSON.stringify(
    {
      matched: list.length,
      updated: updated.length,
      sample: updated.slice(0, 3),
    },
    null,
    2,
  ),
);
