const repo = require('./jsonRepository');

function ensurePurchases(db) {
  db.compras = Array.isArray(db.compras) ? db.compras : [];
  return db.compras;
}

function loadPurchases() {
  const db = repo.load();
  return ensurePurchases(db);
}

function getPurchase(id) {
  const purchases = loadPurchases();
  return purchases.find(p => Number(p.id) === Number(id));
}

function savePurchases(purchases) {
  const db = repo.load();
  db.compras = Array.isArray(purchases) ? purchases : [];
  repo.save(db);
  return db.compras;
}

module.exports = { loadPurchases, getPurchase, savePurchases };