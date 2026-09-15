require('dotenv').config();

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

async function addPedidoConfirmacionColumn() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('pedido');

  if (columns.fecha_confirmacion) {
    console.log('La columna fecha_confirmacion ya existe en pedido.');
    return;
  }

  await queryInterface.addColumn('pedido', 'fecha_confirmacion', {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });
  console.log('La columna fecha_confirmacion se agregó a pedido.');
}

addPedidoConfirmacionColumn()
  .catch((error) => {
    console.error('No se pudo agregar fecha_confirmacion:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
