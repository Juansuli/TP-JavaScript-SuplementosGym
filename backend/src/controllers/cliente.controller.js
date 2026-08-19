const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const Usuario = require('../models/usuario.model');
const Cliente = require('../models/cliente.model');
const Pedido = require('../models/pedido.model');

const USER_FIELDS = ['email', 'nombre', 'apellido'];
const CLIENT_FIELDS = [
  'fecha_nacimiento',
  'genero',
  'peso_kg',
  'altura_cm',
  'ocupacion',
  'deporte',
  'dias_entrenamiento',
  'objetivo',
  'direccion_entrega',
  'descuento_categoria',
];

function signToken(user) {
  return jwt.sign(
    { id_usuario: user.id_usuario, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

function getClientId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getAllowedData(body, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, typeof body[field] === 'string' ? body[field].trim() : body[field]])
  );
}

function validateRegistration(data) {
  const errors = [];

  if (typeof data.email !== 'string' || !data.email.includes('@')) {
    errors.push('El email es obligatorio y debe ser válido.');
  }

  if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
    errors.push('El nombre es obligatorio.');
  }

  if (typeof data.apellido !== 'string' || data.apellido.trim() === '') {
    errors.push('El apellido es obligatorio.');
  }

  if (typeof data.password !== 'string' || data.password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres.');
  }

  return errors;
}

function validateClientData(data) {
  const errors = [];

  if (data.peso_kg !== undefined && (Number.isNaN(Number(data.peso_kg)) || Number(data.peso_kg) <= 0)) {
    errors.push('El peso debe ser un número mayor a 0.');
  }

  if (data.altura_cm !== undefined && (Number.isNaN(Number(data.altura_cm)) || Number(data.altura_cm) <= 0)) {
    errors.push('La altura debe ser un número mayor a 0.');
  }

  if (data.dias_entrenamiento !== undefined &&
      (!Number.isInteger(Number(data.dias_entrenamiento)) || Number(data.dias_entrenamiento) < 0 || Number(data.dias_entrenamiento) > 7)) {
    errors.push('Los días de entrenamiento deben ser un número entero entre 0 y 7.');
  }

  return errors;
}

function buildClientResponse(client, user) {
  const clientData = client.toJSON();
  const userData = user.toJSON();
  delete userData.contraseña;

  return {
    ...userData,
    ...clientData,
  };
}

async function getClientWithUser(id) {
  const client = await Cliente.findByPk(id);
  if (!client) return null;

  const user = await Usuario.findByPk(id);
  if (!user) return null;

  return buildClientResponse(client, user);
}

async function listClients(req, res) {
  try {
    const clients = await Cliente.findAll({ order: [['id_cliente', 'ASC']] });
    const clientIds = clients.map((client) => client.id_cliente);

    if (clientIds.length === 0) return res.json([]);

    const users = await Usuario.findAll({
      where: { id_usuario: { [Op.in]: clientIds } },
    });
    const usersById = new Map(users.map((user) => [user.id_usuario, user]));
    const response = clients
      .filter((client) => usersById.has(client.id_cliente))
      .map((client) => buildClientResponse(client, usersById.get(client.id_cliente)));

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudieron obtener los clientes.' });
  }
}

async function getClient(req, res) {
  const id = getClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de cliente no es válido.' });

  try {
    const client = await getClientWithUser(id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado.' });
    return res.json(client);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo obtener el cliente.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'El email y la contraseña son obligatorios.' });
  }

  try {
    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.contraseña);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const userData = user.toJSON();
    delete userData.contraseña;

    const token = signToken(user);
    return res.json({ ...userData, token });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
}

async function createClient(req, res) {
  const registrationErrors = validateRegistration(req.body);
  const clientData = getAllowedData(req.body, CLIENT_FIELDS);
  const clientErrors = validateClientData(clientData);
  const errors = [...registrationErrors, ...clientErrors];

  if (errors.length) return res.status(400).json({ error: errors });

  const userData = getAllowedData(req.body, USER_FIELDS);

  try {
    const client = await sequelize.transaction(async (transaction) => {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const user = await Usuario.create(
        {
          ...userData,
          rol: 'cliente',
          contraseña: hashedPassword,
        },
        { transaction }
      );

      const newClient = await Cliente.create(
        {
          id_cliente: user.id_usuario,
          ...clientData,
        },
        { transaction }
      );

      return buildClientResponse(newClient, user);
    });

    return res.status(201).json(client);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    return res.status(500).json({ error: 'No se pudo crear el cliente.' });
  }
}

async function updateClient(req, res) {
  const id = getClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de cliente no es válido.' });

  const userData = getAllowedData(req.body, USER_FIELDS);
  const clientData = getAllowedData(req.body, CLIENT_FIELDS);
  const clientErrors = validateClientData(clientData);

  if (clientErrors.length) return res.status(400).json({ error: clientErrors });

  if (Object.keys(userData).length === 0 && Object.keys(clientData).length === 0) {
    return res.status(400).json({ error: 'Enviá al menos un campo editable.' });
  }

  try {
    const client = await sequelize.transaction(async (transaction) => {
      const existingClient = await Cliente.findByPk(id, { transaction });
      const existingUser = await Usuario.findByPk(id, { transaction });

      if (!existingClient || !existingUser) return null;

      if (Object.keys(userData).length > 0) {
        await existingUser.update(userData, { transaction });
      }

      if (Object.keys(clientData).length > 0) {
        await existingClient.update(clientData, { transaction });
      }

      return buildClientResponse(existingClient, existingUser);
    });

    if (!client) return res.status(404).json({ error: 'Cliente no encontrado.' });
    return res.json(client);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    return res.status(500).json({ error: 'No se pudo actualizar el cliente.' });
  }
}

async function deleteClient(req, res) {
  const id = getClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de cliente no es válido.' });

  try {
    const orderCount = await Pedido.count({ where: { usuario_id: id } });
    if (orderCount > 0) {
      return res.status(409).json({ error: 'No se puede eliminar un cliente con pedidos asociados.' });
    }

    const deleted = await sequelize.transaction(async (transaction) => {
      const client = await Cliente.findByPk(id, { transaction });
      const user = await Usuario.findByPk(id, { transaction });

      if (!client || !user) return false;

      await client.destroy({ transaction });
      await user.destroy({ transaction });
      return true;
    });

    if (!deleted) return res.status(404).json({ error: 'Cliente no encontrado.' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo eliminar el cliente.' });
  }
}

module.exports = {
  listClients,
  getClient,
  login,
  createClient,
  updateClient,
  deleteClient,
};
