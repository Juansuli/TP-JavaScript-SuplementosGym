const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { Op } = require('sequelize');
function controller(model) {
  const dependencies = {
    'fs/promises': { unlink: async () => { throw new Error('Must preserve image'); } },
    path: require('node:path'), sequelize: { Op },
    '../models/producto.model': model,
    '../utils/product-status': require('../src/utils/product-status'),
    '../middlewares/product-image.middleware': { productImagesDirectory: '/uploads' },
    '../middlewares/product-validation.middleware': { validateProduct: () => [] },
  };
  const context = { module: { exports: {} }, require: (name) => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/producto.controller.js'), 'utf8'), context);
  return context.module.exports;
}
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function product(stock = 5) {
  return { id_producto: 1, estado: 'disponible', stock, imagen_url: '/uploads/productos/test.png',
    async update(data) { Object.assign(this, data); },
    async destroy() { assert.fail('Must never destroy products'); } };
}
test('deletion always preserves the product, stock and image; restoration makes it available', async () => {
  const item = product(); const api = controller({ findByPk: async () => item });
  await api.deleteProduct({ params: { id: '1' } }, response());
  assert.equal(item.estado, 'inhabilitado');
  assert.equal(item.stock, 5); assert.equal(item.imagen_url, '/uploads/productos/test.png');
  await api.restoreProduct({ params: { id: '1' } }, response());
  assert.equal(item.estado, 'habilitado');
});
test('restoring zero stock enables visibility without changing stock', async () => {
  const item = product(0); item.estado = 'inhabilitado';
  await controller({ findByPk: async () => item }).restoreProduct({ params: { id: '1' } }, response());
  assert.equal(item.estado, 'habilitado');
});
test('public catalog excludes discontinued products, administration includes them', async () => {
  const queries = []; const api = controller({ findAll: async (query) => { queries.push(query); return []; } });
  await api.listProducts({ query: {} }, response());
  await api.listAdminProducts({ query: {} }, response());
  assert.ok(queries[0].where.estado[Op.notIn].includes('inhabilitado'));
  assert.equal(queries[1].where.estado, undefined);
});
test('public product detail does not expose a discontinued product', async () => {
  const item = product(); item.estado = 'inhabilitado'; const res = response();
  await controller({ findByPk: async () => item }).getProduct({ params: { id: '1' } }, res);
  assert.equal(res.statusCode, 404);
});
for (const action of ['deleteProduct', 'restoreProduct']) {
  test(action + ' validates IDs and missing products', async () => {
    const api = controller({ findByPk: async () => null });
    const invalid = response(); await api[action]({ params: { id: '-1' } }, invalid); assert.equal(invalid.statusCode, 400);
    const missing = response(); await api[action]({ params: { id: '1' } }, missing); assert.equal(missing.statusCode, 404);
  });
}
