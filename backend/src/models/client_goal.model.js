// Sequelize model for "cliente_objetivo" (issue #49). A cliente can pick
// between 1 and 3 goals, so "objetivo" is a multivalued attribute: keeping
// it as a comma-separated column in "cliente" would break 1NF. Instead,
// each goal is its own row, and the (id_cliente, objetivo) pair is the
// primary key -- which also stops the same goal from being saved twice.
// The 1-to-3 limit and the closed list of values are checked in
// client-validation.middleware.js.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Client = require('./client.model');

const ClientGoal = sequelize.define(
  'ClientGoal',
  {
    id_cliente: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Client,
        key: 'id_cliente',
      },
    },
    objetivo: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
  },
  {
    tableName: 'cliente_objetivo',
    timestamps: false,
  }
);

module.exports = ClientGoal;
