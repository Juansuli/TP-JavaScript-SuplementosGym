// Sequelize model for the "producto" entity from the DER
// (docs/Propuesta JS.md). Field names match the DER exactly
// (id_producto, nombre, descripcion, precio, stock, info_nutricional)
// so the database matches the diagram the professor grades against —
// that's the one deliberate place where we keep Spanish names instead
// of translating to English, since it has to match the documented
// data model 1:1.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Producto = sequelize.define(
  'Producto',
  {
    id_producto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    info_nutricional: {
      type: DataTypes.TEXT,
    },
  },
  {
    // Without these two options, Sequelize would name the table
    // "Productos" (auto-pluralized) and add its own createdAt/updatedAt
    // columns — neither of which is in the DER.
    tableName: 'producto',
    timestamps: false,
  }
);

module.exports = Producto;
