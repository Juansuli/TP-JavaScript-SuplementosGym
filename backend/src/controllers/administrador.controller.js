// CRUD de administradores (issue #58). Todas las rutas están protegidas
// con authorize('administrador'), así que ningún cliente llega acá.
//
// La "baja" es lógica: se inhabilita la cuenta (usuario.activo = false),
// igual que con los clientes. No se borra el usuario porque puede tener
// pedidos asociados si activó su perfil de cliente.

const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const Usuario = require('../models/usuario.model');
const Administrador = require('../models/administrador.model');
const {
  validateRegistration,
  validateUserUpdate,
  getPasswordError,
} = require('../middlewares/cliente-validation.middleware');
const { ensureAnotherActiveAdmin, LAST_ACTIVE_ADMIN_ERROR } = require('../utils/admin-guard');

const USER_FIELDS = ['email', 'nombre', 'apellido'];
const DUPLICATE_EMAIL_ERROR = 'Ya existe un usuario con ese email.';

// Solo dígitos: rechaza formatos que Number() aceptaría, como "1e2",
// "0x2" o "2.0".
function getAdminId(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Si la request llega sin body (o sin Content-Type JSON), req.body es
// undefined: se usa un objeto vacío para que termine en 400 y no en 500.
function getBody(req) {
  const { body } = req;
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

function getAllowedData(body) {
  return Object.fromEntries(
    USER_FIELDS
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, typeof body[field] === 'string' ? body[field].trim() : body[field]])
  );
}

// Nunca se devuelve la contraseña (ni su hash).
function buildAdminResponse(user) {
  const userData = user.toJSON();
  delete userData.contraseña;
  return userData;
}

// Un usuario es administrador si tiene fila en la tabla administrador.
async function findAdminUser(id, transaction) {
  const options = transaction ? { transaction } : {};
  const admin = await Administrador.findByPk(id, options);
  if (!admin) return null;

  return Usuario.findByPk(id, options);
}

async function listAdmins(req, res) {
  try {
    const admins = await Administrador.findAll();
    const adminIds = admins.map((admin) => admin.id_administrador);

    if (adminIds.length === 0) return res.json([]);

    const users = await Usuario.findAll({
      where: { id_usuario: { [Op.in]: adminIds } },
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });

    return res.json(users.map(buildAdminResponse));
  } catch (error) {
    return res.status(500).json({ error: 'No se pudieron obtener los administradores.' });
  }
}

async function getAdmin(req, res) {
  const id = getAdminId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de administrador no es válido.' });

  try {
    const user = await findAdminUser(id);
    if (!user) return res.status(404).json({ error: 'Administrador no encontrado.' });
    return res.json(buildAdminResponse(user));
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo obtener el administrador.' });
  }
}

async function createAdmin(req, res) {
  const body = getBody(req);
  const errors = validateRegistration(body);
  if (errors.length) return res.status(400).json({ error: errors });

  const userData = getAllowedData(body);

  try {
    const admin = await sequelize.transaction(async (transaction) => {
      const hashedPassword = await bcrypt.hash(body.password, 10);

      const user = await Usuario.create(
        {
          ...userData,
          rol: 'administrador',
          contraseña: hashedPassword,
        },
        { transaction }
      );

      await Administrador.create({ id_administrador: user.id_usuario }, { transaction });

      return buildAdminResponse(user);
    });

    return res.status(201).json(admin);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: DUPLICATE_EMAIL_ERROR });
    }

    return res.status(500).json({ error: 'No se pudo crear el administrador.' });
  }
}

// Edita nombre, apellido y email. La contraseña es opcional: si no llega
// o llega vacía (""), se conserva la actual. Si llega con algo, tiene que
// cumplir las mismas reglas que al crear (una de solo espacios no vale).
async function updateAdmin(req, res) {
  const id = getAdminId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de administrador no es válido.' });

  const body = getBody(req);
  const userData = getAllowedData(body);
  const password = body.password === '' || body.password === null ? undefined : body.password;
  const errors = validateUserUpdate(userData);

  if (password !== undefined) {
    const passwordError = getPasswordError(password);
    if (passwordError) errors.push(passwordError);
  }

  if (errors.length) return res.status(400).json({ error: errors });

  if (Object.keys(userData).length === 0 && password === undefined) {
    return res.status(400).json({ error: 'Enviá al menos un campo editable.' });
  }

  try {
    const admin = await sequelize.transaction(async (transaction) => {
      const user = await findAdminUser(id, transaction);
      if (!user) return null;

      const changes = { ...userData };
      if (password !== undefined) changes.contraseña = await bcrypt.hash(password, 10);

      await user.update(changes, { transaction });
      return buildAdminResponse(user);
    });

    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado.' });
    return res.json(admin);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: DUPLICATE_EMAIL_ERROR });
    }

    return res.status(500).json({ error: 'No se pudo actualizar el administrador.' });
  }
}

// Baja lógica: un administrador inhabilitado no puede iniciar sesión.
// Nadie puede inhabilitarse a sí mismo, y además siempre tiene que quedar
// otro administrador activo (ver utils/admin-guard.js).
async function setAdminStatus(req, res) {
  const id = getAdminId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de administrador no es válido.' });

  const { activo } = getBody(req);
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo es obligatorio y debe ser true o false.' });
  }

  if (id === req.user.id_usuario && !activo) {
    return res.status(409).json({ error: 'No podés inhabilitar tu propia cuenta.' });
  }

  try {
    const admin = await sequelize.transaction(async (transaction) => {
      const user = await findAdminUser(id, transaction);
      if (!user) return null;

      if (!activo) await ensureAnotherActiveAdmin(id, transaction);

      await user.update({ activo }, { transaction });
      return buildAdminResponse(user);
    });

    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado.' });
    return res.json(admin);
  } catch (error) {
    if (error.message === LAST_ACTIVE_ADMIN_ERROR) {
      return res.status(409).json({ error: 'Tiene que quedar al menos un administrador activo.' });
    }

    return res.status(500).json({ error: 'No se pudo actualizar el estado del administrador.' });
  }
}

module.exports = {
  listAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  setAdminStatus,
};
