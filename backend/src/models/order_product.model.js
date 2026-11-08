// Sequelize model for "pedido_producto", the join table between "pedido"
// and "producto" (a pedido has many productos, a producto shows up in many
// pedidos). Its primary key is the (id_pedido, id_producto) pair.
// "subtotal" is marked with "*" in the DER, meaning it's a calculated
// attribute -- instead of storing it, we compute it on read via a
// Sequelize VIRTUAL field.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Order = require('./order.model');
const Product = require('./product.model');

const OrderProduct = sequelize.define(
  'OrderProduct',
  {
    id_pedido: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Order,
        key: 'id_pedido',
      },
    },
    id_producto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Product,
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

module.exports = OrderProduct;
