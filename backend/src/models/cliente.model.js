// Sequelize model for the "cliente" entity from the DER.
// Like "administrador", it's a subtype of "usuario": its "id_cliente" is
// both its primary key and a foreign key to usuario.id_usuario. On top of
// that it carries the profile fields the AI suggestion engine needs
// (physical data, training habits, goals) plus an optional link to a
// discount category (see "descuento_cliente" in the diagram).

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Usuario = require('./usuario.model');
const Descuento = require('./descuento.model');

const Cliente = sequelize.define(
  'Cliente',
  {
    id_cliente: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Usuario,
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
    objetivo: {
      type: DataTypes.STRING,
    },
    direccion_entrega: {
      type: DataTypes.STRING,
    },
    // FK opcional: 0:1 en el DER, un cliente tiene como mucho un descuento.
    descuento_categoria: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: Descuento,
        key: 'categoría',
      },
    },
  },
  {
    tableName: 'cliente',
    timestamps: false,
  }
);

module.exports = Cliente;
