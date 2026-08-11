// Sequelize model for the "descuento" entity from the DER (the entity
// linked to "cliente" through the "descuento_cliente" relationship).
// "categoria" is the natural primary key here -- a business code like
// "VIP" or "ESTUDIANTE" -- not an autoincrement id.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Descuento = sequelize.define(
  'Descuento',
  {
    categoria: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'descuento',
    timestamps: false,
  }
);

module.exports = Descuento;
