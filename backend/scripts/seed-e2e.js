require('dotenv').config();

const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/db');
const Usuario = require('../src/models/usuario.model');
const Cliente = require('../src/models/cliente.model');
const Producto = require('../src/models/producto.model');

const TEST_CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'cliente.e2e@dosis.com';
const TEST_CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'contraclientetest';
const TEST_PRODUCT_NAME = 'PRODUCTO TEST E2E';

const clientData = {
  fecha_nacimiento: '2000-01-15',
  genero: 'prefiero_no_decir',
  peso_kg: 70,
  altura_cm: 170,
  ocupacion: 'Estudiante',
  deporte: 'Entrenamiento de fuerza',
  dias_entrenamiento: 3,
  objetivo: 'salud_general',
  direccion_entrega: 'Calle de prueba 123',
};

const productData = {
  descripcion: 'Producto creado para la prueba end-to-end.',
  precio: 1000,
  stock: 10,
  estado: 'disponible',
  info_nutricional: 'Información de prueba.',
};

async function seedEndToEndData() {
  await sequelize.sync();

  await sequelize.transaction(async (transaction) => {
    const hashedPassword = await bcrypt.hash(TEST_CLIENT_PASSWORD, 10);
    const [user] = await Usuario.findOrCreate({
      where: { email: TEST_CLIENT_EMAIL },
      defaults: {
        rol: 'cliente',
        nombre: 'Cliente',
        apellido: 'E2E',
        ['contrase\u00f1a']: hashedPassword,
        activo: true,
      },
      transaction,
    });

    await user.update(
      {
        rol: 'cliente',
        nombre: 'Cliente',
        apellido: 'E2E',
        ['contrase\u00f1a']: hashedPassword,
        activo: true,
      },
      { transaction }
    );

    await Cliente.upsert(
      {
        id_cliente: user.id_usuario,
        ...clientData,
      },
      { transaction }
    );

    const product = await Producto.findOne({
      where: { nombre: TEST_PRODUCT_NAME },
      transaction,
    });

    if (product) {
      await product.update(productData, { transaction });
      return;
    }

    await Producto.create(
      {
        nombre: TEST_PRODUCT_NAME,
        ...productData,
      },
      { transaction }
    );
  });

  console.log('Datos E2E listos: cliente y producto de prueba disponibles.');
}

seedEndToEndData()
  .catch((error) => {
    console.error('No se pudieron preparar los datos E2E:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
