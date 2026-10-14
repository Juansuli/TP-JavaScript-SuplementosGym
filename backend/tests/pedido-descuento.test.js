const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function loadController(dependencies) {
  const context = {
    module: { exports: {} },
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  };
  const source = fs.readFileSync(
    path.join(__dirname, '../src/controllers/pedido.controller.js'),
    'utf8'
  );
  vm.runInNewContext(source, context);
  return context.module.exports;
}

function fakeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('creating an order stores the client discount and final total', async () => {
  let createdOrderData;
  const product = {
    id_producto: 1,
    stock: 10,
    precio: 1000,
    estado: 'disponible',
    async update(changes) {
      Object.assign(this, changes);
    },
  };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const controller = loadController({
    sequelize: { Op: {} },
    '../config/db': { transaction: async (callback) => callback(transaction) },
    '../models/pedido.model': {
      create: async (data) => {
        createdOrderData = data;
        return { id_pedido: 1, ...data, toJSON: () => ({ id_pedido: 1, ...data }) };
      },
    },
    '../models/pedido_producto.model': {
      create: async () => {},
      findAll: async () => [],
    },
    '../models/cliente.model': { findByPk: async () => ({ descuento_categoria: 'VIP' }) },
    '../models/descuento.model': { findByPk: async () => ({ porcentaje: '15' }) },
    '../models/producto.model': {
      findByPk: async () => product,
      findAll: async () => [],
    },
    '../utils/product-status': { getProductStatus: () => 'disponible' },
    '../middlewares/pedido-validation.middleware': require('../src/middlewares/pedido-validation.middleware'),
  });
  const response = fakeResponse();

  await controller.createOrder({
    user: { id_usuario: 7 },
    body: {
      nombre_receptor: 'Ana Paz',
      direccion_entrega: 'Calle 123',
      metodo_pago: 'tarjeta',
      productos: [{ id_producto: 1, cantidad: 2 }],
    },
  }, response);

  assert.equal(response.statusCode, 201, JSON.stringify(response.body));
  assert.equal(createdOrderData.subtotal, '2000.00');
  assert.equal(createdOrderData.descuento_categoria, 'VIP');
  assert.equal(createdOrderData.descuento_porcentaje, '15.00');
  assert.equal(createdOrderData.descuento_monto, '300.00');
  assert.equal(createdOrderData.total, '1700.00');
});

test('rounds a discount with decimal prices using integer cents', async () => {
  let createdOrderData;
  const product = {
    id_producto: 1,
    stock: 10,
    precio: '20.10',
    estado: 'disponible',
    async update() {},
  };
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const controller = loadController({
    sequelize: { Op: {} },
    '../config/db': { transaction: async (callback) => callback(transaction) },
    '../models/pedido.model': {
      create: async (data) => {
        createdOrderData = data;
        return { id_pedido: 1, ...data, toJSON: () => ({ id_pedido: 1, ...data }) };
      },
    },
    '../models/pedido_producto.model': { create: async () => {}, findAll: async () => [] },
    '../models/cliente.model': { findByPk: async () => ({ descuento_categoria: 'VIP' }) },
    '../models/descuento.model': { findByPk: async () => ({ porcentaje: '5.00' }) },
    '../models/producto.model': { findByPk: async () => product, findAll: async () => [] },
    '../utils/product-status': { getProductStatus: () => 'disponible' },
    '../middlewares/pedido-validation.middleware': require('../src/middlewares/pedido-validation.middleware'),
  });

  await controller.createOrder({
    user: { id_usuario: 7 },
    body: {
      nombre_receptor: 'Ana Paz',
      direccion_entrega: 'Calle 123',
      metodo_pago: 'tarjeta',
      productos: [{ id_producto: 1, cantidad: 1 }],
    },
  }, fakeResponse());

  assert.equal(createdOrderData.subtotal, '20.10');
  assert.equal(createdOrderData.descuento_monto, '1.01');
  assert.equal(createdOrderData.total, '19.09');
});
