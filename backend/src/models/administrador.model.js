// Sequelize model for the "administrador" entity from the DER.
// It's a subtype of "usuario": every administrador IS a usuario, so this
// table has no columns of its own -- its "id_administrador" is both its
// primary key and a foreign key that points back at usuario.id_usuario.
//
// The specialization overlaps with "cliente": the same id_usuario can
// also have a row in the "cliente" table (see cliente.model.js), which is
// how an administrador can also place pedidos like any cliente.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Usuario = require('./usuario.model');

const Administrador = sequelize.define(
  'Administrador',
  {
    id_administrador: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Usuario,
        key: 'id_usuario',
      },
    },
  },
  {
    tableName: 'administrador',
    timestamps: false,
  }
);

module.exports = Administrador;
