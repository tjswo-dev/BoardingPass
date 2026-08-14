import { resolveContentThumbnail } from "@/lib/content-thumbnail-resolve";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentUrl = searchParams.get("url")?.trim();
  const handle = searchParams.get("handle")?.trim() || null;

  if (!contentUrl) {
    return new Response("url required", { status: 400 });
  }

  try {
    new URL(contentUrl);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  const resolved = await resolveContentThumbnail(contentUrl, handle);

  if (resolved.kind === "redirect") {
    return Response.redirect(resolved.location, 302);
  }

  return new Response(resolved.bytes, {
    headers: {
      "Content-Type": resolved.contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
