import { env } from "cloudflare:workers";
import type { Checkin, Shipment } from "./model";

export function db() {
  if (!env.DB) throw new Error("Banco de dados indisponível");
  return env.DB;
}

export async function allShipments(): Promise<Shipment[]> {
  const database = db();
  const rows = await database.prepare("SELECT id, tag_id AS tagId, product, origin, destination, supplier, contract_reference AS contractReference, threshold, intact_color AS intactColor, activated_color AS activatedColor, created_at AS createdAt, demo FROM shipments ORDER BY created_at DESC").all<Omit<Shipment, "checkins">>();
  const events = await database.prepare("SELECT id, shipment_id AS shipmentId, stage, place, actor, status, latitude, longitude, location_source AS locationSource, recorded_at AS recordedAt, captured_at AS capturedAt, photo_key AS photoKey, sampled_color AS sampledColor, color_result AS colorResult, justification, demo FROM checkins ORDER BY COALESCE(captured_at, recorded_at) ASC, recorded_at ASC").all<Checkin>();
  return (rows.results || []).map((row) => ({ ...row, checkins: (events.results || []).filter((event) => event.shipmentId === row.id) }));
}

export function failure(error: unknown) {
  console.error("ThermoTag request failed", error);
  return Response.json({ error: "Não foi possível concluir a operação. Tente novamente." }, { status: 500 });
}
