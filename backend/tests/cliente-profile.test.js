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

// Los objetos creados dentro del vm tienen otro prototipo; para compararlos
// con deepEqual se pasan a JSON.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

// Fake de la tabla cliente_objetivo que guarda las filas en memoria.
function fakeGoalsModel(initialRows = []) {
  let rows = [...initialRows];

  return {
    get rows() {
      return rows;
    },
    async findAll({ where }) {
      return rows.filter((row) => row.id_cliente === where.id_cliente);
    },
    async destroy({ where }) {
      rows = rows.filter((row) => row.id_cliente !== where.id_cliente);
    },
    async bulkCreate(newRows) {
      rows.push(...newRows);
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
    '../models/cliente_objetivo.model': fakeGoalsModel(),
    '../models/pedido.model': {},
    '../models/descuento.model': {},
    '../middlewares/cliente-validation.middleware': validators,
    '../utils/admin-guard': {
      ensureAnotherActiveAdmin: async () => {},
      LAST_ACTIVE_ADMIN_ERROR: 'LAST_ACTIVE_ADMIN',
    },
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
  objetivos: ['salud_general'],
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
    'objetivos',
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

  assert.deepEqual(
    validateRequiredProfileData({ ...COMPLETE_REQUIRED_PROFILE, objetivos: [] }),
    ['El campo objetivos es obligatorio.']
  );
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

test('a client can update their own profile with complete required data', async () => {
  const user = fakeRecord({
    id_usuario: 7,
    rol: 'cliente',
    email: 'ana@example.com',
    nombre: 'Nombre anterior',
    apellido: 'Apellido anterior',
    activo: true,
    contraseña: 'hashed-password',
  });

  const client = fakeRecord({
    id_cliente: 7,
    fecha_nacimiento: null,
    genero: null,
    ocupacion: null,
    peso_kg: null,
    altura_cm: null,
    deporte: null,
    dias_entrenamiento: null,
    direccion_entrega: null,
    descuento_categoria: null,
  });
  const goals = fakeGoalsModel([{ id_cliente: 7, objetivo: 'perder_grasa' }]);

  const controller = loadClientController({
    '../models/usuario.model': {
      findByPk: async () => user,
    },
    '../models/cliente.model': {
      findByPk: async () => client,
    },
    '../models/cliente_objetivo.model': goals,
  });

  const response = fakeResponse();

  await controller.updateClient(
    {
      params: { id: '7' },
      user: { id_usuario: 7, rol: 'cliente' },
      body: { ...COMPLETE_REQUIRED_PROFILE },
    },
    response
  );

  assert.equal(response.statusCode, 200);

  Object.entries(COMPLETE_REQUIRED_PROFILE).forEach(([field, value]) => {
    assert.deepEqual(plain(response.body[field]), value);
  });

  assert.equal(response.body.direccion_entrega, null);

  assert.equal(user.toJSON().nombre, COMPLETE_REQUIRED_PROFILE.nombre);
  assert.equal(user.toJSON().apellido, COMPLETE_REQUIRED_PROFILE.apellido);

  [
    'fecha_nacimiento',
    'genero',
    'ocupacion',
    'peso_kg',
    'altura_cm',
    'deporte',
    'dias_entrenamiento',
  ].forEach((field) => {
    assert.equal(client.toJSON()[field], COMPLETE_REQUIRED_PROFILE[field]);
  });

  // El objetivo anterior se reemplaza por los nuevos en cliente_objetivo.
  assert.deepEqual(plain(goals.rows), [{ id_cliente: 7, objetivo: 'salud_general' }]);
});

test('a client can save up to three goals, which replace the previous ones', async () => {
  const user = fakeRecord({ id_usuario: 7, rol: 'cliente', email: 'ana@example.com', activo: true });
  const client = fakeRecord({ id_cliente: 7 });
  const goals = fakeGoalsModel([
    { id_cliente: 7, objetivo: 'recuperacion' },
    { id_cliente: 8, objetivo: 'recuperacion' },
  ]);
  const controller = loadClientController({
    '../models/usuario.model': { findByPk: async () => user },
    '../models/cliente.model': { findByPk: async () => client },
    '../models/cliente_objetivo.model': goals,

  ]);
});

test('a client cannot save more than three goals', async () => {
  const goals = fakeGoalsModel([{ id_cliente: 7, objetivo: 'recuperacion' }]);
  const controller = loadClientController({ '../models/cliente_objetivo.model': goals });
  const response = fakeResponse();

  await controller.updateClient(
    {
      params: { id: '7' },
      user: { id_usuario: 7, rol: 'cliente' },
      body: {
        ...COMPLETE_REQUIRED_PROFILE,
        objetivos: ['perder_grasa', 'ganar_masa_muscular', 'mejorar_rendimiento', 'salud_general'],
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(plain(response.body.error), ['Elegí entre 1 y 3 objetivos.']);
  assert.deepEqual(plain(goals.rows), [{ id_cliente: 7, objetivo: 'recuperacion' }]);
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
    objetivos: ['ganar_masa_muscular', 'mejorar_rendimiento'],
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
    objetivos: null,
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
    { objetivos: ['ponerme fuerte'] },
    { objetivos: 'salud_general' },
    { objetivos: [] },
    { objetivos: ['perder_grasa', 'salud_general', 'recuperacion', 'mejorar_rendimiento'] },
    { objetivos: ['perder_grasa', 'perder_grasa'] },
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
    '../models/cliente_objetivo.model': {},
    '../models/pedido.model': {},
    '../models/descuento.model': {},
    '../middlewares/cliente-validation.middleware': validators,
    '../utils/admin-guard': {},
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

test('an administrator can assign themselves a discount without a complete profile', async () => {
  const user = fakeRecord({
    id_usuario: 7,
    email: 'admin@dosis.com',
    nombre: 'Admin',
    apellido: 'DOSIS',
    rol: 'administrador',
  });
  const client = fakeRecord({ id_cliente: 7, descuento_categoria: null });
  const controller = loadClientController({
    '../models/usuario.model': { findByPk: async () => user },
    '../models/cliente.model': { findByPk: async () => client },
    '../models/descuento.model': { findByPk: async () => ({}) },
  });
  const response = fakeResponse();

  await controller.updateClient(
    {
      params: { id: '7' },
      user: { id_usuario: 7, rol: 'administrador' },
      body: { descuento_categoria: 'VIP' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.descuento_categoria, 'VIP');
});

// Un administrador con perfil de cliente también aparece en
// /api/clientes, y esa ruta cambia el mismo usuario.activo: tiene que
// respetar las reglas de /api/administradores/:id/estado.
function loadStatusController({ isAdmin, guardError }) {
  const user = fakeRecord({ id_usuario: 2, rol: 'administrador', email: 'beto@dosis.com', activo: true });
  const guardCalls = [];
  const controller = loadClientController({
    '../models/usuario.model': { findByPk: async () => user },
    '../models/cliente.model': { findByPk: async () => fakeRecord({ id_cliente: 2 }) },
    '../models/administrador.model': { findByPk: async () => (isAdmin ? { id_administrador: 2 } : null) },
    '../utils/admin-guard': {
      LAST_ACTIVE_ADMIN_ERROR: 'LAST_ACTIVE_ADMIN',
      async ensureAnotherActiveAdmin(id) {
        guardCalls.push(id);
        if (guardError) throw new Error('LAST_ACTIVE_ADMIN');
      },
    },
  });

  return { controller, user, guardCalls };
}

test('the client status route does not let a user disable their own account', async () => {
  const { controller, user } = loadStatusController({ isAdmin: true });
  const response = fakeResponse();

  await controller.setClientStatus(
    { params: { id: '2' }, user: { id_usuario: 2, rol: 'administrador' }, body: { activo: false } },
    response
  );

  assert.equal(response.statusCode, 409);
  assert.equal(user.activo, true);
});

test('disabling an administrator through the client route checks that another admin stays active', async () => {
  const { controller, user, guardCalls } = loadStatusController({ isAdmin: true, guardError: true });
  const response = fakeResponse();

  await controller.setClientStatus(
    { params: { id: '2' }, user: { id_usuario: 1, rol: 'administrador' }, body: { activo: false } },
    response
  );

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, 'Tiene que quedar al menos un administrador activo.');
  assert.deepEqual(guardCalls, [2]);
  assert.equal(user.activo, true);
});

test('disabling a regular client does not need the administrator check', async () => {
  const { controller, user, guardCalls } = loadStatusController({ isAdmin: false });
  const response = fakeResponse();

  await controller.setClientStatus(
    { params: { id: '2' }, user: { id_usuario: 1, rol: 'administrador' }, body: { activo: false } },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(user.activo, false);
  assert.deepEqual(guardCalls, []);
});

test('an administrator changing their discount and goals must provide a complete profile', async () => {
  const controller = loadClientController();
  const response = fakeResponse();

  await controller.updateClient(
    {
      params: { id: '7' },
      user: { id_usuario: 7, rol: 'administrador' },
      body: {
        descuento_categoria: 'VIP',
        objetivos: ['salud_general'],
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.ok(response.body.error.includes('El campo nombre es obligatorio.'));
});

test('the client status route answers 400 when the request has no body', async () => {
  const { controller } = loadStatusController({ isAdmin: false });
  const response = fakeResponse();

  await controller.setClientStatus(
    { params: { id: '2' }, user: { id_usuario: 1, rol: 'administrador' }, body: undefined },
    response
  );

  assert.equal(response.statusCode, 400);
});
