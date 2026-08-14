/**
 * 데모용 프로필/카드 커버 초상 맵.
 * YouTube 썸네일이 없을 때 해당 인물 공개 사진으로 폴백.
 */
const DEMO_AVATARS: Record<string, string> = {
  yukos0520:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Super%21_C_CHANNEL_2019_Sugamoto_Yuko_%2848804431372%29.jpg/640px-Super%21_C_CHANNEL_2019_Sugamoto_Yuko_%2848804431372%29.jpg",
  i_am_kiko:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Mizuhara_Kiko_from_%22Adabana%22_at_Red_Carpet_of_the_Tokyo_International_Film_Festival_2024_%2854577055102%29.jpg/640px-Mizuhara_Kiko_from_%22Adabana%22_at_Red_Carpet_of_the_Tokyo_International_Film_Festival_2024_%2854577055102%29.jpg",
  "345insta":
    "https://upload.wikimedia.org/wikipedia/commons/2/25/Rino_Sashihara_in_2018.JPG",
  watanabenaomi703:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Naomi_Watanabe_%281%29.jpg/640px-Naomi_Watanabe_%281%29.jpg",
  "kannahashimoto.mg":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Hashimoto_Kanna_at_Opening_Ceremony_of_the_Tokyo_International_Film_Festival_2017_%2839304102215%29_%28cropped%29.jpg/640px-Hashimoto_Kanna_at_Opening_Ceremony_of_the_Tokyo_International_Film_Festival_2017_%2839304102215%29_%28cropped%29.jpg",
  _yoshida_akari:
    "https://upload.wikimedia.org/wikipedia/commons/9/96/20190606yoshimoto_7_%E5%90%89%E7%94%B0%E6%9C%B1%E9%87%8C.jpg",
  risa_doll_:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Super%21_C_CHANNEL_2017-_Nakamura_Risa_%2838042612411%29.jpg/640px-Super%21_C_CHANNEL_2017-_Nakamura_Risa_%2838042612411%29.jpg",
  airisuzuki_official_uf:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Airi_Suzuki_at_Japan_Expo_2013.jpg/640px-Airi_Suzuki_at_Japan_Expo_2013.jpg",
  nozomisasaki_official:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Kong-_Skull_Island_Japan_Premiere_Red_Carpet-_GACKT%2C_Sasaki_Nozomi_02.jpg/640px-Kong-_Skull_Island_Japan_Premiere_Red_Carpet-_GACKT%2C_Sasaki_Nozomi_02.jpg",
  cocomi_553_official:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Cocomi_Kimura_in_March_2021.png/640px-Cocomi_Kimura_in_March_2021.png",
  yuuuuukko_:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/%E6%96%B0%E6%9C%A8%E5%84%AA%E5%AD%90.png/640px-%E6%96%B0%E6%9C%A8%E5%84%AA%E5%AD%90.png",
  fuwa876:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Fuwa-chan_%28cropped%29.jpg/640px-Fuwa-chan_%28cropped%29.jpg",
  imada_mio:
    "https://upload.wikimedia.org/wikipedia/commons/0/04/Rakuten_GirlsAward_2025_AW_%E5%B9%95%E5%BC%B5%E3%83%A1%E3%83%83%E3%82%BB9-11%E3%83%9B%E3%83%BC%E3%83%AB_2025%E5%B9%B410%E6%9C%8818%E6%97%A5%E3%81%AE%E5%8D%83%E8%91%89%E5%B8%82_202510181305_IMG_8092.jpg",
  // 공개 초상 부족 → Instagram CDN 폴백 (데모 전용)
  mayukokawakitaofficial:
    "https://unavatar.io/instagram/mayukokawakitaofficial",
};

export function demoAvatarUrl(handle: string): string | null {
  const key = handle.replace(/^@+/, "").trim().toLowerCase();
  return DEMO_AVATARS[key] || null;
}
