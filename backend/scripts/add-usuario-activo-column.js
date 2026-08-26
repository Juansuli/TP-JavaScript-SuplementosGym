require('dotenv').config();

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

async function addUsuarioActivoColumn() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('usuario');

  if (columns.activo) {
    console.log('La columna activo ya existe en usuario.');
    return;
  }

  await queryInterface.addColumn('usuario', 'activo', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
  console.log('La columna activo se agregó a usuario.');
}

addUsuarioActivoColumn()
  .catch((error) => {
    console.error('No se pudo agregar activo:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
