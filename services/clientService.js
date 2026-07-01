const repo = require('../repositories/jsonRepository');
const clientRepo = require('../repositories/clientRepository');
const auditService = require('./auditService');

function normalizeClient(client) {
  const now = new Date().toISOString();
  return {
    id: client.id || Date.now(),
    nombre: String(client.nombre || '').trim(),
    apellido: String(client.apellido || '').trim(),
    razonSocial: String(client.razonSocial || '').trim(),
    dni: String(client.dni || '').trim(),
    cuit: String(client.cuit || '').trim(),
    condicionIva: String(client.condicionIva || '').trim(),
    telefono: String(client.telefono || '').trim(),
    email: String(client.email || '').trim(),
    domicilio: String(client.domicilio || client.direccion || '').trim(),
    localidad: String(client.localidad || '').trim(),
    provincia: String(client.provincia || '').trim(),
    descuento: Number(client.descuento || 0),
    limiteCredito: Number(client.limiteCredito || 0),
    saldoCuentaCorriente: Number(client.saldoCuentaCorriente || client.saldo || 0),
    observaciones: String(client.observaciones || '').trim(),
    activo: client.activo === false ? false : true,
    historialCompras: Array.isArray(client.historialCompras) ? client.historialCompras : [],
    createdAt: client.createdAt || now,
    updatedAt: client.updatedAt || now
  };
}

function getClients() {
  const clients = clientRepo.loadClients();
  return clients.map(c => normalizeClient(c));
}

function getClientById(id) {
  const client = clientRepo.getClient(id);
  return client ? normalizeClient(client) : null;
}

function saveClient({ client, user }) {
  const normalized = normalizeClient(client);
  const clients = clientRepo.loadClients();
  const index = clients.findIndex(c => Number(c.id) === Number(normalized.id));
  if (index >= 0) {
    const existing = normalizeClient(clients[index]);
    normalized.historialCompras = existing.historialCompras || normalized.historialCompras;
    normalized.createdAt = existing.createdAt;
    normalized.updatedAt = new Date().toISOString();
    clients[index] = Object.assign(existing, normalized);
  } else {
    normalized.historialCompras.unshift({ fecha: new Date().toISOString(), detalle: 'Cliente creado', usuario: user?.usuario || user?.id || 'sistema' });
    clients.unshift(normalized);
  }
  clientRepo.saveClients(clients);
  const db = repo.load();
  auditService.audit(db, user, 'CLIENTE_SAVE', normalized.nombre || normalized.razonSocial || String(normalized.id));
  repo.save(db);
  return normalized;
}

function deleteClient({ id, user }) {
  const removed = clientRepo.deleteClient(id);
  if (!removed) return null;
  const db = repo.load();
  auditService.audit(db, user, 'CLIENTE_DELETE', removed.nombre || removed.razonSocial || String(id));
  repo.save(db);
  return removed;
}

function searchClients(term) {
  const q = String(term || '').toLowerCase();
  return getClients().filter(c => [c.nombre, c.apellido, c.razonSocial, c.dni, c.cuit, c.telefono].join(' ').toLowerCase().includes(q));
}

function addClientPurchase({ clientId, purchase }) {
  const clients = clientRepo.loadClients();
  const index = clients.findIndex(c => Number(c.id) === Number(clientId));
  if (index < 0) return null;
  const client = normalizeClient(clients[index]);
  client.historialCompras = client.historialCompras || [];
  client.historialCompras.unshift({
    fecha: new Date().toISOString(),
    ...purchase
  });
  client.saldoCuentaCorriente = Number(client.saldoCuentaCorriente || 0) + Number(purchase.importe || 0);
  clients[index] = Object.assign(clients[index], client);
  clientRepo.saveClients(clients);
  return normalizeClient(clients[index]);
}

module.exports = { getClients, getClientById, saveClient, deleteClient, searchClients, addClientPurchase };
