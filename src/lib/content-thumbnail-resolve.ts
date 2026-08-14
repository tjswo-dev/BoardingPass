import { demoAvatarUrl } from "@/lib/demo-avatars";
import {
  instagramShortcode,
  youtubeVideoId,
} from "@/lib/content-thumbnail";

const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function instagramProfileHandle(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.includes("instagram.com") && host !== "instagr.am") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const head = parts[0].toLowerCase();
    if (["reel", "p", "tv", "reels", "stories", "explore", "tags"].includes(head)) {
      return null;
    }
    return parts[0].replace(/^@+/, "") || null;
  } catch {
    return null;
  }
}

export function portraitFallbackUrl(handle: string): string {
  const key = handle.replace(/^@+/, "").trim();
  const demo = demoAvatarUrl(key);
  if (demo && !demo.includes("unavatar.io")) return demo;
  return `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(key || "creator")}&size=640&backgroundColor=d4ebe1,e8eef0,f5ede3`;
}

async function readImageResponse(r: Response): Promise<{
  bytes: ArrayBuffer;
  contentType: string;
} | null> {
  if (!r.ok) return null;
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("image")) return null;
  return {
    bytes: await r.arrayBuffer(),
    contentType: ct.split(";")[0]?.trim() || "image/jpeg",
  };
}

/** Instagram 릴/게시물 → CDN JPEG (서버에서 /media 리다이렉트 추적). */
export async function resolveInstagramPostImage(contentUrl: string) {
  const code = instagramShortcode(contentUrl);
  if (!code) return null;
  try {
    const r = await fetch(
      `https://www.instagram.com/p/${code}/media/?size=l`,
      {
        headers: {
          "user-agent": FETCH_UA,
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      },
    );
    return readImageResponse(r);
  } catch {
    return null;
  }
}

export async function resolveRemoteImage(imageUrl: string) {
  try {
    const r = await fetch(imageUrl, {
      headers: { "user-agent": FETCH_UA, accept: "image/*,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    return readImageResponse(r);
  } catch {
    return null;
  }
}

export type ThumbnailResolveResult =
  | { kind: "image"; bytes: ArrayBuffer; contentType: string }
  | { kind: "redirect"; location: string };

/** 콘텐츠 URL → 썸네일 (항상 image 또는 redirect 로 응답 가능). */
export async function resolveContentThumbnail(
  contentUrl: string,
  handleHint?: string | null,
): Promise<ThumbnailResolveResult> {
  const yt = youtubeVideoId(contentUrl);
  if (yt) {
    return {
      kind: "redirect",
      location: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  const igPost = await resolveInstagramPostImage(contentUrl);
  if (igPost) {
    return { kind: "image", ...igPost };
  }

  const handle =
    handleHint?.replace(/^@+/, "").trim() ||
    instagramProfileHandle(contentUrl) ||
    "creator";

  const portrait = portraitFallbackUrl(handle);
  const remote = await resolveRemoteImage(portrait);
  if (remote) {
    return { kind: "image", ...remote };
  }

  return { kind: "redirect", location: portrait };
}
