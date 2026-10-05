const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const validators = require('../src/middlewares/cliente-validation.middleware');
const {
  validateUserUpdate,
  validateClientData,
  validateRequiredProfileData,
} = validators;

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

function fakeRecord(initialData) {
  const data = { ...initialData };

  return {
    ...data,
    async update(changes) {
      Object.assign(data, changes);
      Object.assign(this, changes);
      return this;
    },
    toJSON() {
      return { ...data };
    },
  };
}

function loadClientController(overrides = {}) {
  return loadModule('controllers/cliente.controller.js', {
    sequelize: { Op: {} },
    bcryptjs: { hash: async () => 'hashed-password' },
    jsonwebtoken: { sign: () => 'test-token' },
    '../config/db': { transaction: async callback => callback({}) },
    '../models/usuario.model': {},
    '../models/administrador.model': {},
    '../models/cliente.model': {},
    '../models/pedido.model': {},
    '../models/descuento.model': {},
    '../middlewares/cliente-validation.middleware': validators,
    ...overrides,
  }, {
    process: { env: { JWT_SECRET: 'profile-tests-only-secret' } },
  });
}

const COMPLETE_REQUIRED_PROFILE = {
  nombre: 'Ana',
  apellido: 'Paz',
  fecha_nacimiento: '1998-05-20',
  genero: 'prefiero_no_decir',
  ocupacion: 'Estudiante',
  peso_kg: 68.5,
  altura_cm: 170,
  deporte: 'Crossfit',
  dias_entrenamiento: 0,
  objetivo: 'salud_general',
};

test('required profile validation accepts complete data and an optional address', () => {
  assert.deepEqual(validateRequiredProfileData(COMPLETE_REQUIRED_PROFILE), []);
  assert.deepEqual(validateRequiredProfileData({
    ...COMPLETE_REQUIRED_PROFILE,
    direccion_entrega: null,
  }), []);
});

test('required profile validation rejects each missing field once', () => {
  const requiredFields = [
    'nombre',
    'apellido',
    'fecha_nacimiento',
    'genero',
    'ocupacion',
    'peso_kg',
    'altura_cm',
    'deporte',
    'dias_entrenamiento',
    'objetivo',
  ];
  const missingValues = [undefined, null, '', '   '];

  requiredFields.forEach((field) => {
    missingValues.forEach((value) => {
      const errors = validateRequiredProfileData({
        ...COMPLETE_REQUIRED_PROFILE,
        [field]: value,
      });

      assert.deepEqual(
        errors,
        [`El campo ${field} es obligatorio.`],
        `Expected one required error for ${field}=${String(value)}`
      );
    });
  });
});

test('a client cannot update their own profile with incomplete data', async () => {
  const controller = loadClientController();
  const response = fakeResponse();

  await controller.updateClient(
    {
      params: { id: '7' },
      user: { id_usuario: 7, rol: 'cliente' },
      body: { nombre: 'Ana' },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.ok(response.body.error.includes('El campo apellido es obligatorio.'));
});

test('an administrator can partially update another client', async () => {
  const user = fakeRecord({
    id_usuario: 7,
    rol: 'cliente',
    email: 'ana@example.com',
    nombre: 'Ana',
    apellido: 'Paz',
    activo: true,
    contraseña: 'hashed-password',
  });
  const client = fakeRecord({ id_cliente: 7, peso_kg: null });
  const controller = loadClientController({
    '../models/usuario.model': { findByPk: async () => user },
    '../models/cliente.model': { findByPk: async () => client },
  });
  const response = fakeResponse();

  await controller.updateClient(
    {
      params: { id: '7' },
      user: { id_usuario: 1, rol: 'administrador' },
      body: { nombre: 'Ana María' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.nombre, 'Ana María');
});

test('registration still allows creating a client without profile data', async () => {
  let createdClientData;
  const user = fakeRecord({
    id_usuario: 7,
    rol: 'cliente',
    email: 'ana@example.com',
    nombre: 'Ana',
    apellido: 'Paz',
    activo: true,
    contraseña: 'hashed-password',
  });
  const controller = loadClientController({
    '../models/usuario.model': { create: async () => user },
    '../models/cliente.model': {
      create: async (data) => {
        createdClientData = data;
        return fakeRecord(data);
      },
    },
  });
  const response = fakeResponse();

  await controller.createClient(
    {
      body: {
        email: 'ana@example.com',
        nombre: 'Ana',
        apellido: 'Paz',
        password: '12345678',
      },
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createdClientData.id_cliente, 7);
  assert.deepEqual(Object.keys(createdClientData), ['id_cliente']);
});

test('enabling purchases still allows an incomplete client profile', async () => {
  let createdClientData;
  const user = fakeRecord({
    id_usuario: 1,
    rol: 'administrador',
    email: 'admin@example.com',
    nombre: 'Admin',
    apellido: 'Principal',
    activo: true,
    contraseña: 'hashed-password',
  });
  const controller = loadClientController({
    '../models/usuario.model': { findByPk: async () => user },
    '../models/cliente.model': {
      findByPk: async () => null,
      create: async (data) => {
        createdClientData = data;
        return fakeRecord(data);
      },
    },
  });
  const response = fakeResponse();

  await controller.enableClientProfile(
    {
      user: { id_usuario: 1, rol: 'administrador' },
      body: {},
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createdClientData.id_cliente, 1);
  assert.deepEqual(Object.keys(createdClientData), ['id_cliente']);
});

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

test('editing the account rejects an empty name, surname or email', () => {
  assert.deepEqual(validateUserUpdate({}), []);
  assert.deepEqual(validateUserUpdate({ nombre: 'Ana', apellido: 'Paz' }), []);

  [{ nombre: '' }, { nombre: '   ' }, { apellido: '' }, { apellido: null }, { email: 'sin-arroba' }].forEach((data) => {
    assert.equal(validateUserUpdate(data).length, 1, `Expected an error for ${JSON.stringify(data)}`);
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
    '../middlewares/cliente-validation.middleware': validators,
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
