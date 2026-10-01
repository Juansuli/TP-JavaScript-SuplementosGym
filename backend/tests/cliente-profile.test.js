const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { validateClientData } = require('../src/middlewares/cliente-validation.middleware');

function loadModule(file, dependencies) {
  const context = {
    module: { exports: {} },
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), context);
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

test('profile validation accepts a complete, realistic profile', () => {
  const errors = validateClientData({
    fecha_nacimiento: '1998-05-20',
    genero: 'femenino',
    peso_kg: '68.5',
    altura_cm: 170,
    ocupacion: 'Estudiante',
    deporte: 'Crossfit',
    dias_entrenamiento: 4,
    objetivo: 'ganar_masa_muscular',
    direccion_entrega: 'Zeballos 1341, Rosario',
  });

  assert.deepEqual(errors, []);
});

test('profile validation lets the client clear optional fields with null', () => {
  const errors = validateClientData({
    fecha_nacimiento: null,
    genero: null,
    peso_kg: null,
    altura_cm: null,
    dias_entrenamiento: null,
    objetivo: null,
  });

  assert.deepEqual(errors, []);
});

test('profile validation rejects the values a user could realistically mistype', () => {
  const invalidValues = [
    { peso_kg: -5 },
    { peso_kg: 0 },
    { peso_kg: 'mucho' },
    { peso_kg: '' },
    { peso_kg: 900 },
    { altura_cm: 1.75 },
    { altura_cm: 5000 },
    { dias_entrenamiento: 8 },
    { dias_entrenamiento: 2.5 },
    { fecha_nacimiento: '2999-01-01' },
    { fecha_nacimiento: '2023-01-01' },
    { fecha_nacimiento: '1800-01-01' },
    { fecha_nacimiento: '2000-02-31' },
    { fecha_nacimiento: 'ayer' },
    { genero: 'hombre' },
    { objetivo: 'ponerme fuerte' },
    { deporte: 42 },
  ];

  invalidValues.forEach((data) => {
    assert.equal(validateClientData(data).length, 1, `Expected an error for ${JSON.stringify(data)}`);
  });
});

test('a cliente cannot assign themselves a discount category', async () => {
  const controller = loadModule('controllers/cliente.controller.js', {
    sequelize: { Op: {} },
    bcryptjs: {},
    jsonwebtoken: {},
    '../config/db': {},
    '../models/usuario.model': {},
    '../models/administrador.model': {},
    '../models/cliente.model': {},
    '../models/pedido.model': {},
    '../models/descuento.model': {},
    '../middlewares/cliente-validation.middleware': { validateRegistration: () => [], validateClientData: () => [] },
  });

  const updateResponse = fakeResponse();
  await controller.updateClient(
    { params: { id: '7' }, user: { id_usuario: 7, rol: 'cliente' }, body: { peso_kg: 70, descuento_categoria: 'VIP' } },
    updateResponse
  );
  assert.equal(updateResponse.statusCode, 403);

  const registerResponse = fakeResponse();
  await controller.createClient(
    { body: { email: 'a@b.com', nombre: 'Ana', apellido: 'Paz', password: '12345678', descuento_categoria: 'VIP' } },
    registerResponse
  );
  assert.equal(registerResponse.statusCode, 403);
});
