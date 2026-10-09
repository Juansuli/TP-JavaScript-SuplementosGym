require('dotenv').config();

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

async function addSugerenciaEstadoColumn() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('sugerencia_ia');

  if (columns.estado) {
    console.log('La columna estado ya existe en sugerencia_ia.');
    return;
  }

  await queryInterface.addColumn('sugerencia_ia', 'estado', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pendiente',
  });
  console.log('La columna estado se agregó a sugerencia_ia.');
}

addSugerenciaEstadoColumn()
  .catch((error) => {
    console.error('No se pudo agregar estado:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
