const repo = require('../repositories/jsonRepository');
const supplierRepo = require('../repositories/supplierRepository');
const auditService = require('./auditService');

function normalizeSupplier(supplier) {
  const now = new Date().toISOString();
  return {
    id: supplier.id || Date.now(),
    nombre: String(supplier.nombre || '').trim(),
    cuit: String(supplier.cuit || '').trim(),
    contacto: String(supplier.contacto || '').trim(),
    telefono: String(supplier.telefono || '').trim(),
    email: String(supplier.email || '').trim(),
    direccion: String(supplier.direccion || '').trim(),
    observaciones: String(supplier.observaciones || '').trim(),
    activo: supplier.activo === false ? false : true,
    createdAt: supplier.createdAt || now,
    updatedAt: now
  };
}

function getSuppliers() {
  const suppliers = supplierRepo.loadSuppliers();
  return suppliers.map(normalizeSupplier);
}

function getSupplierById(id) {
  const supplier = supplierRepo.getSupplier(id);
  return supplier ? normalizeSupplier(supplier) : null;
}

function saveSupplier({ supplier, user }) {
  const normalized = normalizeSupplier(supplier);
  const suppliers = supplierRepo.loadSuppliers();
  const index = suppliers.findIndex(s => Number(s.id) === Number(normalized.id));
  if (index >= 0) {
    const existing = normalizeSupplier(suppliers[index]);
    normalized.createdAt = existing.createdAt;
    normalized.updatedAt = new Date().toISOString();
    suppliers[index] = Object.assign(existing, normalized);
  } else {
    suppliers.unshift(normalized);
  }
  supplierRepo.saveSuppliers(suppliers);
  const db = repo.load();
  auditService.audit(db, user, 'PROVEEDOR_SAVE', normalized.nombre || String(normalized.id));
  repo.save(db);
  return normalized;
}

function deleteSupplier({ id, user }) {
  const removed = supplierRepo.deleteSupplier(id);
  if (!removed) return null;
  const db = repo.load();
  auditService.audit(db, user, 'PROVEEDOR_DELETE', removed.nombre || String(id));
  repo.save(db);
  return normalizeSupplier(removed);
}

module.exports = { getSuppliers, getSupplierById, saveSupplier, deleteSupplier };