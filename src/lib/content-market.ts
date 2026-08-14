import { type CreatorPlatform } from "@/lib/creator-link";

export type ContentCountryCode = "JP" | "KR" | "CN" | "US" | "OTHER";

export type ContentCountry = {
  code: ContentCountryCode;
  label: string;
  flag: string;
};

export type ContentPlatformMeta = {
  label: string;
  shortLabel: string;
  chipClass: string;
  dotClass: string;
};

export const CONTENT_COUNTRY: Record<ContentCountryCode, ContentCountry> = {
  JP: { code: "JP", label: "일본", flag: "🇯🇵" },
  KR: { code: "KR", label: "한국", flag: "🇰🇷" },
  CN: { code: "CN", label: "중국", flag: "🇨🇳" },
  US: { code: "US", label: "미국", flag: "🇺🇸" },
  OTHER: { code: "OTHER", label: "기타", flag: "🌐" },
};

export const CONTENT_PLATFORM: Record<CreatorPlatform, ContentPlatformMeta> = {
  instagram: {
    label: "Instagram",
    shortLabel: "IG",
    chipClass: "bg-[#fce7f3] text-[#9d174d]",
    dotClass: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
  },
  tiktok: {
    label: "TikTok",
    shortLabel: "TT",
    chipClass: "bg-[#111827] text-white",
    dotClass: "bg-[#111827]",
  },
  youtube: {
    label: "YouTube",
    shortLabel: "YT",
    chipClass: "bg-[#fee2e2] text-[#b91c1c]",
    dotClass: "bg-[#ef4444]",
  },
  naver_blog: {
    label: "네이버 블로그",
    shortLabel: "NB",
    chipClass: "bg-[#dcfce7] text-[#15803d]",
    dotClass: "bg-[#22c55e]",
  },
  etc: {
    label: "기타",
    shortLabel: "etc",
    chipClass: "bg-[var(--accent-soft)] text-[var(--muted)]",
    dotClass: "bg-[var(--muted)]",
  },
};

/** 매장명·주소로 콘텐츠 노출 국가 추정 (Apify 연동 전 목업용). */
export function inferContentCountry(
  storeName?: string | null,
  storeAddress?: string | null,
): ContentCountry {
  const hay = `${storeName || ""} ${storeAddress || ""}`;
  if (/東京|大阪|京都|日本|銀座|東京都|神奈川|福岡|札幌|名古屋/.test(hay)) {
    return CONTENT_COUNTRY.JP;
  }
  if (/서울|부산|대한|한국|경기|인천|강남|홍대|명동/.test(hay)) {
    return CONTENT_COUNTRY.KR;
  }
  if (/上海|北京|中国|廣州|深圳|成都|杭州/.test(hay)) {
    return CONTENT_COUNTRY.CN;
  }
  if (/New York|Los Angeles|USA|United States|California/.test(hay)) {
    return CONTENT_COUNTRY.US;
  }
  return CONTENT_COUNTRY.JP;
}

export function countryOf(code: ContentCountryCode): ContentCountry {
  return CONTENT_COUNTRY[code] || CONTENT_COUNTRY.OTHER;
}

export function platformOf(platform: CreatorPlatform): ContentPlatformMeta {
  return CONTENT_PLATFORM[platform] || CONTENT_PLATFORM.etc;
}
