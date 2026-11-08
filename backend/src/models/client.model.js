// Sequelize model for the "cliente" entity from the DER.
// Like "administrador", it's a subtype of "usuario": its "id_cliente" is
// both its primary key and a foreign key to usuario.id_usuario. On top of
// that it carries the profile fields the AI suggestion engine needs
// (physical data, training habits; goals live in "cliente_objetivo") plus an optional link to a
// discount category (see "descuento_cliente" in the diagram).
//
// An administrador can also have a row here (overlapping specialization,
// see user.model.js) -- that's what lets them place pedidos too. All
// the profile fields below are optional for exactly that reason: an
// administrador who just wants to buy something doesn't need to fill out
// a training profile first.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Discount = require('./discount.model');

const Client = sequelize.define(
  'Client',
  {
    id_cliente: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: User,
        key: 'id_usuario',
      },
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
    },
    genero: {
      type: DataTypes.STRING,
    },
    peso_kg: {
      type: DataTypes.DECIMAL(5, 2),
    },
    altura_cm: {
      type: DataTypes.DECIMAL(5, 2),
    },
    ocupacion: {
      type: DataTypes.STRING,
    },
    deporte: {
      type: DataTypes.STRING,
    },
    dias_entrenamiento: {
      type: DataTypes.INTEGER,
    },
    // Los objetivos del cliente (de 1 a 3) están en la tabla aparte
    // "cliente_objetivo" (ver client_goal.model.js, issue #49).
    direccion_entrega: {
      type: DataTypes.STRING,
    },
    // FK opcional: 0:1 en el DER, un cliente tiene como mucho un descuento.
    descuento_categoria: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: Discount,
        key: 'categoría',
      },
    },
  },
  {
    tableName: 'cliente',
    timestamps: false,
  }
);

module.exports = Client;
