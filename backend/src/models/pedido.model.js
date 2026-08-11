// Sequelize model for the "pedido" entity from the DER. Each pedido
// belongs to exactly one cliente (usuario_id), matching the
// "cliente_pedido" relationship in the diagram.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Cliente = require('./cliente.model');

const Pedido = sequelize.define(
  'Pedido',
  {
    id_pedido: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cliente,
        key: 'id_cliente',
      },
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // "pendiente" | "procesando" | "enviado" | "entregado" | "cancelado"
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    nombre_receptor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    direccion_entrega: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    metodo_pago: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'pedido',
    timestamps: false,
  }
);

module.exports = Pedido;
