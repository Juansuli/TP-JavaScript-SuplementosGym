const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { Op } = require('sequelize');
const clientValidators = require('../src/middlewares/cliente-validation.middleware');
const suggestionValidators = require('../src/middlewares/sugerencia-validation.middleware');

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
    send(body) {
      this.body = body;
      return this;
    },
  };
}

// Stands in for a Sequelize instance: exposes the fields plus the
// toJSON/update/destroy methods the controller calls.
function fakeRecord(data) {
  const stored = { ...data };
  return {
    ...stored,
    async update(changes) {
      Object.assign(stored, changes);
      Object.assign(this, changes);
      return this;
    },
    async destroy() {
      stored.deleted = true;
      this.deleted = true;
    },
    toJSON() {
      return { ...stored };
    },
  };
}

// Fake SugerenciaIA model backed by an in-memory list, with the query
// options the controller uses (where.usuario_id, order DESC).
function createSugerenciaModel(initialRecords = []) {
  const records = initialRecords.map((data) => fakeRecord(data));
  let nextId = records.reduce((max, r) => Math.max(max, r.id_sugerencia), 0) + 1;

  return {
    records,
    async create(data) {
      const record = fakeRecord({
        id_sugerencia: nextId++,
        fecha_generacion: '2026-10-08T10:00:00.000Z',
        ...data,
      });
      records.push(record);
      return record;
    },
    async findAll({ where = {}, order } = {}) {
      const result = records.filter(
        (r) => !r.deleted && (where.usuario_id === undefined || r.usuario_id === where.usuario_id)
      );
      if (order?.[0]?.[1] === 'DESC') result.sort((a, b) => b.id_sugerencia - a.id_sugerencia);
      return result;
    },
    async findByPk(id) {
      return records.find((r) => r.id_sugerencia === id && !r.deleted) ?? null;
    },
  };
}

// Fake Producto model that understands the `where` clauses the
// controller builds with the real Sequelize Op symbols.
function createProductoModel(products) {
  return {
    async findAll({ where = {} } = {}) {
      let result = products;

      if (where.estado !== undefined) {
        result = result.filter((p) => p.estado === where.estado);
      }
      if (where.stock?.[Op.gt] !== undefined) {
        result = result.filter((p) => p.stock > where.stock[Op.gt]);
      }
      if (where.id_producto?.[Op.notIn]) {
        result = result.filter((p) => !where.id_producto[Op.notIn].includes(p.id_producto));
      }
      if (where.id_producto?.[Op.in]) {
        result = result.filter((p) => where.id_producto[Op.in].includes(p.id_producto));
      }

      return result;
    },
  };
}

function loadController(overrides = {}) {
  return loadModule('controllers/sugerencia.controller.js', {
    sequelize: { Op },
    '../models/usuario.model': {},
    '../models/cliente.model': {},
    '../models/producto.model': createProductoModel([]),
    '../models/sugerencia_ia.model': createSugerenciaModel(),
    '../services/gemini.service': { generateProductSuggestions: async () => ({ sugerencias: [] }) },
    '../middlewares/cliente-validation.middleware': clientValidators,
    '../middlewares/sugerencia-validation.middleware': suggestionValidators,
    ...overrides,
  });
}

// Loads the REAL gemini.service.js with a fake fetch and a controlled
// environment, so no test ever calls the real API.
function loadGeminiService(env, fakeFetch) {
  return loadModule('services/gemini.service.js', {}, {
    fetch: fakeFetch,
    process: { env },
    console: { error() {} },
    AbortSignal,
  });
}

// Objects created inside the vm context belong to another "realm", so
// deepEqual would reject them even when the content is identical. Round-
// tripping through JSON gives plain objects from this realm.
function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function expectErrorCode(promise, code) {
  try {
    await promise;
  } catch (error) {
    assert.equal(error.code, code);
    return;
  }
  assert.fail(`Expected the call to fail with code ${code}`);
}

const USER = fakeRecord({
  id_usuario: 20,
  rol: 'cliente',
  email: 'ana@example.com',
  nombre: 'Ana',
  apellido: 'Paz',
  activo: true,
});

const COMPLETE_CLIENT = fakeRecord({
  id_cliente: 20,
  fecha_nacimiento: '1998-05-20',
  genero: 'femenino',
  peso_kg: 68.5,
  altura_cm: 170,
  ocupacion: 'Estudiante',
  deporte: 'Crossfit',
  dias_entrenamiento: 4,
  objetivo: 'ganar_masa_muscular',
});

// Candidates for the IA: only products 1, 2, 5 and 6 (estado disponible
// + stock > 0). 3 has no stock and 4 is descontinuado.
const PRODUCTS = [
  { id_producto: 1, nombre: 'Proteína Whey', descripcion: 'Proteína de suero', precio: '25000.00', stock: 10, estado: 'disponible', info_nutricional: '24g de proteína', imagen_url: '/uploads/whey.png' },
  { id_producto: 2, nombre: 'Creatina', descripcion: 'Monohidrato', precio: '18000.50', stock: 5, estado: 'disponible', info_nutricional: '5g por porción', imagen_url: null },
  { id_producto: 3, nombre: 'Sin stock', descripcion: 'x', precio: '100', stock: 0, estado: 'disponible', info_nutricional: null, imagen_url: null },
  { id_producto: 4, nombre: 'Discontinuado', descripcion: 'x', precio: '100', stock: 9, estado: 'descontinuado', info_nutricional: null, imagen_url: null },
  { id_producto: 5, nombre: 'BCAA', descripcion: 'x', precio: '12000', stock: 3, estado: 'disponible', info_nutricional: null, imagen_url: null },
  { id_producto: 6, nombre: 'Pre-entreno', descripcion: 'x', precio: '15000', stock: 2, estado: 'disponible', info_nutricional: null, imagen_url: null },
];

function loadPostController({ client = COMPLETE_CLIENT, products = PRODUCTS, geminiResult, geminiError, sugerencias } = {}) {
  let capturedArgs;
  const geminiService = {
    async generateProductSuggestions(args) {
      capturedArgs = args;
      if (geminiError) throw geminiError;
      return geminiResult;
    },
  };

  const controller = loadController({
    '../models/usuario.model': { findByPk: async () => USER },
    '../models/cliente.model': { findByPk: async () => client },
    '../models/producto.model': createProductoModel(products),
    '../models/sugerencia_ia.model': sugerencias ?? createSugerenciaModel(),
    '../services/gemini.service': geminiService,
  });

  return {
    controller,
    getCapturedPrompt: () => capturedArgs,
  };
}

const CLIENT_REQUEST = { id_usuario: 20, rol: 'cliente' };

test('POST creates a pendiente suggestion and returns products with motivo', async () => {
  const sugerencias = createSugerenciaModel();
  const { controller, getCapturedPrompt } = loadPostController({
    sugerencias,
    geminiResult: {
      sugerencias: [
        { id_producto: 1, motivo: 'Te ayuda a ganar masa muscular.' },
        { id_producto: 2, motivo: 'Mejora el rendimiento en Crossfit.' },
      ],
    },
  });
  const response = fakeResponse();

  await controller.createSuggestion(
    { user: CLIENT_REQUEST, body: { carrito: [{ id_producto: 6, cantidad: 1 }] } },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.estado, 'pendiente');
  assert.deepEqual(
    toPlain(response.body.productos.map((p) => [p.id_producto, p.motivo])),
    [
      [1, 'Te ayuda a ganar masa muscular.'],
      [2, 'Mejora el rendimiento en Crossfit.'],
    ]
  );
  assert.equal(response.body.productos[0].nombre, 'Proteína Whey');
  assert.equal(response.body.productos[0].stock, 10);
  // The prompt the client sent is stored for auditing, never returned.
  assert.equal(response.body.prompt_enviado, undefined);

  assert.equal(sugerencias.records.length, 1);
  assert.equal(sugerencias.records[0].estado, 'pendiente');
  assert.equal(sugerencias.records[0].usuario_id, 20);

  // The cart product went to the prompt by name and was excluded from
  // the candidates.
  const { userPrompt } = getCapturedPrompt();
  assert.ok(userPrompt.includes('Pre-entreno'));
});

test('the prompt sent to the AI never contains name, surname or email', async () => {
  const sugerencias = createSugerenciaModel();
  const { controller, getCapturedPrompt } = loadPostController({
    sugerencias,
    geminiResult: { sugerencias: [{ id_producto: 1, motivo: 'ok' }] },
  });

  await controller.createSuggestion(
    { user: CLIENT_REQUEST, body: { carrito: [] } },
    fakeResponse()
  );

  const { systemInstruction, userPrompt } = getCapturedPrompt();
  for (const privateData of ['Ana', 'Paz', 'ana@example.com']) {
    assert.ok(!systemInstruction.includes(privateData), `systemInstruction leaked ${privateData}`);
    assert.ok(!userPrompt.includes(privateData), `userPrompt leaked ${privateData}`);
    assert.ok(
      !sugerencias.records[0].prompt_enviado.includes(privateData),
      `prompt_enviado leaked ${privateData}`
    );
  }
});

test('POST rejects a user without client profile with 403', async () => {
  const { controller } = loadPostController({ client: null });
  const response = fakeResponse();

  await controller.createSuggestion(
    { user: { id_usuario: 30, rol: 'administrador' }, body: {} },
    response
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error, 'Solo los clientes pueden pedir sugerencias.');
});

test('POST rejects an incomplete client profile with 400', async () => {
  const { controller } = loadPostController({ client: fakeRecord({ id_cliente: 20 }) });
  const response = fakeResponse();

  await controller.createSuggestion({ user: CLIENT_REQUEST, body: {} }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'Completá tu perfil para recibir sugerencias.');
  assert.ok(Array.isArray(response.body.campos));
  assert.ok(response.body.campos.length > 0);
});

test('POST returns 409 when no product can be suggested', async () => {
  const { controller } = loadPostController({ products: [PRODUCTS[2], PRODUCTS[3]] });
  const response = fakeResponse();

  await controller.createSuggestion({ user: CLIENT_REQUEST, body: {} }, response);

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, 'No hay más productos disponibles para sugerirte en este momento.');
});

test('POST filters ids outside the candidate list, duplicates and caps at 3', async () => {
  const { controller } = loadPostController({
    geminiResult: {
      sugerencias: [
        { id_producto: 999, motivo: 'No existe en el catálogo.' },
        { id_producto: 3, motivo: 'Sin stock, no era candidato.' },
        { id_producto: 1, motivo: 'Primera.' },
        { id_producto: 1, motivo: 'Duplicada, se descarta.' },
        { id_producto: 2, motivo: 'Segunda.' },
        { id_producto: 5, motivo: 'Tercera.' },
        { id_producto: 6, motivo: 'Cuarta: supera el máximo.' },
      ],
    },
  });
  const response = fakeResponse();

  await controller.createSuggestion({ user: CLIENT_REQUEST, body: {} }, response);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(
    toPlain(response.body.productos.map((p) => p.id_producto)),
    [1, 2, 5]
  );
});

test('POST excluir_productos removes those products from the candidates sent to the AI', async () => {
  const { controller, getCapturedPrompt } = loadPostController({
    geminiResult: { sugerencias: [{ id_producto: 5, motivo: 'Otra opción.' }] },
  });
  const response = fakeResponse();

  await controller.createSuggestion(
    { user: CLIENT_REQUEST, body: { carrito: [], excluir_productos: [1, 2] } },
    response
  );

  assert.equal(response.statusCode, 201);
  const { userPrompt } = getCapturedPrompt();
  assert.ok(!userPrompt.includes('"nombre":"Proteína Whey"'));
  assert.ok(!userPrompt.includes('"nombre":"Creatina"'));
  assert.ok(userPrompt.includes('"nombre":"BCAA"'));
  assert.ok(userPrompt.includes('"nombre":"Pre-entreno"'));
});

test('POST drops an excluded id even if the AI returns it', async () => {
  const { controller } = loadPostController({
    geminiResult: {
      sugerencias: [
        { id_producto: 1, motivo: 'Ya estaba excluido.' },
        { id_producto: 5, motivo: 'Esta sí.' },
      ],
    },
  });
  const response = fakeResponse();

  await controller.createSuggestion(
    { user: CLIENT_REQUEST, body: { excluir_productos: [1] } },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(toPlain(response.body.productos.map((p) => p.id_producto)), [5]);
});

test('POST validates excluir_productos: it must be an array of positive integers', async () => {
  const { controller } = loadPostController();
  const bodies = [
    { excluir_productos: 'todos' },
    { excluir_productos: [1, -3] },
    { excluir_productos: [0] },
    { excluir_productos: [1.5] },
  ];

  for (const body of bodies) {
    const response = fakeResponse();
    await controller.createSuggestion({ user: CLIENT_REQUEST, body }, response);
    assert.equal(response.statusCode, 400, JSON.stringify(body));
    assert.ok(Array.isArray(response.body.error));
  }
});

test('POST returns 409 when every available product is excluded', async () => {
  const { controller } = loadPostController();
  const response = fakeResponse();

  await controller.createSuggestion(
    { user: CLIENT_REQUEST, body: { carrito: [], excluir_productos: [1, 2, 5, 6] } },
    response
  );

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, 'No hay más productos disponibles para sugerirte en este momento.');
});

test('POST returns 502 when every AI suggestion is invalid', async () => {
  const { controller } = loadPostController({
    geminiResult: { sugerencias: [{ id_producto: 999, motivo: 'Inventado.' }] },
  });
  const response = fakeResponse();

  await controller.createSuggestion({ user: CLIENT_REQUEST, body: {} }, response);

  assert.equal(response.statusCode, 502);
  assert.equal(response.body.error, 'La IA no devolvió una sugerencia válida. Probá de nuevo.');
});

test('POST returns 502 when the AI answer is not valid JSON', async () => {
  const invalidJsonError = new Error('Gemini returned invalid JSON');
  invalidJsonError.code = 'AI_INVALID_RESPONSE';
  const { controller } = loadPostController({ geminiError: invalidJsonError });
  const response = fakeResponse();

  await controller.createSuggestion({ user: CLIENT_REQUEST, body: {} }, response);

  assert.equal(response.statusCode, 502);
});

test('POST maps a missing API key and a Gemini outage to 503', async () => {
  const notConfigured = new Error('GEMINI_API_KEY is not set');
  notConfigured.code = 'AI_NOT_CONFIGURED';
  const unavailable = new Error('Gemini responded with HTTP 429');
  unavailable.code = 'AI_UNAVAILABLE';

  const cases = [
    [notConfigured, 'La función de sugerencias no está configurada.'],
    [unavailable, 'El servicio de sugerencias no está disponible ahora. Probá en unos minutos.'],
  ];

  for (const [geminiError, message] of cases) {
    const { controller } = loadPostController({ geminiError });
    const response = fakeResponse();

    await controller.createSuggestion({ user: CLIENT_REQUEST, body: {} }, response);

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error, message);
  }
});

test('POST validates the cart: it must be an array of positive integers', async () => {
  const { controller } = loadPostController();
  const bodies = [
    { carrito: 'todo' },
    { carrito: [{ id_producto: 1, cantidad: -2 }] },
    { carrito: [{ id_producto: 0, cantidad: 1 }] },
    { carrito: [{ id_producto: 1 }] },
  ];

  for (const body of bodies) {
    const response = fakeResponse();
    await controller.createSuggestion({ user: CLIENT_REQUEST, body }, response);
    assert.equal(response.statusCode, 400, JSON.stringify(body));
    assert.ok(Array.isArray(response.body.error));
  }
});

test('GET list: a client only sees their own suggestions, admin sees all newest first', async () => {
  const sugerencias = createSugerenciaModel([
    { id_sugerencia: 1, usuario_id: 20, estado: 'pendiente', fecha_generacion: 'f1', respuesta_IA: '{"sugerencias":[]}' },
    { id_sugerencia: 3, usuario_id: 20, estado: 'aceptada', fecha_generacion: 'f3', respuesta_IA: '{"sugerencias":[]}' },
    { id_sugerencia: 2, usuario_id: 30, estado: 'rechazada', fecha_generacion: 'f2', respuesta_IA: '{"sugerencias":[]}' },
  ]);
  const controller = loadController({
    '../models/sugerencia_ia.model': sugerencias,
    '../models/producto.model': createProductoModel(PRODUCTS),
  });

  const clientResponse = fakeResponse();
  await controller.listSuggestions({ user: CLIENT_REQUEST, query: {} }, clientResponse);
  assert.deepEqual(toPlain(clientResponse.body.map((s) => s.id_sugerencia)), [3, 1]);

  const adminResponse = fakeResponse();
  await controller.listSuggestions({ user: { id_usuario: 1, rol: 'administrador' }, query: {} }, adminResponse);
  assert.deepEqual(toPlain(adminResponse.body.map((s) => s.id_sugerencia)), [3, 2, 1]);
});

test('GET mis-sugerencias: an admin with a client profile only sees their own', async () => {
  const sugerencias = createSugerenciaModel([
    { id_sugerencia: 1, usuario_id: 20, estado: 'pendiente', fecha_generacion: 'f1', respuesta_IA: '{"sugerencias":[]}' },
    { id_sugerencia: 2, usuario_id: 1, estado: 'aceptada', fecha_generacion: 'f2', respuesta_IA: '{"sugerencias":[]}' },
    { id_sugerencia: 3, usuario_id: 1, estado: 'rechazada', fecha_generacion: 'f3', respuesta_IA: '{"sugerencias":[]}' },
  ]);
  const controller = loadController({
    '../models/sugerencia_ia.model': sugerencias,
    '../models/producto.model': createProductoModel(PRODUCTS),
  });

  const response = fakeResponse();
  await controller.listMySuggestions({ user: { id_usuario: 1, rol: 'administrador' }, query: {} }, response);

  assert.deepEqual(toPlain(response.body.map((s) => s.id_sugerencia)), [3, 2]);
});

test('the route /mis-sugerencias is declared before /:id so it is not captured by it', () => {
  const router = require('../src/routes/sugerencia.routes');

  const getPaths = router.stack
    .filter((layer) => layer.route?.methods.get)
    .map((layer) => layer.route.path);

  assert.ok(getPaths.includes('/mis-sugerencias'));
  assert.ok(getPaths.indexOf('/mis-sugerencias') < getPaths.indexOf('/:id'));
});

test('GET by id: owner gets 200, another client gets 403, missing gets 404', async () => {
  const sugerencias = createSugerenciaModel([
    {
      id_sugerencia: 1,
      usuario_id: 20,
      estado: 'pendiente',
      fecha_generacion: 'f1',
      respuesta_IA: '{"sugerencias":[{"id_producto":1,"motivo":"Para tu objetivo."}]}',
    },
  ]);
  const controller = loadController({
    '../models/sugerencia_ia.model': sugerencias,
    '../models/producto.model': createProductoModel(PRODUCTS),
  });

  const ownResponse = fakeResponse();
  await controller.getSuggestion({ user: CLIENT_REQUEST, params: { id: '1' } }, ownResponse);
  assert.equal(ownResponse.statusCode, 200);
  assert.equal(ownResponse.body.productos[0].motivo, 'Para tu objetivo.');

  const otherResponse = fakeResponse();
  await controller.getSuggestion({ user: { id_usuario: 30, rol: 'cliente' }, params: { id: '1' } }, otherResponse);
  assert.equal(otherResponse.statusCode, 403);

  const missingResponse = fakeResponse();
  await controller.getSuggestion({ user: CLIENT_REQUEST, params: { id: '99' } }, missingResponse);
  assert.equal(missingResponse.statusCode, 404);

  const invalidResponse = fakeResponse();
  await controller.getSuggestion({ user: CLIENT_REQUEST, params: { id: 'abc' } }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
});

test('PATCH estado: pendiente -> aceptada once, a second PATCH gets 409', async () => {
  const sugerencias = createSugerenciaModel([
    { id_sugerencia: 1, usuario_id: 20, estado: 'pendiente', fecha_generacion: 'f1', respuesta_IA: '{"sugerencias":[]}' },
    { id_sugerencia: 2, usuario_id: 30, estado: 'pendiente', fecha_generacion: 'f2', respuesta_IA: '{"sugerencias":[]}' },
  ]);
  const controller = loadController({
    '../models/sugerencia_ia.model': sugerencias,
    '../models/producto.model': createProductoModel(PRODUCTS),
  });

  const firstResponse = fakeResponse();
  await controller.updateSuggestionStatus(
    { user: CLIENT_REQUEST, params: { id: '1' }, body: { estado: 'aceptada' } },
    firstResponse
  );
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.estado, 'aceptada');

  // Un doble clic no rompe nada: la sugerencia ya fue respondida.
  const secondResponse = fakeResponse();
  await controller.updateSuggestionStatus(
    { user: CLIENT_REQUEST, params: { id: '1' }, body: { estado: 'rechazada' } },
    secondResponse
  );
  assert.equal(secondResponse.statusCode, 409);
  assert.equal(secondResponse.body.error, 'Esta sugerencia ya fue respondida.');

  const invalidResponse = fakeResponse();
  await controller.updateSuggestionStatus(
    { user: CLIENT_REQUEST, params: { id: '2' }, body: { estado: 'pendiente' } },
    invalidResponse
  );
  assert.equal(invalidResponse.statusCode, 400);

  const otherClientResponse = fakeResponse();
  await controller.updateSuggestionStatus(
    { user: { id_usuario: 30, rol: 'cliente' }, params: { id: '1' }, body: { estado: 'aceptada' } },
    otherClientResponse
  );
  assert.equal(otherClientResponse.statusCode, 403);
});

test('DELETE: the owner gets 204, another client gets 403, admin can delete', async () => {
  const sugerencias = createSugerenciaModel([
    { id_sugerencia: 1, usuario_id: 20, estado: 'pendiente', respuesta_IA: '{"sugerencias":[]}' },
    { id_sugerencia: 2, usuario_id: 20, estado: 'pendiente', respuesta_IA: '{"sugerencias":[]}' },
  ]);
  const controller = loadController({
    '../models/sugerencia_ia.model': sugerencias,
    '../models/producto.model': createProductoModel(PRODUCTS),
  });

  const ownResponse = fakeResponse();
  await controller.deleteSuggestion({ user: CLIENT_REQUEST, params: { id: '1' } }, ownResponse);
  assert.equal(ownResponse.statusCode, 204);

  const otherClientResponse = fakeResponse();
  await controller.deleteSuggestion({ user: { id_usuario: 30, rol: 'cliente' }, params: { id: '2' } }, otherClientResponse);
  assert.equal(otherClientResponse.statusCode, 403);

  const adminResponse = fakeResponse();
  await controller.deleteSuggestion({ user: { id_usuario: 1, rol: 'administrador' }, params: { id: '2' } }, adminResponse);
  assert.equal(adminResponse.statusCode, 204);

  const deletedResponse = fakeResponse();
  await controller.deleteSuggestion({ user: CLIENT_REQUEST, params: { id: '2' } }, deletedResponse);
  assert.equal(deletedResponse.statusCode, 404);
});

test('gemini service throws AI_NOT_CONFIGURED when the API key is missing', async () => {
  const service = loadGeminiService({}, async () => {
    throw new Error('fetch should never run without an API key');
  });

  await expectErrorCode(
    service.generateProductSuggestions({ systemInstruction: 'a', userPrompt: 'b', responseSchema: {} }),
    'AI_NOT_CONFIGURED'
  );
});

test('gemini service sends the key in the header and parses the JSON answer', async () => {
  let captured;
  const service = loadGeminiService(
    { GEMINI_API_KEY: 'test-secret-key' },
    async (url, options) => {
      captured = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'internal reasoning', thought: true },
                  { text: '{"sugerencias":[{"id_producto":1,"motivo":"ok"}]}' },
                ],
              },
            },
          ],
        }),
      };
    }
  );

  const result = await service.generateProductSuggestions({
    systemInstruction: 'system',
    userPrompt: 'user',
    responseSchema: { type: 'OBJECT' },
  });

  assert.deepEqual(toPlain(result), { sugerencias: [{ id_producto: 1, motivo: 'ok' }] });
  assert.equal(captured.options.headers['x-goog-api-key'], 'test-secret-key');
  assert.ok(!captured.url.includes('test-secret-key'), 'the API key must never go in the URL');
  assert.equal(JSON.parse(captured.options.body).generationConfig.responseMimeType, 'application/json');
  // Without this the model spends seconds "thinking" before answering.
  assert.equal(JSON.parse(captured.options.body).generationConfig.thinkingConfig.thinkingBudget, 0);
});

test('gemini service maps HTTP errors and network failures to AI_UNAVAILABLE', async () => {
  const quotaExceeded = loadGeminiService({ GEMINI_API_KEY: 'k' }, async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { code: 429, message: 'quota exceeded', status: 'RESOURCE_EXHAUSTED' } }),
  }));
  await expectErrorCode(
    quotaExceeded.generateProductSuggestions({ systemInstruction: 'a', userPrompt: 'b', responseSchema: {} }),
    'AI_UNAVAILABLE'
  );

  const networkDown = loadGeminiService({ GEMINI_API_KEY: 'k' }, async () => {
    throw new Error('socket hang up');
  });
  await expectErrorCode(
    networkDown.generateProductSuggestions({ systemInstruction: 'a', userPrompt: 'b', responseSchema: {} }),
    'AI_UNAVAILABLE'
  );
});

test('gemini service throws AI_INVALID_RESPONSE on missing or unparsable text', async () => {
  const blocked = loadGeminiService({ GEMINI_API_KEY: 'k' }, async () => ({
    ok: true,
    status: 200,
    json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
  }));
  await expectErrorCode(
    blocked.generateProductSuggestions({ systemInstruction: 'a', userPrompt: 'b', responseSchema: {} }),
    'AI_INVALID_RESPONSE'
  );

  const notJson = loadGeminiService({ GEMINI_API_KEY: 'k' }, async () => ({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: 'esto no es JSON' }] } }] }),
  }));
  await expectErrorCode(
    notJson.generateProductSuggestions({ systemInstruction: 'a', userPrompt: 'b', responseSchema: {} }),
    'AI_INVALID_RESPONSE'
  );
});
