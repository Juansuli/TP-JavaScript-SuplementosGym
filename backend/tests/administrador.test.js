const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validators = require('../src/middlewares/cliente-validation.middleware');

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

const IN = Symbol('in');

// Base de datos en memoria: usuario 1 y 2 son administradores, 3 es cliente.
function createFakeDatabase() {
  const users = new Map();
  const adminIds = new Set([1, 2]);
  let nextId = 4;

  function uniqueError() {
    const error = new Error('duplicate email');
    error.name = 'SequelizeUniqueConstraintError';
    return error;
  }

  function emailTaken(email, exceptId) {
    return [...users.values()].some((user) => user.data.email === email && user.data.id_usuario !== exceptId);
  }

  function record(data) {
    const user = {
      data,
      // El controlador lee user.id_usuario y authenticate lee user.activo.
      get id_usuario() {
        return data.id_usuario;
      },
      get activo() {
        return data.activo;
      },
      async update(changes) {
        if (changes.email && emailTaken(changes.email, data.id_usuario)) throw uniqueError();
        Object.assign(data, changes);
        return user;
      },
      toJSON() {
        return { ...data };
      },
    };
    return user;
  }

  [
    { id_usuario: 1, rol: 'administrador', email: 'ana@dosis.com', nombre: 'Ana', apellido: 'Paz', contraseña: 'hash', activo: true },
    { id_usuario: 2, rol: 'administrador', email: 'beto@dosis.com', nombre: 'Beto', apellido: 'Gil', contraseña: 'hash', activo: true },
    { id_usuario: 3, rol: 'cliente', email: 'cli@dosis.com', nombre: 'Cli', apellido: 'Ente', contraseña: 'hash', activo: true },
  ].forEach((data) => users.set(data.id_usuario, record(data)));

  const Usuario = {
    async findByPk(id) {
      return users.get(id) ?? null;
    },
    async findAll({ where }) {
      const ids = where.id_usuario[IN];
      return ids.map((id) => users.get(id)).filter(Boolean);
    },
    async create(data) {
      if (emailTaken(data.email)) throw uniqueError();
      const user = record({ id_usuario: nextId, activo: true, ...data });
      users.set(nextId, user);
      nextId += 1;
      return user;
    },
  };

  const Administrador = {
    async findAll() {
      return [...adminIds].map((id) => ({ id_administrador: id }));
    },
    async findByPk(id) {
      return adminIds.has(id) ? { id_administrador: id } : null;
    },
    async create({ id_administrador }) {
      adminIds.add(id_administrador);
      return { id_administrador };
    },
  };

  return { users, adminIds, Usuario, Administrador };
}

async function startServer(t) {
  const db = createFakeDatabase();
  const secret = 'admin-crud-tests-only-secret-at-least-32-characters';

  const controller = loadModule('controllers/administrador.controller.js', {
    sequelize: { Op: { in: IN } },
    bcryptjs: bcrypt,
    '../config/db': { transaction: async (callback) => callback({}) },
    '../models/usuario.model': db.Usuario,
    '../models/administrador.model': db.Administrador,
    '../middlewares/cliente-validation.middleware': validators,
  });
  const auth = loadModule('middlewares/auth.middleware.js', {
    jsonwebtoken: jwt,
    '../models/usuario.model': db.Usuario,
  }, {
    process: { env: { JWT_SECRET: secret } },
  });
  const router = loadModule('routes/administrador.routes.js', {
    express,
    '../controllers/administrador.controller': controller,
    '../middlewares/auth.middleware': auth,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/administradores', router);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/administradores`;

  async function request(method, url, user, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (user) headers.Authorization = `Bearer ${jwt.sign(user, secret)}`;

    const response = await fetch(base + url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }

  return { db, request };
}

const ADMIN = { id_usuario: 1, rol: 'administrador' };
const CLIENT = { id_usuario: 3, rol: 'cliente' };
const NEW_ADMIN = { nombre: 'Caro', apellido: 'Sosa', email: 'caro@dosis.com', password: 'clave-segura' };

test('only administrators can use the administrator routes', async (t) => {
  const { request } = await startServer(t);
  const routes = [
    ['GET', ''],
    ['GET', '/2'],
    ['POST', ''],
    ['PUT', '/2'],
    ['PATCH', '/2/estado'],
  ];

  for (const [method, url] of routes) {
    assert.equal((await request(method, url, CLIENT, method === 'GET' ? undefined : {})).status, 403, `${method} ${url} as client`);
    assert.equal((await request(method, url, null, method === 'GET' ? undefined : {})).status, 401, `${method} ${url} without token`);
  }
});

test('lists and shows administrators without exposing passwords', async (t) => {
  const { request } = await startServer(t);

  const list = await request('GET', '', ADMIN);
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((admin) => admin.id_usuario), [1, 2]);
  list.body.forEach((admin) => assert.equal(admin.contraseña, undefined));

  const detail = await request('GET', '/2', ADMIN);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.email, 'beto@dosis.com');
  assert.equal(detail.body.contraseña, undefined);

  // El usuario 3 existe pero es cliente, no administrador.
  assert.equal((await request('GET', '/3', ADMIN)).status, 404);
});

test('creates an administrator with a hashed password', async (t) => {
  const { db, request } = await startServer(t);

  const response = await request('POST', '', ADMIN, NEW_ADMIN);

  assert.equal(response.status, 201);
  assert.equal(response.body.rol, 'administrador');
  assert.equal(response.body.contraseña, undefined);
  assert.ok(db.adminIds.has(response.body.id_usuario));

  const storedPassword = db.users.get(response.body.id_usuario).data.contraseña;
  assert.notEqual(storedPassword, NEW_ADMIN.password);
  assert.ok(await bcrypt.compare(NEW_ADMIN.password, storedPassword));
});

test('rejects missing data, a short password and a repeated email', async (t) => {
  const { request } = await startServer(t);

  const missing = await request('POST', '', ADMIN, { email: 'sin-arroba', password: '123' });
  assert.equal(missing.status, 400);
  assert.deepEqual(missing.body.error, [
    'El email es obligatorio y debe ser válido.',
    'El nombre es obligatorio.',
    'El apellido es obligatorio.',
    'La contraseña debe tener al menos 8 caracteres.',
  ]);

  const repeated = await request('POST', '', ADMIN, { ...NEW_ADMIN, email: 'cli@dosis.com' });
  assert.equal(repeated.status, 409);

  const repeatedOnEdit = await request('PUT', '/2', ADMIN, { email: 'ana@dosis.com' });
  assert.equal(repeatedOnEdit.status, 409);
});

test('edits an administrator and only changes the password when one is sent', async (t) => {
  const { db, request } = await startServer(t);

  const renamed = await request('PUT', '/2', ADMIN, { nombre: '  Roberto ' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.nombre, 'Roberto');
  assert.equal(db.users.get(2).data.contraseña, 'hash');

  const shortPassword = await request('PUT', '/2', ADMIN, { password: 'corta' });
  assert.equal(shortPassword.status, 400);

  const newPassword = await request('PUT', '/2', ADMIN, { password: 'otra-clave-segura' });
  assert.equal(newPassword.status, 200);
  assert.ok(await bcrypt.compare('otra-clave-segura', db.users.get(2).data.contraseña));

  assert.equal((await request('PUT', '/2', ADMIN, {})).status, 400);
  assert.equal((await request('PUT', '/3', ADMIN, { nombre: 'X' })).status, 404);
});

test('an administrator can disable another one, but not themselves', async (t) => {
  const { request } = await startServer(t);

  const self = await request('PATCH', '/1/estado', ADMIN, { activo: false });
  assert.equal(self.status, 409);
  assert.equal(self.body.error, 'No podés inhabilitar tu propia cuenta.');

  assert.equal((await request('PATCH', '/2/estado', ADMIN, { activo: 'no' })).status, 400);

  const disabled = await request('PATCH', '/2/estado', ADMIN, { activo: false });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.activo, false);

  // El administrador inhabilitado ya no puede usar las rutas protegidas.
  assert.equal((await request('GET', '', { id_usuario: 2, rol: 'administrador' })).status, 403);

  const enabled = await request('PATCH', '/2/estado', ADMIN, { activo: true });
  assert.equal(enabled.body.activo, true);
});
