const repo = require('./jsonRepository');

function ensureProducts(db) {
  db.products = Array.isArray(db.products) ? db.products : [];
  return db.products;
}

function loadProducts() {
  const db = repo.load();
  return ensureProducts(db);
}

function getProduct(id) {
  const products = loadProducts();
  return products.find(p => p.id === id);
}

function saveProducts(products) {
  const db = repo.load();
  db.products = Array.isArray(products) ? products : [];
  repo.save(db);
  return db.products;
}

function deleteProduct(id) {
  const db = repo.load();
  db.products = Array.isArray(db.products) ? db.products : [];
  const index = db.products.findIndex(p => p.id === id);
  if (index < 0) {
    repo.save(db);
    return null;
  }
  const removed = db.products.splice(index, 1)[0];
  repo.save(db);
  return removed;
}

module.exports = { loadProducts, getProduct, saveProducts, deleteProduct };