// Bombus understands five status keys: stable | developing | recovering | lost | sold.
// If your backend sends Portuguese words, map them here before passing hives to the map.
const MAP = {
  "estavel": "stable", "estável": "stable",
  "desenvolvendo": "developing",
  "recuperando": "recovering",
  "perdida": "lost",
  "vendida": "sold",
};

export function toStatusKey(value) {
  if (!value) return "stable";
  const v = String(value).trim().toLowerCase();
  return MAP[v] || v;
}

function finiteCoord(value) {
  if (typeof value === "string") {
    if (value.trim() === "") return null;
  } else if (value == null || typeof value === "boolean") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Null and blank coordinates stay absent. Number(null) is 0 and would pin the hive in the ocean.
export function pinLatLng(apiHive) {
  if (apiHive == null || typeof apiHive !== "object") return null;
  const lat = finiteCoord(apiHive.lat ?? apiHive.latitude);
  const lng = finiteCoord(apiHive.lng ?? apiHive.longitude);
  if (lat == null || lng == null) return null;
  return [lat, lng];
}

// Shape one hive from your API into what <HiveMap> expects.
// Adjust the field names on the right to match your backend.
export function toHive(apiHive) {
  const pin = pinLatLng(apiHive);
  return {
    code: String(apiHive.code ?? apiHive.numero ?? apiHive.id), // number only, no section prefix
    lat: pin ? pin[0] : Number.NaN,
    lng: pin ? pin[1] : Number.NaN,
    status: toStatusKey(apiHive.status),
    section: apiHive.section ?? apiHive.setor,
    addedAt: apiHive.addedAt ?? apiHive.adicionada_em,       // "Adicionada em"  (YYYY-MM-DD)
    lastInspection: apiHive.lastInspection ?? apiHive.ultima_revisao, // "Última revisão em"
    notes: apiHive.notes ?? apiHive.notas,
  };
}
