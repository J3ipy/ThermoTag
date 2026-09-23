import { db, failure } from "@/lib/server";
import { coordinates } from "@/lib/model";
import { classifyColor } from "@/lib/color";
import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const tagId = String(body.tagId || "").trim().toUpperCase();
    const stage = String(body.stage || "").trim();
    const place = String(body.place || "").trim();
    const actor = String(body.actor || "").trim();
    const status = String(body.status || "");
    const id = String(body.id || "");
    const photo = String(body.photo || "");
    const sampledColor = String(body.sampledColor || "");
    const justification = String(body.justification || "").trim();
    const capturedAt = String(body.capturedAt || "");
    const latitude = body.latitude == null ? null : Number(body.latitude);
    const longitude = body.longitude == null ? null : Number(body.longitude);
    const hasLocation = latitude !== null && longitude !== null;
    if (!/^[A-Z0-9-]{3,50}$/.test(tagId) || !["Expedição", "Checkpoint", "Recebimento"].includes(stage) || !place || !actor || place.length > 100 || actor.length > 100 || !["normal", "alert"].includes(status) || (hasLocation && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude!) > 90 || Math.abs(longitude!) > 180)) || ((latitude === null) !== (longitude === null))) {
      return Response.json({ error: "Preencha a etapa, o local, o responsável e a condição visual." }, { status: 400 });
    }
    if (!/^[0-9a-f-]{36}$/i.test(id) || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo) || photo.length > 250000 || !/^#[0-9a-f]{6}$/i.test(sampledColor) || !Number.isFinite(Date.parse(capturedAt)) || justification.length > 300) {
      return Response.json({ error: "Foto e amostra de cor são obrigatórias; tente fotografar novamente." }, { status: 400 });
    }
    const database = db();
    const existing = await database.prepare("SELECT id, recorded_at AS recordedAt FROM checkins WHERE id = ?").bind(id).first<{id:string;recordedAt:string}>();
    if (existing) return Response.json(existing);
    const shipment = await database.prepare("SELECT id FROM shipments WHERE tag_id = ?").bind(tagId).first<{id:string}>();
    if (!shipment) return Response.json({ error: "Etiqueta não cadastrada. Cadastre a carga primeiro." }, { status: 404 });
    const last = await database.prepare("SELECT stage, status FROM checkins WHERE shipment_id = ? ORDER BY COALESCE(captured_at, recorded_at) DESC LIMIT 1").bind(shipment.id).first<{stage:string,status:string}>();
    if (last?.stage === "Recebimento") return Response.json({ error: "Esta carga já foi recebida e encerrada." }, { status: 409 });
    if (status === "normal" && await database.prepare("SELECT id FROM checkins WHERE shipment_id = ? AND status = 'alert' LIMIT 1").bind(shipment.id).first()) return Response.json({ error: "Um indicador irreversível ativado não pode voltar ao estado normal." }, { status: 409 });
    const reference = await database.prepare("SELECT intact_color AS intactColor, activated_color AS activatedColor FROM shipments WHERE id = ?").bind(shipment.id).first<{intactColor:string|null; activatedColor:string|null}>();
    const colorResult = reference?.intactColor && reference.activatedColor ? classifyColor(sampledColor, reference.intactColor, reference.activatedColor) : "uncertain";
    if (colorResult !== status && !justification) return Response.json({ error: "A condição difere da cor analisada. Informe a justificativa para salvar." }, { status: 400 });
    const recordedAt = new Date().toISOString();
    const [savedLatitude, savedLongitude] = hasLocation ? [latitude, longitude] : (coordinates[place] || [null, null]);
    if (!env.BUCKET) return Response.json({ error: "Armazenamento de fotos indisponível." }, { status: 503 });
    const binary = atob(photo.slice("data:image/jpeg;base64,".length));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const photoKey = `indicators/${shipment.id}/${id}.jpg`;
    await env.BUCKET.put(photoKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    try {
      await database.prepare("INSERT INTO checkins (id, shipment_id, stage, place, actor, status, latitude, longitude, location_source, recorded_at, captured_at, photo_key, sampled_color, color_result, justification, demo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)")
        .bind(id, shipment.id, stage, place, actor, status, savedLatitude, savedLongitude, hasLocation ? "device" : "manual", recordedAt, new Date(capturedAt).toISOString(), photoKey, sampledColor, colorResult, justification || null).run();
    } catch (error) { await env.BUCKET.delete(photoKey); throw error; }
    return Response.json({ id, recordedAt }, { status: 201 });
  } catch (error) { return failure(error); }
}
