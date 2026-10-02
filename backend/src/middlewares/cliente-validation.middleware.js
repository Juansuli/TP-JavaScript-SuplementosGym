// Validaciones de los datos de cliente (registro y datos personales del perfil).
// El controlador llama a estas funciones y solo se encarga de responder según el resultado.
function validateRegistration(data) {
  const errors = [];

  if (typeof data.email !== 'string' || !data.email.includes('@')) {
    errors.push('El email es obligatorio y debe ser válido.');
  }

  if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
    errors.push('El nombre es obligatorio.');
  }

  if (typeof data.apellido !== 'string' || data.apellido.trim() === '') {
    errors.push('El apellido es obligatorio.');
  }

  if (typeof data.password !== 'string' || data.password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres.');
  }

  return errors;
}

// Al editar se manda solo lo que cambia, así que cada dato de usuario es
// opcional; pero si llega, tiene que cumplir la misma regla del registro.
function validateUserUpdate(data) {
  const errors = [];

  if (data.email !== undefined && (typeof data.email !== 'string' || !data.email.includes('@'))) {
    errors.push('El email es obligatorio y debe ser válido.');
  }

  if (data.nombre !== undefined && (typeof data.nombre !== 'string' || data.nombre.trim() === '')) {
    errors.push('El nombre es obligatorio.');
  }

  if (data.apellido !== undefined && (typeof data.apellido !== 'string' || data.apellido.trim() === '')) {
    errors.push('El apellido es obligatorio.');
  }

  return errors;
}

// Listas cerradas para que la sugerencia de IA reciba siempre los mismos
// valores (el frontend muestra estas mismas opciones en un <select>).
const GENDER_OPTIONS = ['femenino', 'masculino', 'otro', 'prefiero_no_decir'];
const GOAL_OPTIONS = [
  'ganar_masa_muscular',
  'perder_grasa',
  'mejorar_rendimiento',
  'salud_general',
  'recuperacion',
];
const MIN_AGE = 14;
const MAX_AGE = 100;

// Todos los campos del perfil son opcionales: "undefined" significa que no
// se envió y "null" que el cliente lo quiere dejar vacío.
function isProvided(value) {
  return value !== undefined && value !== null;
}

function isNumberInRange(value, min, max) {
  const number = Number(value);
  return value !== '' && !Number.isNaN(number) && number >= min && number <= max;
}

function getAge(birthDate, today) {
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayNotReachedYet =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

  if (birthdayNotReachedYet) age -= 1;
  return age;
}

function isValidBirthDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);

  // new Date(2000, 1, 31) "corrige" el 31 de febrero al 2 de marzo: si el
  // mes o el día cambiaron, es porque esa fecha no existe.
  if (birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return false;

  const age = getAge(birthDate, new Date());
  return age >= MIN_AGE && age <= MAX_AGE;
}

function validateClientData(data) {
  const errors = [];

  if (isProvided(data.fecha_nacimiento) && !isValidBirthDate(data.fecha_nacimiento)) {
    errors.push(`La fecha de nacimiento debe ser una fecha válida (edad entre ${MIN_AGE} y ${MAX_AGE} años).`);
  }

  if (isProvided(data.genero) && !GENDER_OPTIONS.includes(data.genero)) {
    errors.push('El género no es válido.');
  }

  if (isProvided(data.peso_kg) && !isNumberInRange(data.peso_kg, 20, 300)) {
    errors.push('El peso debe ser un número entre 20 y 300 kg.');
  }

  if (isProvided(data.altura_cm) && !isNumberInRange(data.altura_cm, 100, 250)) {
    errors.push('La altura debe ser un número entre 100 y 250 cm.');
  }

  if (isProvided(data.dias_entrenamiento) &&
      (!Number.isInteger(Number(data.dias_entrenamiento)) || !isNumberInRange(data.dias_entrenamiento, 0, 7))) {
    errors.push('Los días de entrenamiento deben ser un número entero entre 0 y 7.');
  }

  if (isProvided(data.objetivo) && !GOAL_OPTIONS.includes(data.objetivo)) {
    errors.push('El objetivo no es válido.');
  }

  ['ocupacion', 'deporte', 'direccion_entrega'].forEach((field) => {
    if (isProvided(data[field]) && typeof data[field] !== 'string') {
      errors.push(`El campo ${field} debe ser texto.`);
    }
  });

  if (
    data.descuento_categoria !== undefined &&
    data.descuento_categoria !== null &&
    (typeof data.descuento_categoria !== 'string' ||
      data.descuento_categoria.trim() === '')
  ) {
    errors.push('La categoría de descuento debe ser un string no vacío.');
  }

  return errors;
}

module.exports = { validateRegistration, validateUserUpdate, validateClientData };
