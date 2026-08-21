// Sequelize model for the "producto" entity from the DER
// (docs/Propuesta JS.md). Field names match the DER exactly
// (id_producto, nombre, descripcion, precio, stock, info_nutricional)
// so the database matches the diagram the professor grades against —
// that's the one deliberate place where we keep Spanish names instead
// of translating to English, since it has to match the documented
// data model 1:1.
//
// "estado" is the one exception: it's not in docs/img/der.png yet.
// CUU1 and CUU3 (docs/casos de uso - desarrollo de software.md) need it
// to mark a product as "descontinuado" (soft delete when it has orders)
// or "agotado" (stock hits 0) instead of just blocking those cases.
// Update the DER diagram to add it too, so the two stay in sync.

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
    // "disponible" | "agotado" | "descontinuado" — ver CUU1 y CUU3.
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'disponible',
    },
    info_nutricional: {
      type: DataTypes.TEXT,
    },
    imagen_url: {
      type: DataTypes.STRING(255),
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
