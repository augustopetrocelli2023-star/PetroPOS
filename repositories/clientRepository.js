const repo = require('./jsonRepository');

function ensureClients(db) {
  db.clientes = Array.isArray(db.clientes) ? db.clientes : (Array.isArray(db.clients) ? db.clients : []);
  db.clients = db.clientes;
  return db.clientes;
}

function loadClients() {
  const db = repo.load();
  return ensureClients(db);
}

function getClient(id) {
  const clients = loadClients();
  return clients.find(c => Number(c.id) === Number(id));
}

function saveClients(clients) {
  const db = repo.load();
  db.clientes = Array.isArray(clients) ? clients : [];
  db.clients = db.clientes;
  repo.save(db);
  return db.clientes;
}

function deleteClient(id) {
  const db = repo.load();
  db.clientes = Array.isArray(db.clientes) ? db.clientes : [];
  const index = db.clientes.findIndex(c => Number(c.id) === Number(id));
  if (index < 0) {
    repo.save(db);
    return null;
  }
  const removed = db.clientes.splice(index, 1)[0];
  db.clients = db.clientes;
  repo.save(db);
  return removed;
}

module.exports = { loadClients, getClient, saveClients, deleteClient };
