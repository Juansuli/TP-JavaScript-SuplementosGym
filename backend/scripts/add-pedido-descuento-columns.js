require('dotenv').config();

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

async function addColumnIfMissing(queryInterface, columns, name, definition) {
  if (columns[name]) return;
  await queryInterface.addColumn('pedido', name, definition);
  console.log(`La columna ${name} se agregó a pedido.`);
}

async function addPedidoDiscountColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('pedido');

  await addColumnIfMissing(queryInterface, columns, 'subtotal', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, columns, 'descuento_categoria', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, columns, 'descuento_porcentaje', {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, columns, 'descuento_monto', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });
}

addPedidoDiscountColumns()
  .catch((error) => {
    console.error('No se pudieron agregar las columnas de descuento:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
