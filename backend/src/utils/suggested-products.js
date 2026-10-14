// respuesta_IA guarda como JSON los { id_producto, motivo } ya validados
// (ver sugerencia.controller.js). Este es el único lugar que la parsea:
// devuelve [] cuando el texto guardado falta o está mal formado.
function parseSuggestedItems(suggestion) {
  try {
    const parsed = JSON.parse(suggestion.respuesta_IA);
    const items = Array.isArray(parsed?.sugerencias) ? parsed.sugerencias : [];
    return items.map((item) => ({
      id_producto: Number(item.id_producto),
      motivo: item.motivo,
    }));
  } catch (error) {
    return [];
  }
}

function getSuggestedProductIds(suggestion) {
  return parseSuggestedItems(suggestion).map((item) => item.id_producto);
}

module.exports = { parseSuggestedItems, getSuggestedProductIds };
