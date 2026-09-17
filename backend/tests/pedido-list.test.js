const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');

function loadModule(file, dependencies, globals = {}) {
  const context = {
    module: { exports: {} },
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), context);
  return context.module.exports;
}

test('order lists enforce administrative and personal scopes', async (t) => {
  const orders = [
    { id_pedido: 1, usuario_id: 20, estado: 'pendiente' },
    { id_pedido: 2, usuario_id: 10, estado: 'entregado' },
    { id_pedido: 3, usuario_id: 10, estado: 'pendiente' },
  ];
  const controller = loadModule('controllers/pedido.controller.js', {
    sequelize: { Op: {} },
    '../config/db': {},
    '../models/pedido.model': {
      async findAll({ where, order }) {
        return orders.filter(item => Object.entries(where).every(([key, value]) => item[key] === value))
          .sort((a, b) => order[0][1] === 'DESC' ? b.id_pedido - a.id_pedido : a.id_pedido - b.id_pedido);
      },
    },
    '../models/pedido_producto.model': {},
    // Admin 10 also has a client profile; admin 30 does not.
    '../models/cliente.model': { findByPk: async id => id === 30 ? null : { id_cliente: id } },
    '../models/producto.model': {},
    '../utils/product-status': {},
    '../middlewares/pedido-validation.middleware': require('../src/middlewares/pedido-validation.middleware'),
  });
  const secret = 'order-list-tests-only-secret-at-least-32-characters';
  const auth = loadModule('middlewares/auth.middleware.js', { jsonwebtoken: jwt }, {
    process: { env: { JWT_SECRET: secret } },
  });
  const router = loadModule('routes/pedido.routes.js', {
    express,
    '../controllers/pedido.controller': controller,
    '../middlewares/auth.middleware': auth,
  });
  const app = express();
  app.use('/api/pedidos', router);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/pedidos`;

  async function check(url, user, status, expectedIds) {
    const headers = user ? { Authorization: `Bearer ${jwt.sign(user, secret)}` } : {};
    const response = await fetch(base + url, { headers });
    assert.equal(response.status, status, url);
    const body = await response.json();
    if (expectedIds) assert.deepEqual(body.map(order => order.id_pedido), expectedIds);
  }

  const admin = { id_usuario: 10, rol: 'administrador' };
  const adminWithoutProfile = { id_usuario: 30, rol: 'administrador' };
  const client = { id_usuario: 20, rol: 'cliente' };
  await check('', admin, 200, [1, 2, 3]);
  await check('', adminWithoutProfile, 200, [1, 2, 3]);
  await check('?estado=pendiente', admin, 200, [1, 3]);
  await check('?estado=invalid', admin, 400);
  await check('', client, 403);
  await check('', null, 401);
  await check('/mis-pedidos', admin, 200, [3, 2]);
  await check('/mis-pedidos', client, 200, [1]);
  await check('/mis-pedidos', adminWithoutProfile, 200, []);
  await check('/mis-pedidos?estado=pendiente', admin, 200, [3]);
  await check('/mis-pedidos?usuario_id=10', client, 200, [1]);
  await check('/mis-pedidos', null, 401);
});
