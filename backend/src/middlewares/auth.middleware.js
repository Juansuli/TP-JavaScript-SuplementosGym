const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  let payload;

  try {
    payload = jwt.verify(header.slice('Bearer '.length), process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  try {
    const user = await Usuario.findByPk(payload.id_usuario);
    if (!user || !user.activo) {
      return res.status(403).json({ error: 'Tu cuenta está inhabilitada.' });
    }

    req.user = { id_usuario: payload.id_usuario, rol: payload.rol };
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo verificar el estado de la cuenta.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tenés permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
