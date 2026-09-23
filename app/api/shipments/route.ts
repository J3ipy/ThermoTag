import { allShipments, db, failure } from "@/lib/server";

export async function GET() {
  try { return Response.json({ shipments: await allShipments() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const tagId = String(body.tagId || "").trim().toUpperCase();
    const product = String(body.product || "").trim();
    const origin = String(body.origin || "").trim();
    const destination = String(body.destination || "").trim();
    const threshold = Number(body.threshold);
    if (!/^[A-Z0-9-]{3,50}$/.test(tagId) || !product || !origin || !destination || !Number.isFinite(threshold) || threshold < -50 || threshold > 100 || [product, origin, destination].some((s) => s.length > 100)) {
      return Response.json({ error: "Confira o código da etiqueta e os dados da carga." }, { status: 400 });
    }
    const database = db();
    const duplicate = await database.prepare("SELECT id FROM shipments WHERE tag_id = ?").bind(tagId).first();
    if (duplicate) return Response.json({ error: "Este código de etiqueta já está em uso." }, { status: 409 });
    const id = `SE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await database.prepare("INSERT INTO shipments (id, tag_id, product, origin, destination, threshold, created_at, demo) VALUES (?, ?, ?, ?, ?, ?, ?, 0)")
      .bind(id, tagId, product, origin, destination, threshold, new Date().toISOString()).run();
    return Response.json({ id }, { status: 201 });
  } catch (error) { return failure(error); }
}
