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
const { validateRegistration, validateUserUpdate } = require('../middlewares/cliente-validation.middleware');

const USER_FIELDS = ['email', 'nombre', 'apellido'];
const PASSWORD_ERROR = 'La contraseña debe tener al menos 8 caracteres.';
const DUPLICATE_EMAIL_ERROR = 'Ya existe un usuario con ese email.';

function getAdminId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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
  const errors = validateRegistration(req.body);
  if (errors.length) return res.status(400).json({ error: errors });

  const userData = getAllowedData(req.body);

  try {
    const admin = await sequelize.transaction(async (transaction) => {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

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

// Edita nombre, apellido y email. La contraseña es opcional: si no llega,
// se conserva la actual.
async function updateAdmin(req, res) {
  const id = getAdminId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de administrador no es válido.' });

  const userData = getAllowedData(req.body);
  const { password } = req.body;
  const errors = validateUserUpdate(userData);

  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
    errors.push(PASSWORD_ERROR);
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
// Nadie puede inhabilitarse a sí mismo, así siempre queda al menos un
// administrador activo (el que hace la acción).
async function setAdminStatus(req, res) {
  const id = getAdminId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de administrador no es válido.' });

  if (typeof req.body.activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo es obligatorio y debe ser true o false.' });
  }

  if (id === req.user.id_usuario && !req.body.activo) {
    return res.status(409).json({ error: 'No podés inhabilitar tu propia cuenta.' });
  }

  try {
    const user = await findAdminUser(id);
    if (!user) return res.status(404).json({ error: 'Administrador no encontrado.' });

    await user.update({ activo: req.body.activo });
    return res.json(buildAdminResponse(user));
  } catch (error) {
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
