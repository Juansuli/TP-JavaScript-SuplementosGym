// Sequelize model for the "usuario" entity from the DER (docs/img/der.png).
// This is the base table for the administrador/cliente specialization:
// both of those tables reuse this table's "id" as their own primary key.
// That's the standard way to map a DER generalization/specialization to
// relational tables -- one base table plus one table per subtype, linked
// 1-to-1 through a shared id.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define(
  'Usuario',
  {
    id_usuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rol: {
      type: DataTypes.ENUM('administrador', 'cliente'),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Guarda el hash de la contraseña (una vez que se implemente el login),
    // nunca la contraseña en texto plano.
    contraseña: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'usuario',
    timestamps: false,
  }
);

module.exports = Usuario;
