const repo = require('../repositories/jsonRepository');
const path = require('path');
const productService = require('./productService');
const clientService = require('./clientService');

function money(n){return Number(n||0).toFixed(2);} 

function audit(db,user,accion,detalle){ db.audits = db.audits || []; db.audits.unshift({accion,usuario:user?.usuario||user?.id||'system',detalle,fecha:new Date().toISOString()}); if(db.audits.length>500) db.audits.length=500; }

async function login({usuario,clave}){ const db=repo.load(); const users = Array.isArray(db.users) ? db.users : Array.isArray(db.usuarios) ? db.usuarios : []; const u=users.find(x=>x.usuario===usuario && x.clave===clave && (x.activo === undefined || x.activo === true)); if(!u) return {ok:false,msg:'Usuario o clave incorrectos'}; audit(db,u,'LOGIN','Inicio de sesión'); repo.save(db); return {ok:true,user:{id:u.id,usuario:u.usuario,nombre:u.nombre,rol:u.rol}, business:db.negocio}; }

async function getState(){ const db=repo.load(); const today=new Date().toISOString().slice(0,10); const ventasHoy=(db.sales||[]).filter(s=>s.fecha.slice(0,10)===today); const products = productService.getProducts(); const clients = clientService.getClients(); return { business:db.negocio, categories:db.categories||[], brands:db.brands||[], suppliers:db.suppliers||[], products, clients, sales:(db.sales||[]).slice(0,20), audits:(db.audits||[]).slice(0,50), dashboard:{ productos:products.length, stockBajo:products.filter(p=>p.activo && Number(p.stock)<=Number(p.stockMinimo)).length, ventasHoy:ventasHoy.length, facturadoHoy:ventasHoy.reduce((a,s)=>a+s.total,0), ultimaVenta:db.sales?.[0]?.numero||'--' } };
}

async function saveProduct({product,user}){ const saved = productService.saveProduct({product,user}); return {ok:true,product:saved}; }

async function deleteProduct({id,user}){ const removed = productService.deleteProduct({id,user}); if(!removed) return {ok:false,msg:'Producto no encontrado'}; return {ok:true}; }

async function saveClient({client,user}){ const saved = clientService.saveClient({client,user}); return {ok:true,client:saved}; }

async function deleteClient({id,user}){ const removed = clientService.deleteClient({id,user}); if(!removed) return {ok:false,msg:'Cliente no encontrado'}; return {ok:true}; }

async function searchClients({term}){ const results = clientService.searchClients(term); return {ok:true, clients: results}; }

async function getClients(){ const clients = clientService.getClients(); return {ok:true, clients}; }

async function addClientPurchase({clientId,purchase}){ const updated = clientService.addClientPurchase({clientId,purchase}); return {ok:!!updated, client: updated}; }

async function newSale({items,payment,user}){ const db=repo.load(); db.sales = db.sales || []; const sale = { id: Date.now(), numero: (db.sales.length?('VTA-'+String(db.sales.length+1).padStart(6,'0')):('VTA-000001')), fecha:new Date().toISOString(), usuario:user.usuario||user.id||'user', items, payment, total: items.reduce((a,i)=>a+(i.precio*i.cantidad),0) }; db.sales.unshift(sale); audit(db,user,'SALE',`Venta ${sale.numero}`); repo.save(db); return {ok:true,sale}; }

async function backup({user}){ const db=repo.load(); const file = repo.backup(); audit(db,user,'BACKUP',path.basename(file)); repo.save(db); return {ok:true,file}; }

function buildTicket(negocio,s){ const lines=[]; lines.push(`${negocio.nombre}`); if (s.anulada) lines.push('*** TICKET ANULADO ***'); lines.push(`Ticket: ${s.numero}`); lines.push(`Fecha: ${new Date(s.fecha).toLocaleString('es-AR')}`); lines.push(`Vendedor: ${s.usuario}`); lines.push('-----------------------------'); s.items.forEach(i=>{ lines.push(`${i.descripcion}`); lines.push(` ${i.cantidad} x $${money(i.precio)} = $${money(i.precio*i.cantidad)}`); }); lines.push('-----------------------------'); lines.push(`TOTAL: $${money(s.total)}`); lines.push(`Pago: ${s.payment}`); lines.push(negocio.ticketLeyenda||'Gracias por su compra'); return lines.join('\n'); }

async function ticket(venta, negocio){ const content = buildTicket(negocio,venta); const filename = `VTA-${String(Date.now()).slice(-6)}.txt`; const filepath = repo.writeTicket(filename,content); return filepath; }

async function saveBusiness({user,business}){ const db=repo.load(); db.negocio = Object.assign(db.negocio || {}, business); audit(db,user,'BUSINESS_SAVE','Configuración negocio'); repo.save(db); return {ok:true, business: db.negocio}; }

async function addCatalogValue({type,value,user}){ const db=repo.load(); db[type+'s'] = db[type+'s'] || []; db[type+'s'].push(value); audit(db,user,'CATALOG_ADD',`${type}:${value}`); repo.save(db); return {ok:true}; }

module.exports = { login, getState, saveProduct, deleteProduct, saveClient, deleteClient, searchClients, getClients, addClientPurchase, newSale, backup, ticket, saveBusiness, addCatalogValue };
