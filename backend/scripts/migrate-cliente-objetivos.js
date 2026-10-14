require('dotenv').config();

const sequelize = require('../src/config/db');
const ClienteObjetivo = require('../src/models/cliente_objetivo.model');
const { GOAL_OPTIONS } = require('../src/middlewares/cliente-validation.middleware');

// Issue #49: el objetivo pasa de la columna cliente.objetivo a la tabla
// cliente_objetivo. Este script copia los objetivos que ya existen a la
// tabla nueva y después borra la columna vieja. Se puede correr más de una
// vez: si la columna ya no existe, no hace nada.
async function migrateClientGoals() {
  const queryInterface = sequelize.getQueryInterface();
  await ClienteObjetivo.sync();

  const columns = await queryInterface.describeTable('cliente');
  if (!columns.objetivo) {
    console.log('La columna objetivo ya no existe en cliente.');
    return;
  }

  await sequelize.transaction(async (transaction) => {
    const [clients] = await sequelize.query(
      'SELECT id_cliente, objetivo FROM cliente WHERE objetivo IS NOT NULL',
      { transaction }
    );

    // Valores que no están en la lista cerrada no se copian.
    const rows = clients
      .filter((client) => GOAL_OPTIONS.includes(client.objetivo))
      .map((client) => ({ id_cliente: client.id_cliente, objetivo: client.objetivo }));

    await ClienteObjetivo.bulkCreate(rows, { ignoreDuplicates: true, transaction });
    console.log(`Se copiaron ${rows.length} objetivos a cliente_objetivo.`);
  });

  // En MySQL un ALTER TABLE no se puede deshacer con la transacción, por eso
  // la columna se borra recién cuando los datos ya se copiaron.
  await queryInterface.removeColumn('cliente', 'objetivo');
  console.log('La columna objetivo se borró de cliente.');
}

migrateClientGoals()
  .catch((error) => {
    console.error('No se pudieron migrar los objetivos:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
