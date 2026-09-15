// Sequelize model for the "usuario" entity from the DER (docs/img/der.png).
// This is the base table for the administrador/cliente specialization:
// both of those tables reuse this table's "id" as their own primary key.
// That's the standard way to map a DER generalization/specialization to
// relational tables -- one base table plus one table per subtype, linked
// 1-to-1 through a shared id.
//
// The specialization is overlapping, not disjoint: "rol" says which
// account a usuario logged in with, but a usuario row can have a matching
// row in BOTH administrador and cliente. That's how an administrador can
// also act as a cliente and place pedidos (see cliente.controller.js'
// enableClientProfile).

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
    // Un usuario inhabilitado no puede iniciar sesión (ver login en
    // cliente.controller.js), pero sigue existiendo -- a diferencia de
    // deleteClient, que sí lo borra. La ruta que lo modifica busca por
    // Cliente, así que también alcanza a un administrador que haya
    // activado su perfil de cliente: inhabilitarlo ahí bloquea su cuenta
    // por completo, no solo sus compras.
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'usuario',
    timestamps: false,
  }
);

module.exports = Usuario;
