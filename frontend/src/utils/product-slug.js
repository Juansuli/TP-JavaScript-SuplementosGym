function slugify(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'producto'
}

// Resolve collisions against the complete catalog, independently of active filters.
export function getProductSlug(product, products) {
  const used = new Set()
  const sorted = [...products].sort((a, b) => Number(a.id_producto) - Number(b.id_producto))
  for (const item of sorted) {
    const base = slugify(item.nombre)
    let slug = base
    while (used.has(slug)) slug += `-${item.id_producto}`
    used.add(slug)
    if (item.id_producto === product.id_producto) return slug
  }
  return slugify(product.nombre)
}
