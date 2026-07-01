const repo = require('../repositories/jsonRepository');
const productService = require('./productService');
const productRepo = require('../repositories/productRepository');
const auditService = require('./auditService');

function normalizePurchase(purchase) {
  return {
    id: purchase.id || Date.now(),
    fecha: purchase.fecha || new Date().toISOString(),
    productoId: Number(purchase.productoId || purchase.productId || 0),
    producto: String(purchase.producto || '').trim(),
    proveedor: String(purchase.proveedor || 'Proveedor General').trim(),
    cantidad: Number(purchase.cantidad || 0),
    costo: Number(purchase.costo || 0),
    total: Number(purchase.total || (Number(purchase.cantidad || 0) * Number(purchase.costo || 0))),
    usuario: String(purchase.usuario || purchase.user || 'sistema').trim()
  };
}

function getPurchases() {
  const db = repo.load();
  const purchases = Array.isArray(db.compras) ? db.compras : [];
  return purchases.map(normalizePurchase);
}

function addPurchase({ purchase, user }) {
  const normalized = normalizePurchase(purchase);
  if (!normalized.productoId) return null;
  const product = productRepo.getProduct(normalized.productoId);
  if (!product) return null;

  const updatedProduct = {
    ...product,
    stock: Number(product.stock || 0) + normalized.cantidad,
    costo: normalized.costo > 0 ? normalized.costo : Number(product.costo || 0)
  };

  const savedProduct = productService.saveProduct({ product: updatedProduct, user });

  const db = repo.load();
  db.compras = Array.isArray(db.compras) ? db.compras : [];
  db.stockMovimientos = Array.isArray(db.stockMovimientos) ? db.stockMovimientos : [];
  db.compras.unshift(normalized);
  db.stockMovimientos.unshift({
    fecha: normalized.fecha,
    productoId: normalized.productoId,
    producto: normalized.producto,
    tipo: 'COMPRA',
    cantidad: normalized.cantidad,
    referencia: 'Compra rápida',
    usuario: normalized.usuario
  });
  auditService.audit(db, user, 'COMPRA', `${normalized.producto} x${normalized.cantidad}`);
  repo.save(db);

  return { purchase: normalized, product: savedProduct };
}

module.exports = { getPurchases, addPurchase };