import { integer, real, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const shipments = sqliteTable("shipments", {
  id: text("id").primaryKey(),
  tagId: text("tag_id").notNull().unique(),
  product: text("product").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  supplier: text("supplier"),
  contractReference: text("contract_reference"),
  threshold: real("threshold").notNull(),
  intactColor: text("intact_color"),
  activatedColor: text("activated_color"),
  createdAt: text("created_at").notNull(),
  demo: integer("demo").notNull().default(0),
});

export const checkins = sqliteTable("checkins", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull().references(() => shipments.id),
  stage: text("stage").notNull(),
  place: text("place").notNull(),
  actor: text("actor").notNull(),
  status: text("status").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  locationSource: text("location_source").notNull(),
  recordedAt: text("recorded_at").notNull(),
  capturedAt: text("captured_at"),
  photoKey: text("photo_key"),
  sampledColor: text("sampled_color"),
  colorResult: text("color_result"),
  justification: text("justification"),
  demo: integer("demo").notNull().default(0),
}, (table) => [index("idx_checkins_shipment_time").on(table.shipmentId, table.recordedAt)]);
