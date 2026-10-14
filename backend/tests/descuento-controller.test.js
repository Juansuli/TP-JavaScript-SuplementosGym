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
    path.join(__dirname, '../src/controllers/descuento.controller.js'),
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
    send() {
      return this;
    },
  };
}

function fakeDiscount(data) {
  return {
    ...data,
    toJSON() {
      return { ...data };
    },
    async update(changes) {
      Object.assign(data, changes);
      Object.assign(this, changes);
    },
    async destroy() {},
  };
}

test('creates a normalized discount category with a valid percentage', async () => {
  let createdData;
  const controller = loadController({
    '../models/descuento.model': {
      create: async (data) => {
        createdData = data;
        return fakeDiscount(data);
      },
    },
    '../models/cliente.model': {},
  });
  const response = fakeResponse();

  await controller.createDiscount(
    { body: { categoria: ' vip ', porcentaje: '15.5' } },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(JSON.stringify(createdData)), { categoría: 'VIP', porcentaje: 15.5 });
  assert.deepEqual(JSON.parse(JSON.stringify(response.body)), { categoria: 'VIP', porcentaje: 15.5 });
});

test('rejects invalid discount data before saving it', async () => {
  const controller = loadController({
    '../models/descuento.model': {},
    '../models/cliente.model': {},
  });
  const response = fakeResponse();

  await controller.createDiscount(
    { body: { categoria: '', porcentaje: 0 } },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.ok(response.body.error.includes('porcentaje'));
});

test('rejects non-object bodies and percentages with invalid precision', async () => {
  const controller = loadController({
    '../models/descuento.model': {},
    '../models/cliente.model': {},
  });

  const nullBodyResponse = fakeResponse();
  await controller.createDiscount({ body: null }, nullBodyResponse);
  assert.equal(nullBodyResponse.statusCode, 400);

  for (const percentage of [true, [10], '10.123']) {
    const response = fakeResponse();
    await controller.createDiscount(
      { body: { categoria: 'VIP', porcentaje: percentage } },
      response
    );
    assert.equal(response.statusCode, 400, `Expected 400 for ${JSON.stringify(percentage)}`);
  }
});

test('does not delete a discount assigned to clients', async () => {
  const discount = fakeDiscount({ categoría: 'VIP', porcentaje: 15 });
  const controller = loadController({
    '../models/descuento.model': { findByPk: async () => discount },
    '../models/cliente.model': { count: async () => 1 },
  });
  const response = fakeResponse();

  await controller.deleteDiscount({ params: { categoria: 'VIP' } }, response);

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, 'No se puede eliminar una categoría asignada a uno o más clientes.');
});

test('updates only the percentage of an existing category', async () => {
  const discount = fakeDiscount({ categoría: 'ESTUDIANTE', porcentaje: 10 });
  const controller = loadController({
    '../models/descuento.model': { findByPk: async () => discount },
    '../models/cliente.model': {},
  });
  const response = fakeResponse();

  await controller.updateDiscount(
    { params: { categoria: 'estudiante' }, body: { porcentaje: 20 } },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(response.body)), { categoria: 'ESTUDIANTE', porcentaje: 20 });
});
