import { env } from "cloudflare:workers";
import { db, failure } from "@/lib/server";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
    const row = await db().prepare("SELECT photo_key AS photoKey FROM checkins WHERE id = ?").bind(id).first<{photoKey:string|null}>();
    if (!row?.photoKey || !env.BUCKET) return new Response(null, { status: 404 });
    const object = await env.BUCKET.get(row.photoKey);
    if (!object) return new Response(null, { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
