const express = require('express');
const {
  createSuggestion,
  listSuggestions,
  listMySuggestions,
  getSuggestion,
  updateSuggestionStatus,
  deleteSuggestion,
} = require('../controllers/sugerencia.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/', createSuggestion);
router.get('/', listSuggestions);
// Antes de '/:id', si no Express tomaría "mis-sugerencias" como un id.
router.get('/mis-sugerencias', listMySuggestions);
router.get('/:id', getSuggestion);
router.patch('/:id/estado', updateSuggestionStatus);
router.delete('/:id', deleteSuggestion);

module.exports = router;
