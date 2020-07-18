const createSortObject = (req) => {
  const sort = {};
  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(':');
    sort[parts[0]] = parts[1] === 'asc' ? 1 : -1;
  }
  return sort;
};

module.exports = {
  createSortObject,
};
