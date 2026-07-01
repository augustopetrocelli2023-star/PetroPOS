const repo = require('../repositories/jsonRepository');
const path = require('path');

function money(n){return Number(n||0).toFixed(2);} 

function audit(db,user,accion,detalle){ db.audits = db.audits || []; db.audits.unshift({accion,usuario:user?.usuario||user?.id||'system',detalle,fecha:new Date().toISOString()}); if(db.audits.length>500) db.audits.length=500; }

async function login({usuario,clave}){ const db=repo.load(); const u=db.users.find(x=>x.usuario===usuario && x.clave===clave && x.activo); if(!u) return {ok:false,msg:'Usuario o clave incorrectos'}; audit(db,u,'LOGIN','Inicio de sesión'); repo.save(db); return {ok:true,user:{id:u.id,usuario:u.usuario,nombre:u.nombre,rol:u.rol}, business:db.negocio}; }

async function getState(){ const db=repo.load(); const today=new Date().toISOString().slice(0,10); const ventasHoy=(db.sales||[]).filter(s=>s.fecha.slice(0,10)===today); return { business:db.negocio, categories:db.categories||[], brands:db.brands||[], suppliers:db.suppliers||[], products:db.products||[], sales:(db.sales||[]).slice(0,20), audits:(db.audits||[]).slice(0,50), dashboard:{ productos:(db.products||[]).length, stockBajo:(db.products||[]).filter(p=>p.activo && Number(p.stock)<=Number(p.stockMin)).length, ventasHoy:ventasHoy.length, facturadoHoy:ventasHoy.reduce((a,s)=>a+s.total,0), ultimaVenta:db.sales?.[0]?.numero||'--' } };
}

async function saveProduct({product,user}){ const db=repo.load(); db.products = db.products || []; if(product.id){ const i=db.products.findIndex(p=>p.id===product.id); if(i>=0){ db.products[i]=Object.assign(db.products[i],product); } else { product.id = Date.now(); db.products.push(product); } } else { product.id = Date.now(); db.products.push(product); } audit(db,user,'PRODUCT_SAVE',product.descripcion||product.code||''); repo.save(db); return {ok:true,product}; }

async function deleteProduct({id,user}){ const db=repo.load(); db.products = db.products || []; const idx=db.products.findIndex(p=>p.id===id); if(idx>=0){ db.products.splice(idx,1); audit(db,user,'PRODUCT_DELETE',`id:${id}`); repo.save(db); return {ok:true}; } return {ok:false,msg:'Producto no encontrado'}; }

async function newSale({items,payment,user}){ const db=repo.load(); db.sales = db.sales || []; const sale = { id: Date.now(), numero: (db.sales.length?('VTA-'+String(db.sales.length+1).padStart(6,'0')):('VTA-000001')), fecha:new Date().toISOString(), usuario:user.usuario||user.id||'user', items, payment, total: items.reduce((a,i)=>a+(i.precio*i.cantidad),0) }; db.sales.unshift(sale); audit(db,user,'SALE',`Venta ${sale.numero}`); repo.save(db); return {ok:true,sale}; }

async function backup({user}){ const db=repo.load(); const file = repo.backup(); audit(db,user,'BACKUP',path.basename(file)); repo.save(db); return {ok:true,file}; }

function buildTicket(negocio,s){ const lines=[]; lines.push(`${negocio.nombre}`); if (s.anulada) lines.push('*** TICKET ANULADO ***'); lines.push(`Ticket: ${s.numero}`); lines.push(`Fecha: ${new Date(s.fecha).toLocaleString('es-AR')}`); lines.push(`Vendedor: ${s.usuario}`); lines.push('-----------------------------'); s.items.forEach(i=>{ lines.push(`${i.descripcion}`); lines.push(` ${i.cantidad} x $${money(i.precio)} = $${money(i.precio*i.cantidad)}`); }); lines.push('-----------------------------'); lines.push(`TOTAL: $${money(s.total)}`); lines.push(`Pago: ${s.payment}`); lines.push(negocio.ticketLeyenda||'Gracias por su compra'); return lines.join('\n'); }

async function ticket(venta, negocio){ const content = buildTicket(negocio,venta); const filename = `VTA-${String(Date.now()).slice(-6)}.txt`; const filepath = repo.writeTicket(filename,content); return filepath; }

async function saveBusiness({user,business}){ const db=repo.load(); db.negocio = Object.assign(db.negocio || {}, business); audit(db,user,'BUSINESS_SAVE','Configuración negocio'); repo.save(db); return {ok:true, business: db.negocio}; }

async function addCatalogValue({type,value,user}){ const db=repo.load(); db[type+'s'] = db[type+'s'] || []; db[type+'s'].push(value); audit(db,user,'CATALOG_ADD',`${type}:${value}`); repo.save(db); return {ok:true}; }

module.exports = { login, getState, saveProduct, deleteProduct, newSale, backup, ticket, saveBusiness, addCatalogValue };
