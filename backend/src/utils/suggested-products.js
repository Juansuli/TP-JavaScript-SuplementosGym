const { getPositiveInteger } = require('../middlewares/sugerencia-validation.middleware');

// respuesta_IA guarda como JSON los { id_producto, motivo } ya validados
// (ver sugerencia.controller.js). Este es el único lugar que la parsea:
// devuelve [] cuando el texto guardado falta o está mal formado.
// Por las dudas, se descartan los items sin id entero positivo y los ids
// repetidos (se queda con la primera aparición).
function parseSuggestedItems(suggestion) {
  try {
    const parsed = JSON.parse(suggestion.respuesta_IA);
    const items = Array.isArray(parsed?.sugerencias) ? parsed.sugerencias : [];
    const seenIds = new Set();
    const validItems = [];

    for (const item of items) {
      const id = getPositiveInteger(item?.id_producto);
      if (id === null || seenIds.has(id)) continue;

      seenIds.add(id);
      validItems.push({ id_producto: id, motivo: item.motivo });
    }

    return validItems;
  } catch (error) {
    return [];
  }
}

function getSuggestedProductIds(suggestion) {
  return parseSuggestedItems(suggestion).map((item) => item.id_producto);
}

module.exports = { parseSuggestedItems, getSuggestedProductIds };
