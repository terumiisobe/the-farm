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

// Shape one hive from your API into what <HiveMap> expects.
// Adjust the field names on the right to match your backend.
export function toHive(apiHive) {
  return {
    code: String(apiHive.code ?? apiHive.numero ?? apiHive.id), // number only, no section prefix
    lat: Number(apiHive.lat ?? apiHive.latitude),
    lng: Number(apiHive.lng ?? apiHive.longitude),
    status: toStatusKey(apiHive.status),
    section: apiHive.section ?? apiHive.setor,
    addedAt: apiHive.addedAt ?? apiHive.adicionada_em,       // "Adicionada em"  (YYYY-MM-DD)
    lastInspection: apiHive.lastInspection ?? apiHive.ultima_revisao, // "Última revisão em"
    notes: apiHive.notes ?? apiHive.notas,
  };
}
