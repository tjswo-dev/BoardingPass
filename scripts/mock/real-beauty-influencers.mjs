/**
 * KnownBeauty 데모 — 일본인 여성 인플루언서만.
 * Instagram 핸들은 Wikidata P2003 또는 Wikipedia 외부링크에서 확인한 것.
 */
export const REAL_BEAUTY_INFLUENCERS = [
  ["ゆうこす", "yukos0520"],
  ["藤田ニコル", "2525nicole2"],
  ["益若つばさ", "tsubasamasuwaka1013"],
  ["河北麻友子", "mayukokawakitaofficial"],
  ["水原希子", "i_am_kiko"],
  ["指原莉乃", "345insta"],
  ["渡辺直美", "watanabenaomi703"],
  ["橋本環奈", "kannahashimoto.mg"],
  ["今田美桜", "imada_mio"],
  ["吉田朱里", "_yoshida_akari"],
  ["中村里砂", "risa_doll_"],
  ["鈴木愛理", "airisuzuki_official_uf"],
  ["関根りさ", "sekine.risa"],
  ["丸山礼", "rei_maruyama"],
  ["みちょぱ", "michopa1030"],
  ["えなこ", "enakorin"],
  ["佐々木希", "nozomisasaki_official"],
  ["Cocomi", "cocomi_553_official"],
  ["新木優子", "yuuuuukko_"],
  ["フワちゃん", "fuwa876"],
];

export function snsUrlFor(handle) {
  return `https://www.instagram.com/${handle}/`;
}
