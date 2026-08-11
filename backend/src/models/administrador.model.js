// Sequelize model for the "administrador" entity from the DER.
// It's a subtype of "usuario" (the "D" disjoint specialization in the
// diagram): every administrador IS a usuario, so this table has no columns
// of its own -- its "id_administrador" is both its primary key and a
// foreign key that points back at usuario.id_usuario.

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
