require('dotenv').config();

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

async function addProductImageColumn() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('producto');

  if (columns.imagen_url) {
    console.log('La columna imagen_url ya existe en producto.');
    return;
  }

  await queryInterface.addColumn('producto', 'imagen_url', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
  console.log('La columna imagen_url se agregó a producto.');
}

addProductImageColumn()
  .catch((error) => {
    console.error('No se pudo agregar imagen_url:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());