import { db, failure } from "@/lib/server";
import { coordinates } from "@/lib/model";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const tagId = String(body.tagId || "").trim().toUpperCase();
    const stage = String(body.stage || "").trim();
    const place = String(body.place || "").trim();
    const actor = String(body.actor || "").trim();
    const status = String(body.status || "");
    const latitude = body.latitude == null ? null : Number(body.latitude);
    const longitude = body.longitude == null ? null : Number(body.longitude);
    const hasLocation = latitude !== null && longitude !== null;
    if (!tagId || !["Expedição", "Checkpoint", "Recebimento"].includes(stage) || !place || !actor || place.length > 100 || actor.length > 100 || !["normal", "alert"].includes(status) || (hasLocation && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude!) > 90 || Math.abs(longitude!) > 180)) || ((latitude === null) !== (longitude === null))) {
      return Response.json({ error: "Preencha a etapa, o local, o responsável e a condição visual." }, { status: 400 });
    }
    const database = db();
    const shipment = await database.prepare("SELECT id FROM shipments WHERE tag_id = ?").bind(tagId).first<{id:string}>();
    if (!shipment) return Response.json({ error: "Etiqueta não cadastrada. Cadastre a carga primeiro." }, { status: 404 });
    const last = await database.prepare("SELECT stage, status FROM checkins WHERE shipment_id = ? ORDER BY recorded_at DESC LIMIT 1").bind(shipment.id).first<{stage:string,status:string}>();
    if (last?.stage === "Recebimento") return Response.json({ error: "Esta carga já foi recebida e encerrada." }, { status: 409 });
    if (last?.status === "alert" && status === "normal") return Response.json({ error: "Um indicador irreversível ativado não pode voltar ao estado normal." }, { status: 409 });
    const id = crypto.randomUUID();
    const recordedAt = new Date().toISOString();
    const [savedLatitude, savedLongitude] = hasLocation ? [latitude, longitude] : (coordinates[place] || [null, null]);
    await database.prepare("INSERT INTO checkins (id, shipment_id, stage, place, actor, status, latitude, longitude, location_source, recorded_at, demo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)")
      .bind(id, shipment.id, stage, place, actor, status, savedLatitude, savedLongitude, hasLocation ? "device" : "manual", recordedAt).run();
    return Response.json({ id, recordedAt }, { status: 201 });
  } catch (error) { return failure(error); }
}
