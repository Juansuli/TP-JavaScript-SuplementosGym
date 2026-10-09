// Sequelize model for "sugerencia_IA" from the DER: one AI-generated
// suggestion (prompt + response) tied to the cliente that requested it.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Cliente = require('./cliente.model');

const SugerenciaIA = sequelize.define(
  'SugerenciaIA',
  {
    id_sugerencia: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    prompt_enviado: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    respuesta_IA: {
      type: DataTypes.TEXT,
    },
    // "pendiente" | "aceptada" | "rechazada" — ver CUU2 3.a/3.b.
    // Todavía no está en el DER (igual que producto.estado, el equipo
    // actualiza el diagrama aparte).
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
    },
    fecha_generacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cliente,
        key: 'id_cliente',
      },
    },
  },
  {
    tableName: 'sugerencia_ia',
    timestamps: false,
  }
);

module.exports = SugerenciaIA;
