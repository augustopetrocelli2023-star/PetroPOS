const repo = require('../repositories/jsonRepository');
const productRepo = require('../repositories/productRepository');
const auditService = require('./auditService');

const PRODUCT_FIELDS = ['codigoInterno','codigoBarras','descripcion','marca','rubro','categoria','proveedor','unidad','costo','precio','iva','stock','stockMinimo','stockIdeal','ubicacion','imagen','activo','createdAt','updatedAt'];

function normalizeProduct(product) {
  const now = new Date().toISOString();
  return {
    id: product.id || Date.now(),
    codigoInterno: String(product.codigoInterno || product.codigo || '').trim(),
    codigoBarras: String(product.codigoBarras || product.barra || '').trim(),
    descripcion: String(product.descripcion || product.descripcion || '').trim(),
    marca: String(product.marca || '').trim(),
    rubro: String(product.rubro || '').trim(),
    categoria: String(product.categoria || '').trim(),
    proveedor: String(product.proveedor || '').trim(),
    unidad: String(product.unidad || '').trim(),
    costo: Number(product.costo || 0),
    precio: Number(product.precio || 0),
    iva: Number(product.iva || 0),
    stock: Number(product.stock || 0),
    stockMinimo: Number(product.stockMinimo || product.minimo || 0),
    stockIdeal: Number(product.stockIdeal || 0),
    ubicacion: String(product.ubicacion || '').trim(),
    imagen: String(product.imagen || '').trim(),
    activo: product.activo === false ? false : true,
    createdAt: product.createdAt || now,
    updatedAt: now,
    priceHistory: Array.isArray(product.priceHistory) ? product.priceHistory : []
  };
}

function getProducts() {
  const products = productRepo.loadProducts();
  return products.map(p => normalizeProduct(p));
}

function getProductById(id) {
  const product = productRepo.getProduct(id);
  return product ? normalizeProduct(product) : null;
}

function saveProduct({ product, user }) {
  const normalized = normalizeProduct(product);
  const products = productRepo.loadProducts();
  const index = products.findIndex(p => p.id === normalized.id);
  if (index >= 0) {
    const existing = normalizeProduct(products[index]);
    const history = existing.priceHistory || [];
    const now = new Date().toISOString();
    if (existing.precio !== normalized.precio || existing.costo !== normalized.costo) {
      history.unshift({
        fecha: now,
        usuario: user?.usuario || user?.id || 'sistema',
        costoAnterior: existing.costo,
        costoNuevo: normalized.costo,
        precioAnterior: existing.precio,
        precioNuevo: normalized.precio
      });
    }
    normalized.priceHistory = history;
    products[index] = Object.assign(existing, normalized);
  } else {
    normalized.priceHistory = normalized.priceHistory || [];
    normalized.priceHistory.unshift({
      fecha: new Date().toISOString(),
      usuario: user?.usuario || user?.id || 'sistema',
      costoAnterior: null,
      costoNuevo: normalized.costo,
      precioAnterior: null,
      precioNuevo: normalized.precio
    });
    products.unshift(normalized);
  }
  productRepo.saveProducts(products);
  const db = repo.load();
  auditService.audit(db, user, 'PRODUCT_SAVE', normalized.descripcion || normalized.codigoInterno || String(normalized.id));
  repo.save(db);
  return normalized;
}

function deleteProduct({ id, user }) {
  const removed = productRepo.deleteProduct(id);
  if (!removed) return null;
  const db = repo.load();
  auditService.audit(db, user, 'PRODUCT_DELETE', removed.descripcion || removed.codigoInterno || String(id));
  repo.save(db);
  return removed;
}

function searchProducts(term) {
  const q = String(term || '').toLowerCase();
  return getProducts().filter(p => [p.codigoInterno, p.codigoBarras, p.descripcion, p.marca, p.categoria].join(' ').toLowerCase().includes(q));
}

module.exports = { getProducts, getProductById, saveProduct, deleteProduct, searchProducts, PRODUCT_FIELDS };