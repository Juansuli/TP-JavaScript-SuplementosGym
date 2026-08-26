// Validaciones de los datos de producto que llegan en el body del request.
// El controlador llama a esta función y solo se encarga de responder según el resultado.
function validateProduct(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.nombre !== undefined) {
    if (typeof data.nombre !== 'string') {
      errors.push('El nombre ingresado no es válido.');
    } else if (data.nombre.trim() === '') {
      errors.push('El nombre es obligatorio.');
    }
  }

  if (!isUpdate || data.precio !== undefined) {
    if (data.precio === undefined || data.precio === '' || Number.isNaN(Number(data.precio)) || Number(data.precio) < 0) {
      errors.push('El precio debe ser un número mayor o igual a 0.');
    }
  }

  if (!isUpdate || data.stock !== undefined) {
    if (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) {
      errors.push('El stock debe ser un número entero mayor o igual a 0.');
    }
  }

  return errors;
}

module.exports = { validateProduct };
