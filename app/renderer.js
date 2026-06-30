let db = null;
let user = null;
let view = 'dashboard';
let editingProduct = null;
let cart = [];
let saleBusy = false;
let saleState = { clienteId: 1, pago: 'Efectivo', recibido: 0, descuento: 0 };

const VERSION = '1.0 RC Build 006';
const $ = s => document.querySelector(s);
const money = n => '$ ' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayKey = () => new Date().toISOString().slice(0, 10);
const esc = v => String(v ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

async function init() {
  db = normalizeDB(await window.api.getDB());
  restoreDraft();
  renderLogin();
  document.addEventListener('keydown', handleShortcuts);
}

function normalizeDB(input) {
  const d = input || {};
  d.negocio = d.negocio || {};
  d.usuarios = Array.isArray(d.usuarios) ? d.usuarios : [];
  d.productos = Array.isArray(d.productos) ? d.productos : [];
  d.clientes = Array.isArray(d.clientes) ? d.clientes : [{ id: 1, nombre: 'Consumidor Final', activo: true }];
  d.proveedores = Array.isArray(d.proveedores) ? d.proveedores : [];
  d.categorias = Array.isArray(d.categorias) ? d.categorias : ['General'];
  d.marcas = Array.isArray(d.marcas) ? d.marcas : ['Sin marca'];
  d.ventas = Array.isArray(d.ventas) ? d.ventas : [];
  d.compras = Array.isArray(d.compras) ? d.compras : [];
  d.stockMovimientos = Array.isArray(d.stockMovimientos) ? d.stockMovimientos : [];
  d.gastos = Array.isArray(d.gastos) ? d.gastos : [];
  d.auditoria = Array.isArray(d.auditoria) ? d.auditoria : [];
  d.caja = d.caja || { abierta: false, movimientos: [], saldoInicial: 0 };
  d.caja.movimientos = Array.isArray(d.caja.movimientos) ? d.caja.movimientos : [];
  d.ventaTemporal = d.ventaTemporal || null;
  d.productos.forEach(p => {
    p.stock = Number(p.stock || 0);
    p.minimo = Number(p.minimo || 0);
    p.precio = Number(p.precio || 0);
    p.costo = Number(p.costo || 0);
    if (p.activo === undefined) p.activo = true;
  });
  return d;
}

async function persist(accion, detalle, rerender = true) {
  db = await window.api.saveDB(db, user, accion, detalle);
  db = normalizeDB(db);
  if (rerender) render();
}

function handleShortcuts(e) {
  if (!user) return;
  if (e.key === 'F6' && view === 'ventas') { e.preventDefault(); finishSale(); }
  if (e.key === 'Escape' && view === 'ventas') { e.preventDefault(); cancelSale(); }
  if (e.key === 'F3' && view === 'productos') { e.preventDefault(); newProduct(); }
  if (e.key === 'F5') { e.preventDefault(); render(); }
}

function renderLogin() {
  $('#app').innerHTML = `<div class="login"><div class="card"><div class="brand">PetroPOS Professional</div><p class="sub">Sistema Integral de Gestión Comercial<br>${VERSION}</p><label>Usuario</label><input id="u" value="admin"><label>Contraseña</label><input id="p" type="password" value="admin123"><div class="toolbar"><button onclick="login()">Ingresar</button></div><p class="muted">Admin: admin/admin123<br>Vendedor: vendedor/venta123</p></div></div>`;
  $('#p').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
}

function login() {
  const u = $('#u').value.trim();
  const p = $('#p').value;
  const found = db.usuarios.find(x => x.usuario === u && x.clave === p);
  if (!found) return alert('Usuario o contraseña incorrectos');
  user = found;
  view = 'dashboard';
  render();
}

function layout(content) {
  const navs = [
    ['dashboard', '🏠 Inicio'], ['ventas', '💰 Ventas'], ['productos', '📦 Productos'], ['stock', '📊 Stock'],
    ['clientes', '👥 Clientes'], ['proveedores', '🚚 Proveedores'], ['compras', '🛒 Compras'], ['caja', '💳 Caja'], ['reportes', '📈 Reportes'],
    ['config', '⚙ Configuración'], ['tecnico', '🔧 Técnico']
  ];
  $('#app').innerHTML = `<div class="layout"><aside class="side"><div class="logo">PetroPOS<br><span class="muted" style="font-size:12px">Professional</span></div>${navs.map(n => `<button class="nav ${view === n[0] ? 'active' : ''}" onclick="view='${n[0]}';render()">${n[1]}</button>`).join('')}<div style="flex:1"></div><button class="nav" onclick="user=null;renderLogin()">Salir</button></aside><main class="main"><header class="top"><div><b>${esc(db.negocio.nombre || 'PetroPOS Professional')}</b><span class="muted"> · ${VERSION}</span></div><div>${esc(user.nombre)} · ${esc(user.rol)} · Caja: ${db.caja.abierta ? 'ABIERTA' : 'CERRADA'}</div></header><section class="content">${content}</section></main></div>`;
}

function render() {
  const pages = { dashboard, ventas, productos, stock, clientes, proveedores, compras, caja, reportes, config, tecnico };
  layout((pages[view] || dashboard)());
  afterRender();
}

function afterRender() {
  if (view === 'ventas') {
    bindPOSControls();
    setPOSReady(true);
  }
  if (view === 'productos') renderProductTable();
}

function bindPOSControls() {
  const scan = $('#scan');
  const pay = $('#pay');
  const client = $('#saleClient');
  const discount = $('#discount');
  const received = $('#received');
  const btnCobrar = $('#btnCobrar');
  const btnCancel = $('#btnCancelSale');

  if (scan) {
    scan.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addScan(); } };
  }
  if (pay) pay.onchange = e => updateSaleField('pago', e.target.value);
  if (client) client.onchange = e => updateSaleField('clienteId', e.target.value);
  if (discount) discount.oninput = e => updateSaleField('descuento', e.target.value);
  if (received) received.oninput = e => updateSaleField('recibido', e.target.value);
  if (btnCobrar) btnCobrar.onclick = finishSale;
  if (btnCancel) btnCancel.onclick = cancelSale;
}

function setPOSReady(focusScan = false) {
  document.body.style.pointerEvents = 'auto';
  document.querySelectorAll('.pos input, .pos select, .pos button').forEach(el => {
    el.disabled = false;
    el.readOnly = false;
    el.style.pointerEvents = 'auto';
    el.removeAttribute('aria-disabled');
    if (el.id === 'btnCobrar' && saleBusy) el.disabled = true;
  });
  const pay = $('#pay');
  if (pay) pay.value = saleState.pago || 'Efectivo';
  const client = $('#saleClient');
  if (client) client.value = String(saleState.clienteId || 1);
  if (focusScan) setTimeout(() => { const scan = $('#scan'); if (scan) { scan.focus(); scan.select?.(); } }, 80);
}

function unlockPOSControls() { setPOSReady(false); }

function updateSaleField(field, value) {
  if (field === 'clienteId') saleState.clienteId = Number(value || 1);
  if (field === 'pago') saleState.pago = value || 'Efectivo';
  if (field === 'descuento') saleState.descuento = Number(value || 0);
  if (field === 'recibido') saleState.recibido = Number(value || 0);
  saveDraft(false);
  refreshSaleTotals();
}

function refreshSaleTotals() {
  const subtotal = cartSubtotal();
  const total = Math.max(0, subtotal - Number(saleState.descuento || 0));
  const vuelto = saleState.pago === 'Efectivo' ? Math.max(0, Number(saleState.recibido || 0) - total) : 0;
  const totalEl = $('#saleTotal');
  const subEl = $('#saleSubtotal');
  const vueltoEl = $('#saleVuelto');
  if (totalEl) totalEl.textContent = money(total);
  if (subEl) subEl.textContent = money(subtotal);
  if (vueltoEl) vueltoEl.textContent = money(vuelto);
}

function soldQty(productId){ return db.ventas.reduce((a,v)=>a+(v.items||[]).filter(i=>i.id===productId).reduce((b,i)=>b+Number(i.cantidad||0),0),0); }

function dashboard() {
  const ventasHoy = db.ventas.filter(v => String(v.fecha || '').slice(0, 10) === todayKey());
  const total = ventasHoy.reduce((a, v) => a + Number(v.total || 0), 0);
  const ganancia = ventasHoy.reduce((a, v) => a + (v.items || []).reduce((b, i) => b + ((Number(i.precio || 0) - Number(i.costo || 0)) * Number(i.cantidad || 0)), 0), 0);
  const low = db.productos.filter(p => p.activo && Number(p.stock) <= Number(p.minimo));
  const ticketProm = ventasHoy.length ? total / ventasHoy.length : 0;
  return `<h1>Dashboard</h1><div class="grid g4"><div class="stat"><h3>Ventas hoy</h3><div class="num">${money(total)}</div></div><div class="stat"><h3>Ganancia estimada</h3><div class="num">${money(ganancia)}</div></div><div class="stat"><h3>Caja</h3><div class="num">${db.caja.abierta ? 'Abierta' : 'Cerrada'}</div></div><div class="stat"><h3>Ticket promedio</h3><div class="num">${money(ticketProm)}</div></div></div><div class="grid g3"><div class="stat"><h3>Productos</h3><div class="num">${db.productos.length}</div></div><div class="stat"><h3>Clientes</h3><div class="num">${db.clientes.length}</div></div><div class="stat"><h3>Stock bajo</h3><div class="num">${low.length}</div></div></div><div class="grid g2"><div class="panel"><h2>Alertas</h2>${low.length ? low.slice(0, 8).map(p => `<p>⚠ ${esc(p.descripcion)} — stock ${p.stock}</p>`).join('') : '<p class="muted">Sin alertas de stock.</p>'}</div><div class="panel"><h2>Últimas ventas</h2>${db.ventas.slice(0, 8).map(v => `<p>${esc(v.numero)} · ${money(v.total)} · ${esc(v.pago)}</p>`).join('') || '<p class="muted">Sin ventas.</p>'}</div></div>`;
}

function productos() {
  return `<h1>Productos</h1><div class="panel"><div class="toolbar"><input id="qProd" placeholder="Buscar por código, barra, marca o descripción" oninput="renderProductTable()"><button onclick="newProduct()">F3 Nuevo</button><button class="secondary" onclick="manageLists()">Categorías / Marcas</button><button class="secondary" onclick="exportCSV('productos')">Exportar CSV</button></div><div id="productForm"></div><div id="productTable"></div></div>`;
}

function renderProductTable() {
  const q = ($('#qProd')?.value || '').toLowerCase();
  const rows = db.productos.filter(p => [p.codigo, p.barra, p.descripcion, p.marca, p.categoria, p.proveedor].join(' ').toLowerCase().includes(q));
  $('#productTable').innerHTML = `<table class="table"><tr><th>Código</th><th>Barra</th><th>Descripción</th><th>Marca</th><th>Categoría</th><th>Costo</th><th>Precio</th><th>Margen</th><th>Stock</th><th>Acciones</th></tr>${rows.map(p => `<tr><td>${esc(p.codigo)}</td><td>${esc(p.barra || '')}</td><td>${esc(p.descripcion)}</td><td>${esc(p.marca || '')}</td><td>${esc(p.categoria || '')}</td><td>${money(p.costo)}</td><td>${money(p.precio)}</td><td>${Number(p.costo) ? Math.round(((p.precio - p.costo) / p.costo) * 100) : 0}%</td><td><span class="pill ${p.stock <= p.minimo ? 'low' : 'okpill'}">${p.stock}</span></td><td><button class="secondary" onclick="editProduct(${p.id})">Editar</button> <button class="secondary" onclick="duplicateProduct(${p.id})">Duplicar</button> <button class="danger" onclick="deleteProduct(${p.id})">Eliminar</button></td></tr>`).join('')}</table>`;
}

function productForm(p = {}) {
  const cats = db.categorias || ['General'];
  const marks = db.marcas || ['Sin marca'];
  const prov = db.proveedores.map(x => x.nombre);
  return `<div class="panel"><h2>${p.id ? 'Editar' : 'Nuevo'} producto</h2><div class="form"><div><label>Código</label><input id="f_codigo" value="${esc(p.codigo || nextCode())}"></div><div><label>Código de barras</label><input id="f_barra" value="${esc(p.barra || '')}"></div><div class="wide"><label>Descripción</label><input id="f_desc" value="${esc(p.descripcion || '')}"></div><div><label>Marca</label><select id="f_marca">${marks.map(x => `<option ${x == p.marca ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div><div><label>Categoría</label><select id="f_cat">${cats.map(x => `<option ${x == p.categoria ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div><div><label>Proveedor</label><select id="f_prov">${prov.map(x => `<option ${x == p.proveedor ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div><div><label>Costo</label><input id="f_costo" type="number" step="0.01" value="${p.costo || 0}"></div><div><label>Precio venta</label><input id="f_precio" type="number" step="0.01" value="${p.precio || 0}"></div><div><label>IVA %</label><input id="f_iva" type="number" value="${p.iva ?? 21}"></div><div><label>Stock</label><input id="f_stock" type="number" value="${p.stock || 0}"></div><div><label>Stock mínimo</label><input id="f_min" type="number" value="${p.minimo || 0}"></div><div><label>Imagen / ruta</label><input id="f_img" value="${esc(p.imagen || '')}"></div><div class="full toolbar"><button onclick="saveProduct()">Guardar</button><button class="secondary" onclick="cancelProduct()">Cancelar</button></div></div></div>`;
}

function nextCode() { return 'P' + String((Math.max(0, ...db.productos.map(p => Number(p.id) || 0)) + 1)).padStart(6, '0'); }
window.newProduct = () => { editingProduct = null; $('#productForm').innerHTML = productForm({}); };
window.editProduct = id => { editingProduct = db.productos.find(p => p.id === id); $('#productForm').innerHTML = productForm(editingProduct); };
window.duplicateProduct = id => { const p = { ...db.productos.find(x => x.id === id), id: null, codigo: nextCode(), barra: '', descripcion: (db.productos.find(x => x.id === id)?.descripcion || '') + ' copia' }; editingProduct = null; $('#productForm').innerHTML = productForm(p); };
window.cancelProduct = () => { $('#productForm').innerHTML = ''; };
window.saveProduct = async () => {
  const p = { id: editingProduct?.id || Date.now(), codigo: $('#f_codigo').value.trim(), barra: $('#f_barra').value.trim(), descripcion: $('#f_desc').value.trim(), marca: $('#f_marca').value, categoria: $('#f_cat').value, proveedor: $('#f_prov').value, costo: +$('#f_costo').value, precio: +$('#f_precio').value, iva: +$('#f_iva').value, stock: +$('#f_stock').value, minimo: +$('#f_min').value, imagen: $('#f_img').value.trim(), activo: true, createdAt: editingProduct?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (!p.codigo) return alert('Falta código interno');
  if (!p.descripcion) return alert('Falta descripción');
  if (db.productos.some(x => x.id !== p.id && String(x.codigo).toLowerCase() === p.codigo.toLowerCase())) return alert('Ya existe un producto con ese código interno');
  if (p.barra && db.productos.some(x => x.id !== p.id && String(x.barra).toLowerCase() === p.barra.toLowerCase())) return alert('Ya existe un producto con ese código de barras');
  const i = db.productos.findIndex(x => x.id === p.id);
  if (i >= 0) db.productos[i] = p; else db.productos.unshift(p);
  await persist('PRODUCTO_GUARDADO', p.descripcion);
};
window.deleteProduct = async id => { if (!confirm('¿Eliminar producto?')) return; const p = db.productos.find(x => x.id === id); db.productos = db.productos.filter(x => x.id !== id); await persist('PRODUCTO_ELIMINADO', p?.descripcion || id); };
window.manageLists = async () => {
  const cats = prompt('Categorías separadas por coma', db.categorias.join(', '));
  if (cats !== null) db.categorias = cats.split(',').map(x => x.trim()).filter(Boolean);
  const marks = prompt('Marcas separadas por coma', db.marcas.join(', '));
  if (marks !== null) db.marcas = marks.split(',').map(x => x.trim()).filter(Boolean);
  await persist('LISTAS_PRODUCTOS_ACTUALIZADAS', 'Categorías y marcas');
};

function ventas() {
  const subtotal = cartSubtotal();
  const descuento = Number(saleState.descuento || 0);
  const total = Math.max(0, subtotal - descuento);
  const vuelto = saleState.pago === 'Efectivo' ? Math.max(0, Number(saleState.recibido || 0) - total) : 0;
  return `<h1>Ventas</h1><div class="pos"><div class="panel"><label>Código / lector de barras / búsqueda</label><input id="scan" autocomplete="off" placeholder="Escanear, escribir código o nombre y ENTER"><table class="table"><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th><th></th></tr>${cart.map((i, idx) => `<tr><td>${esc(i.descripcion)}</td><td><input min="1" value="${i.cantidad}" type="number" onchange="updateCartQty(${idx},this.value)"></td><td>${money(i.precio)}</td><td>${money(i.precio * i.cantidad)}</td><td><button class="danger" onclick="removeCartItem(${idx})">X</button></td></tr>`).join('')}</table><div class="toolbar"><button class="secondary" onclick="saveDraft()">Guardar venta temporal</button><button class="secondary" onclick="restoreDraft(true)">Recuperar temporal</button></div></div><div class="panel"><h2>Total</h2><div id="saleTotal" class="total">${money(total)}</div><label>Cliente</label><select id="saleClient">${db.clientes.map(c => `<option value="${c.id}" ${Number(saleState.clienteId) === Number(c.id) ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select><label>Medio de pago</label><select id="pay"><option ${saleState.pago==='Efectivo'?'selected':''}>Efectivo</option><option ${saleState.pago==='Débito'?'selected':''}>Débito</option><option ${saleState.pago==='Crédito'?'selected':''}>Crédito</option><option ${saleState.pago==='Transferencia'?'selected':''}>Transferencia</option><option ${saleState.pago==='Mercado Pago QR'?'selected':''}>Mercado Pago QR</option><option ${saleState.pago==='Mercado Pago Point - Simulado'?'selected':''}>Mercado Pago Point - Simulado</option><option ${saleState.pago==='Mixto'?'selected':''}>Mixto</option></select><label>Descuento</label><input id="discount" type="number" value="${saleState.descuento || 0}"><label>Recibido ${saleState.pago === 'Efectivo' ? '' : '(solo efectivo)'}</label><input id="received" type="number" value="${saleState.recibido || 0}"><p class="muted">Subtotal: <span id="saleSubtotal">${money(subtotal)}</span><br>Vuelto: <span id="saleVuelto">${money(vuelto)}</span></p><div class="toolbar"><button id="btnCobrar" class="ok" ${saleBusy ? 'disabled' : ''}>${saleBusy ? 'Procesando...' : 'F6 Cobrar'}</button><button id="btnCancelSale" class="secondary" ${saleBusy ? 'disabled' : ''}>ESC Cancelar</button></div><p id="saleStatus" class="muted">Build 006: POS con foco reforzado, sin bloqueo de campos después de cobrar.</p></div></div>`;
}
function cartSubtotal() { return cart.reduce((a, i) => a + Number(i.precio || 0) * Number(i.cantidad || 0), 0); }
function cartTotal() { return Math.max(0, cartSubtotal() - Number(saleState.descuento || 0)); }
window.updateCartQty = (idx, value) => { const n = Math.max(1, Number(value || 1)); if (cart[idx]) cart[idx].cantidad = n; saveDraft(false); render(); };
window.removeCartItem = idx => { cart.splice(idx, 1); saveDraft(false); render(); };
window.cancelSale = () => { if (saleBusy) return; if (cart.length && !confirm('¿Cancelar venta actual?')) return; resetSale(); render(); };
window.addScan = () => {
  if (saleBusy) return;
  const val = $('#scan').value.trim().toLowerCase();
  if (!val) return;
  const p = db.productos.find(x => String(x.codigo || '').toLowerCase() === val || String(x.barra || '').toLowerCase() === val) || db.productos.find(x => String(x.descripcion || '').toLowerCase().includes(val));
  if (!p) return alert('Producto no encontrado');
  if (p.activo === false) return alert('Producto inactivo');
  const ex = cart.find(i => i.id === p.id);
  if (ex) ex.cantidad++; else cart.push({ id: p.id, codigo: p.codigo, descripcion: p.descripcion, costo: Number(p.costo || 0), precio: Number(p.precio || 0), cantidad: 1 });
  $('#scan').value = '';
  saveDraft(false);
  render();
};
function resetSale() { cart = []; saleBusy = false; saleState = { clienteId: 1, pago: 'Efectivo', recibido: 0, descuento: 0 }; db.ventaTemporal = null; }
function saveDraft(show = true) { db.ventaTemporal = cart.length ? { cart, saleState, fecha: new Date().toISOString() } : null; window.api.saveDB(db, user, 'VENTA_TEMPORAL', 'Autoguardado'); if (show) alert('Venta temporal guardada'); }
window.restoreDraft = restoreDraft;
function restoreDraft(show = false) {
  if (!db?.ventaTemporal) { if (show) alert('No hay venta temporal guardada'); return; }
  cart = Array.isArray(db.ventaTemporal.cart) ? db.ventaTemporal.cart : [];
  saleState = db.ventaTemporal.saleState || saleState;
  if (show) render();
}
window.finishSale = async () => {
  if (saleBusy) return;
  if (!cart.length) return alert('No hay productos');
  if (!db.caja.abierta) return alert('Debe abrir la caja antes de vender');
  const pago = $('#pay')?.value || saleState.pago || 'Efectivo';
  const clienteId = Number($('#saleClient')?.value || saleState.clienteId || 1);
  const descuento = Number($('#discount')?.value || saleState.descuento || 0);
  const recibido = Number($('#received')?.value || saleState.recibido || 0);
  const items = cart.map(i => ({ id: i.id, codigo: i.codigo, descripcion: i.descripcion, costo: Number(i.costo || 0), precio: Number(i.precio || 0), cantidad: Number(i.cantidad || 1) }));
  const total = Math.max(0, items.reduce((a, i) => a + i.precio * i.cantidad, 0) - descuento);
  if (pago === 'Efectivo' && recibido > 0 && recibido < total) return alert('El importe recibido es menor al total');
  for (const it of items) {
    const p = db.productos.find(x => x.id === it.id);
    if (!p) return alert('Producto no encontrado: ' + it.descripcion);
    if (Number(p.stock || 0) < it.cantidad && !confirm('El producto "' + it.descripcion + '" no tiene stock suficiente. ¿Continuar igual?')) return;
  }
  saleBusy = true;
  render();
  try {
    const numero = nextSaleNumber();
    const venta = { id: Date.now(), numero, fecha: new Date().toISOString(), usuario: user.usuario, cliente: clienteId, pago, descuento, recibido, vuelto: pago === 'Efectivo' ? Math.max(0, recibido - total) : 0, items, total };
    for (const it of items) { const p = db.productos.find(x => x.id === it.id); if (p) { p.stock = Number(p.stock || 0) - it.cantidad; db.stockMovimientos.unshift({fecha:new Date().toISOString(), productoId:p.id, producto:p.descripcion, tipo:'VENTA', cantidad:-it.cantidad, referencia:numero, usuario:user.usuario}); } }
    db.ventas.unshift(venta);
    db.caja.movimientos.unshift({ fecha: new Date().toISOString(), tipo: 'VENTA', detalle: venta.numero, monto: venta.total, pago: venta.pago, usuario: user.usuario });
    resetSale();
    await persist('VENTA_REALIZADA', venta.numero + ' ' + money(venta.total), false);
    await window.api.ticket(venta, db.negocio);
    saleBusy = false;
    render();
    const st = $('#saleStatus');
    if (st) st.textContent = 'Venta finalizada: ' + venta.numero + '. Listo para la próxima venta.';
    setPOSReady(true);
    return;
  } catch (err) {
    alert('No se pudo finalizar la venta: ' + (err?.message || err));
  } finally {
    saleBusy = false;
    if (view === 'ventas') {
      setPOSReady(true);
    }
  }
};
function nextSaleNumber() { const nums = db.ventas.map(v => Number(String(v.numero || '').replace(/\D/g, '')) || 0); return 'VTA-' + String(Math.max(0, ...nums) + 1).padStart(6, '0'); }

function caja() {
  const total = db.caja.movimientos.reduce((a, m) => a + (m.tipo === 'RETIRO' ? -Number(m.monto || 0) : Number(m.monto || 0)), Number(db.caja.saldoInicial || 0));
  return `<h1>Caja</h1><div class="grid g3"><div class="stat"><h3>Estado</h3><div class="num">${db.caja.abierta ? 'Abierta' : 'Cerrada'}</div></div><div class="stat"><h3>Saldo estimado</h3><div class="num">${money(total)}</div></div><div class="stat"><h3>Movimientos</h3><div class="num">${db.caja.movimientos.length}</div></div></div><div class="panel"><div class="toolbar"><input id="saldo" type="number" placeholder="Saldo inicial / monto"><input id="detalleCaja" placeholder="Detalle"><button onclick="openCash()">Abrir caja</button><button class="danger" onclick="closeCash()">Cerrar caja</button><button class="secondary" onclick="cashMov('INGRESO')">Ingreso</button><button class="secondary" onclick="cashMov('RETIRO')">Retiro</button></div><table class="table"><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Pago</th><th>Monto</th></tr>${db.caja.movimientos.slice(0, 60).map(m => `<tr><td>${new Date(m.fecha).toLocaleString('es-AR')}</td><td>${esc(m.tipo)}</td><td>${esc(m.detalle)}</td><td>${esc(m.pago || '')}</td><td>${money(m.monto)}</td></tr>`).join('')}</table></div>`;
}
window.openCash = async () => { if (db.caja.abierta) return alert('Caja ya abierta'); db.caja = { abierta: true, fecha: new Date().toISOString(), usuario: user.usuario, saldoInicial: +($('#saldo').value || 0), movimientos: [] }; await persist('CAJA_ABIERTA', money(db.caja.saldoInicial)); };
window.closeCash = async () => { if (!db.caja.abierta) return; if (!confirm('¿Cerrar caja?')) return; db.caja.abierta = false; db.caja.fechaCierre = new Date().toISOString(); await persist('CAJA_CERRADA', 'Cierre de caja'); };
window.cashMov = async tipo => { const monto = +($('#saldo').value || 0); if (!monto) return alert('Ingrese monto'); db.caja.movimientos.unshift({ fecha: new Date().toISOString(), tipo, detalle: $('#detalleCaja')?.value || 'Movimiento manual', monto, usuario: user.usuario }); await persist('CAJA_MOVIMIENTO', tipo + ' ' + money(monto)); };

function stock() { return `<h1>Stock</h1><div class="panel"><table class="table"><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th>Estado</th><th>Ajuste</th></tr>${db.productos.map(p => `<tr><td>${esc(p.descripcion)}</td><td>${esc(p.categoria)}</td><td>${p.stock}</td><td>${p.minimo}</td><td>${p.stock <= p.minimo ? '<span class="pill low">Bajo</span>' : '<span class="pill okpill">OK</span>'}</td><td><button class="secondary" onclick="adjustStock(${p.id})">Ajustar</button></td></tr>`).join('')}</table></div><div class="panel"><h2>Kardex / movimientos recientes</h2><table class="table"><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Referencia</th></tr>${db.stockMovimientos.slice(0,80).map(m=>`<tr><td>${new Date(m.fecha).toLocaleString('es-AR')}</td><td>${esc(m.producto)}</td><td>${esc(m.tipo)}</td><td>${m.cantidad}</td><td>${esc(m.referencia||'')}</td></tr>`).join('')}</table></div>`; }
window.adjustStock = async id => { const p = db.productos.find(x => x.id === id); const n = prompt('Nuevo stock para ' + p.descripcion, p.stock); if (n === null) return; const anterior = Number(p.stock||0); p.stock = Number(n || 0); db.stockMovimientos.unshift({fecha:new Date().toISOString(), productoId:p.id, producto:p.descripcion, tipo:'AJUSTE', cantidad:p.stock-anterior, referencia:'Ajuste manual', usuario:user.usuario}); await persist('STOCK_AJUSTADO', p.descripcion + ' => ' + p.stock); };

function clientes() { return crudSimple('Clientes', 'clientes', ['nombre', 'dni', 'telefono', 'email']); }
function proveedores() { return crudSimple('Proveedores', 'proveedores', ['nombre', 'telefono', 'email', 'direccion']); }

function compras() {
  const opts = db.productos.map(p => `<option value="${p.id}">${esc(p.descripcion)} · Stock ${p.stock}</option>`).join('');
  const totalCompras = db.compras.reduce((a,c)=>a+Number(c.total||0),0);
  return `<h1>Compras / ingreso de mercadería</h1><div class="grid g3"><div class="stat"><h3>Compras registradas</h3><div class="num">${db.compras.length}</div></div><div class="stat"><h3>Total compras</h3><div class="num">${money(totalCompras)}</div></div><div class="stat"><h3>Proveedores</h3><div class="num">${db.proveedores.length}</div></div></div><div class="panel"><h2>Nueva compra rápida</h2><div class="toolbar"><select id="buyProduct">${opts}</select><input id="buyQty" type="number" placeholder="Cantidad" value="1"><input id="buyCost" type="number" placeholder="Costo unitario"><button onclick="addPurchase()">Ingresar compra</button></div><p class="muted">Al ingresar una compra se actualiza automáticamente el stock y queda registrado el movimiento.</p></div><div class="panel"><h2>Historial</h2><table class="table"><tr><th>Fecha</th><th>Producto</th><th>Proveedor</th><th>Cant.</th><th>Costo</th><th>Total</th></tr>${db.compras.slice(0,80).map(c=>`<tr><td>${new Date(c.fecha).toLocaleString('es-AR')}</td><td>${esc(c.producto)}</td><td>${esc(c.proveedor||'')}</td><td>${c.cantidad}</td><td>${money(c.costo)}</td><td>${money(c.total)}</td></tr>`).join('')}</table></div>`;
}
window.addPurchase = async () => {
  const id = Number($('#buyProduct')?.value || 0);
  const p = db.productos.find(x=>x.id===id);
  if(!p) return alert('Seleccione un producto');
  const cantidad = Number($('#buyQty')?.value || 0);
  const costo = Number($('#buyCost')?.value || p.costo || 0);
  if(cantidad <= 0) return alert('Ingrese una cantidad válida');
  p.stock = Number(p.stock||0) + cantidad;
  if(costo > 0) p.costo = costo;
  const compra = {id:Date.now(), fecha:new Date().toISOString(), productoId:p.id, producto:p.descripcion, proveedor:p.proveedor||'Proveedor General', cantidad, costo, total:cantidad*costo, usuario:user.usuario};
  db.compras.unshift(compra);
  db.stockMovimientos.unshift({fecha:compra.fecha, productoId:p.id, producto:p.descripcion, tipo:'COMPRA', cantidad, referencia:'Compra rápida', usuario:user.usuario});
  await persist('COMPRA_REGISTRADA', p.descripcion + ' x' + cantidad + ' ' + money(compra.total));
};
function crudSimple(title, key, fields) { return `<h1>${title}</h1><div class="panel"><div class="toolbar">${fields.map(f => `<input id="${key}_${f}" placeholder="${f}">`).join('')}<button onclick="addSimple('${key}','${fields.join(',')}')">Agregar</button></div><table class="table"><tr>${fields.map(f => `<th>${f}</th>`).join('')}<th></th></tr>${db[key].map(x => `<tr>${fields.map(f => `<td>${esc(x[f] || '')}</td>`).join('')}<td><button class="danger" onclick="delSimple('${key}',${x.id})">Eliminar</button></td></tr>`).join('')}</table></div>`; }
window.addSimple = async (key, fields) => { const fs = fields.split(','); const obj = { id: Date.now(), activo: true }; fs.forEach(f => obj[f] = $(`#${key}_${f}`).value); db[key].unshift(obj); await persist(key.toUpperCase() + '_AGREGADO', obj.nombre || ''); };
window.delSimple = async (key, id) => { db[key] = db[key].filter(x => x.id !== id); await persist(key.toUpperCase() + '_ELIMINADO', String(id)); };

function reportes() {
  const total = db.ventas.reduce((a, v) => a + Number(v.total || 0), 0);
  const byPay = db.ventas.reduce((a, v) => { a[v.pago] = (a[v.pago] || 0) + Number(v.total || 0); return a; }, {});
  return `<h1>Reportes</h1><div class="grid g3"><div class="stat"><h3>Total vendido</h3><div class="num">${money(total)}</div></div><div class="stat"><h3>Tickets</h3><div class="num">${db.ventas.length}</div></div><div class="stat"><h3>Compras</h3><div class="num">${db.compras.length}</div></div></div><div class="grid g3"><div class="stat"><h3>Ticket promedio</h3><div class="num">${money(db.ventas.length ? total / db.ventas.length : 0)}</div></div></div><div class="grid g2"><div class="panel"><h2>Por medio de pago</h2>${Object.entries(byPay).map(([k, v]) => `<p>${esc(k)}: <b>${money(v)}</b></p>`).join('') || '<p class="muted">Sin datos</p>'}</div><div class="panel"><h2>Ventas</h2><table class="table"><tr><th>Ticket</th><th>Fecha</th><th>Pago</th><th>Total</th></tr>${db.ventas.map(v => `<tr><td>${esc(v.numero)}</td><td>${new Date(v.fecha).toLocaleString('es-AR')}</td><td>${esc(v.pago)}</td><td>${money(v.total)}</td></tr>`).join('')}</table></div></div>`;
}
function config() { const n = db.negocio; return `<h1>Configuración</h1><div class="panel"><div class="form">${['nombre', 'razonSocial', 'cuit', 'direccion', 'telefono', 'email', 'iva', 'impresora', 'ticketMm'].map(f => `<div><label>${f}</label><input id="cfg_${f}" value="${esc(n[f] || '')}"></div>`).join('')}<div class="full toolbar"><button onclick="saveConfig()">Guardar configuración</button></div></div></div>`; }
window.saveConfig = async () => { ['nombre', 'razonSocial', 'cuit', 'direccion', 'telefono', 'email', 'iva', 'impresora', 'ticketMm'].forEach(f => db.negocio[f] = $(`#cfg_${f}`).value); await persist('CONFIG_GUARDADA', 'Datos del comercio'); };
function tecnico() { return `<h1>Panel Técnico</h1><div class="grid g3"><div class="stat"><h3>Base local</h3><div class="num">JSON estable</div></div><div class="stat"><h3>PC</h3><div class="num">Local</div></div><div class="stat"><h3>Versión</h3><div class="num">Build 006</div></div></div><div class="panel"><div class="toolbar"><button onclick="doBackup()">Crear backup</button><button class="secondary" onclick="exportCSV('ventas')">Exportar ventas CSV</button><button class="secondary" onclick="exportCSV('productos')">Exportar productos CSV</button></div><h2>Auditoría</h2><table class="table"><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr>${db.auditoria.slice(0, 80).map(a => `<tr><td>${new Date(a.fecha).toLocaleString('es-AR')}</td><td>${esc(a.usuario)}</td><td>${esc(a.accion)}</td><td>${esc(a.detalle)}</td></tr>`).join('')}</table></div>`; }
window.doBackup = async () => { const f = await window.api.backup(); alert('Backup creado:\n' + f); };
window.exportCSV = type => { let rows = []; if (type === 'productos') rows = [['codigo', 'barra', 'descripcion', 'marca', 'categoria', 'costo', 'precio', 'stock'], ...db.productos.map(p => [p.codigo, p.barra, p.descripcion, p.marca, p.categoria, p.costo, p.precio, p.stock])]; else if (type === 'compras') rows = [['fecha','producto','proveedor','cantidad','costo','total'], ...db.compras.map(c => [c.fecha,c.producto,c.proveedor,c.cantidad,c.costo,c.total])]; else rows = [['numero', 'fecha', 'usuario', 'pago', 'total'], ...db.ventas.map(v => [v.numero, v.fecha, v.usuario, v.pago, v.total])]; const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${type}.csv`; a.click(); };

window.updateSaleField = updateSaleField;
window.refreshSaleTotals = refreshSaleTotals;
window.unlockPOSControls = unlockPOSControls;
init();
