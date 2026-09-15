const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const Usuario = require('../models/usuario.model');
const Administrador = require('../models/administrador.model');
const Cliente = require('../models/cliente.model');
const Pedido = require('../models/pedido.model');
const { validateRegistration, validateClientData } = require('../middlewares/cliente-validation.middleware');

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
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
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

function buildClientResponse(client, user) {
  const clientData = client.toJSON();
  const userData = user.toJSON();
  delete userData.contraseña;

  return {
    ...userData,
    ...clientData,
    // Le dice al frontend si este usuario ya tiene perfil de cliente, sin
    // importar su rol -- es lo que le permite a un administrador comprar.
    es_cliente: true,
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

  if (req.user.rol !== 'administrador' && req.user.id_usuario !== id) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

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

    if (!user.activo) {
      return res.status(403).json({ error: 'Tu cuenta está inhabilitada. Contactá a un administrador.' });
    }

    const token = signToken(user);

    // Un administrador puede además tener perfil de cliente (ver
    // enableClientProfile) -- si lo tiene, se lo devolvemos junto con sus
    // datos para que el frontend sepa que puede hacer pedidos.
    const clientProfile = await Cliente.findByPk(user.id_usuario);
    if (clientProfile) {
      return res.json({ ...buildClientResponse(clientProfile, user), token });
    }

    const userData = user.toJSON();
    delete userData.contraseña;
    return res.json({ ...userData, es_cliente: false, token });
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

      return { ...buildClientResponse(newClient, user), token: signToken(user) };
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

  if (req.user.rol !== 'administrador' && req.user.id_usuario !== id) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

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

// Le crea un perfil de cliente a un administrador ya logueado, para que
// pueda hacer pedidos como cualquier cliente sin dejar de ser
// administrador. Los campos de perfil son opcionales (ver cliente.model.js).
async function enableClientProfile(req, res) {
  const id = req.user.id_usuario;

  const clientData = getAllowedData(req.body, CLIENT_FIELDS);
  const clientErrors = validateClientData(clientData);
  if (clientErrors.length) return res.status(400).json({ error: clientErrors });

  try {
    const existingClient = await Cliente.findByPk(id);
    if (existingClient) {
      return res.status(409).json({ error: 'Ya tenés un perfil de cliente.' });
    }

    const user = await Usuario.findByPk(id);
    const newClient = await Cliente.create({ id_cliente: id, ...clientData });

    return res.status(201).json(buildClientResponse(newClient, user));
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo habilitar el perfil de cliente.' });
  }
}

async function deleteClient(req, res) {
  const id = getClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de cliente no es válido.' });

  if (req.user.rol !== 'administrador' && req.user.id_usuario !== id) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

  try {
    const orderCount = await Pedido.count({ where: { usuario_id: id } });
    if (orderCount > 0) {
      return res.status(409).json({ error: 'No se puede eliminar un cliente con pedidos asociados.' });
    }

    const deleted = await sequelize.transaction(async (transaction) => {
      const client = await Cliente.findByPk(id, { transaction });
      if (!client) return false;

      await client.destroy({ transaction });

      // Si el usuario también es administrador (perfil de cliente
      // superpuesto), solo se borra el perfil de cliente -- la cuenta de
      // administrador se mantiene intacta.
      const alsoAdmin = await Administrador.findByPk(id, { transaction });
      if (!alsoAdmin) {
        await Usuario.destroy({ where: { id_usuario: id }, transaction });
      }

      return true;
    });

    if (!deleted) return res.status(404).json({ error: 'Cliente no encontrado.' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo eliminar el cliente.' });
  }
}

async function setClientStatus(req, res) {
  const id = getClientId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de cliente no es válido.' });

  if (typeof req.body.activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo es obligatorio y debe ser true o false.' });
  }

  try {
    const client = await Cliente.findByPk(id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const user = await Usuario.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Cliente no encontrado.' });

    await user.update({ activo: req.body.activo });

    return res.json(buildClientResponse(client, user));
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo actualizar el estado del cliente.' });
  }
}

module.exports = {
  listClients,
  getClient,
  login,
  createClient,
  updateClient,
  deleteClient,
  setClientStatus,
  enableClientProfile,
  signToken,
};
