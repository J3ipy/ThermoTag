export type Checkin = {
  id: string; shipmentId: string; stage: string; place: string; actor: string;
  status: "normal" | "alert"; latitude: number | null; longitude: number | null;
  locationSource: "device" | "manual"; recordedAt: string; demo: number;
  capturedAt: string | null; photoKey: string | null; sampledColor: string | null;
  colorResult: "normal" | "alert" | "uncertain" | null; justification: string | null;
};

export type Shipment = {
  id: string; tagId: string; product: string; origin: string; destination: string;
  threshold: number; createdAt: string; demo: number; checkins: Checkin[];
  supplier: string | null; contractReference: string | null;
  intactColor: string | null; activatedColor: string | null;
};

export const coordinates: Record<string, [number, number]> = {
  "Estância": [-11.268, -37.438],
  "Itaporanga d'Ajuda": [-10.997, -37.311],
  "São Cristóvão": [-11.014, -37.207],
  "Aracaju": [-10.947, -37.073],
  "Lagarto": [-10.917, -37.651],
  "Nossa Senhora do Socorro": [-10.855, -37.126],
};

export const places = Object.keys(coordinates);
