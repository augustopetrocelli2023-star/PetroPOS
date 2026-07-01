const repo = require('./jsonRepository');

function ensureSuppliers(db) {
  db.proveedores = Array.isArray(db.proveedores)
    ? db.proveedores
    : Array.isArray(db.suppliers)
      ? db.suppliers
      : [];
  return db.proveedores;
}

function loadSuppliers() {
  const db = repo.load();
  return ensureSuppliers(db);
}

function getSupplier(id) {
  const suppliers = loadSuppliers();
  return suppliers.find(s => Number(s.id) === Number(id));
}

function saveSuppliers(suppliers) {
  const db = repo.load();
  db.proveedores = Array.isArray(suppliers) ? suppliers : [];
  repo.save(db);
  return db.proveedores;
}

function deleteSupplier(id) {
  const db = repo.load();
  db.proveedores = Array.isArray(db.proveedores) ? db.proveedores : [];
  const index = db.proveedores.findIndex(s => Number(s.id) === Number(id));
  if (index < 0) {
    repo.save(db);
    return null;
  }
  const removed = db.proveedores.splice(index, 1)[0];
  repo.save(db);
  return removed;
}

module.exports = { loadSuppliers, getSupplier, saveSuppliers, deleteSupplier };