// Regla del sistema: siempre tiene que quedar al menos un administrador
// activo. La usan las dos rutas que pueden inhabilitar una cuenta de
// administrador: /api/administradores/:id/estado y /api/clientes/:id/estado
// (esta última también alcanza a un administrador con perfil de cliente).
//
// Se llama dentro de una transacción y bloquea (SELECT ... FOR UPDATE) las
// filas de los administradores activos. Así, si A inhabilita a B al mismo
// tiempo que B inhabilita a A, la segunda operación espera a que termine la
// primera, ve el resultado y se rechaza.

const { Op } = require('sequelize');
const Usuario = require('../models/usuario.model');
const Administrador = require('../models/administrador.model');

const LAST_ACTIVE_ADMIN_ERROR = 'LAST_ACTIVE_ADMIN';

async function ensureAnotherActiveAdmin(id, transaction) {
  const admins = await Administrador.findAll({ transaction });
  const adminIds = admins.map((admin) => admin.id_administrador);

  const activeAdmins = await Usuario.findAll({
    where: { id_usuario: { [Op.in]: adminIds }, activo: true },
    // Siempre en el mismo orden, para que dos transacciones no se bloqueen
    // entre sí (deadlock).
    order: [['id_usuario', 'ASC']],
    lock: true,
    transaction,
  });

  if (!activeAdmins.some((user) => user.id_usuario !== id)) {
    throw new Error(LAST_ACTIVE_ADMIN_ERROR);
  }
}

module.exports = { ensureAnotherActiveAdmin, LAST_ACTIVE_ADMIN_ERROR };
