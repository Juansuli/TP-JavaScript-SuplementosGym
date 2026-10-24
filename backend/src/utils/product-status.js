function getProductStatus(stock, currentStatus) {
  if (currentStatus === 'habilitado' || currentStatus === 'inhabilitado') return currentStatus;
  if (currentStatus === 'descontinuado') {
    return 'descontinuado';
  }

  return Number(stock) > 0 ? 'disponible' : 'agotado';
}

module.exports = { getProductStatus };
