import { db, failure } from "@/lib/server";
import { coordinates } from "@/lib/model";

export async function POST() {
  try {
    const database = db();
    const existing = await database.prepare("SELECT id FROM shipments WHERE id = 'SE-02931'").first();
    if (existing) return Response.json({ id: "SE-02931", alreadyLoaded: true });
    const now = Date.now();
    const loads = [
      { id: "SE-02931", tag: "TT-SE-02931", product: "Alimentos refrigerados", origin: "Estância", destination: "Aracaju", threshold: 8, points: [
        ["Expedição", "Estância", "normal", 190], ["Checkpoint", "Itaporanga d'Ajuda", "normal", 130], ["Checkpoint", "São Cristóvão", "alert", 65], ["Recebimento", "Aracaju", "alert", 20],
      ] },
      { id: "SE-02932", tag: "TT-SE-02932", product: "Produtos lácteos", origin: "Lagarto", destination: "Aracaju", threshold: 5, points: [
        ["Expedição", "Lagarto", "normal", 95], ["Checkpoint", "Nossa Senhora do Socorro", "normal", 35],
      ] },
    ] as const;
    const statements: D1PreparedStatement[] = [];
    for (const load of loads) {
      statements.push(database.prepare("INSERT INTO shipments (id, tag_id, product, origin, destination, threshold, created_at, demo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)")
        .bind(load.id, load.tag, load.product, load.origin, load.destination, load.threshold, new Date(now - 220 * 60000).toISOString()));
      for (const [stage, place, status, minutes] of load.points) {
        const [latitude, longitude] = coordinates[place];
        statements.push(database.prepare("INSERT INTO checkins (id, shipment_id, stage, place, actor, status, latitude, longitude, location_source, recorded_at, demo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, 1)")
          .bind(crypto.randomUUID(), load.id, stage, place, stage === "Recebimento" ? "Recebimento (demo)" : "Operador (demo)", status, latitude, longitude, new Date(now - minutes * 60000).toISOString()));
      }
    }
    await database.batch(statements);
    return Response.json({ id: "SE-02931" }, { status: 201 });
  } catch (error) { return failure(error); }
}
