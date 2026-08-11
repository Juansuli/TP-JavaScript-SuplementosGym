// Sequelize model for "pedido_producto", the join table between "pedido"
// and "producto" (a pedido has many productos, a producto shows up in many
// pedidos). Its primary key is the (id_pedido, id_producto) pair.
// "subtotal" is marked with "*" in the DER, meaning it's a calculated
// attribute -- instead of storing it, we compute it on read via a
// Sequelize VIRTUAL field.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Pedido = require('./pedido.model');
const Producto = require('./producto.model');

const PedidoProducto = sequelize.define(
  'PedidoProducto',
  {
    id_pedido: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Pedido,
        key: 'id_pedido',
      },
    },
    id_producto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Producto,
        key: 'id_producto',
      },
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.cantidad * this.precio_unitario;
      },
    },
  },
  {
    tableName: 'pedido_producto',
    timestamps: false,
  }
);

module.exports = PedidoProducto;
