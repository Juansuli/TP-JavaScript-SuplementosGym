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

function validateClientData(data) {
  const errors = [];

  if (data.peso_kg !== undefined && (Number.isNaN(Number(data.peso_kg)) || Number(data.peso_kg) <= 0)) {
    errors.push('El peso debe ser un número mayor a 0.');
  }

  if (data.altura_cm !== undefined && (Number.isNaN(Number(data.altura_cm)) || Number(data.altura_cm) <= 0)) {
    errors.push('La altura debe ser un número mayor a 0.');
  }

  if (data.dias_entrenamiento !== undefined &&
      (!Number.isInteger(Number(data.dias_entrenamiento)) || Number(data.dias_entrenamiento) < 0 || Number(data.dias_entrenamiento) > 7)) {
    errors.push('Los días de entrenamiento deben ser un número entero entre 0 y 7.');
  }

  return errors;
}

module.exports = { validateRegistration, validateClientData };
