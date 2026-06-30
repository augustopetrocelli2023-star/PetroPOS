const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const BACKUP_DIR = path.join(ROOT, 'backups');
const TICKETS_DIR = path.join(ROOT, 'tickets');
const LOGS_DIR = path.join(ROOT, 'logs');
const DB_FILE = path.join(DATA_DIR, 'petropos-data.json');

function ensureDirs(){ [DATA_DIR,BACKUP_DIR,TICKETS_DIR,LOGS_DIR].forEach(d=>{ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }); }
function now(){ return new Date().toISOString(); }
function defaultData(){ return {
  version:'0.3.0',
  business:{ nombre:'Negocio Demo', razonSocial:'', cuit:'', domicilio:'', telefono:'', email:'', iva:'Responsable Monotributo', moneda:'ARS', ticketLeyenda:'Gracias por su compra' },
  users:[{id:1,usuario:'admin',clave:'admin123',nombre:'Administrador',rol:'admin',activo:true},{id:2,usuario:'vendedor',clave:'venta123',nombre:'Vendedor',rol:'vendedor',activo:true}],
  categories:['Almacén','Bebidas','Limpieza','Golosinas'],
  brands:['Genérica','Coca Cola','Arcor','La Serenísima'],
  suppliers:['Proveedor General'],
  products:[
    {id:1,codigo:'779000000001',interno:'PRD-000001',descripcion:'Coca Cola 2.25L',marca:'Coca Cola',categoria:'Bebidas',proveedor:'Proveedor General',costo:1800,precio:3200,iva:21,stock:25,stockMin:5,activo:true},
    {id:2,codigo:'779000000002',interno:'PRD-000002',descripcion:'Alfajor simple',marca:'Arcor',categoria:'Golosinas',proveedor:'Proveedor General',costo:350,precio:650,iva:21,stock:50,stockMin:10,activo:true}
  ],
  sales:[], audits:[]
}; }
function load(){ ensureDirs(); if(!fs.existsSync(DB_FILE)){ fs.writeFileSync(DB_FILE, JSON.stringify(defaultData(),null,2)); } return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }
function save(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }
function audit(db, user, action, detail){ db.audits.unshift({fecha:now(), usuario:user?.usuario||'sistema', rol:user?.rol||'', accion:action, detalle:detail}); }
function money(n){ return Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2, maximumFractionDigits:2}); }

function createWindow(){
  const win = new BrowserWindow({ width:1280, height:820, minWidth:1100, minHeight:700, title:'PetroPOS', webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false }});
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(ROOT,'src','renderer','index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });

ipcMain.handle('login', (e, {usuario, clave})=>{ const db=load(); const u=db.users.find(x=>x.usuario===usuario && x.clave===clave && x.activo); if(!u) return {ok:false,msg:'Usuario o clave incorrectos'}; audit(db,u,'LOGIN','Inicio de sesión'); save(db); return {ok:true,user:{id:u.id,usuario:u.usuario,nombre:u.nombre,rol:u.rol}, business:db.business}; });
ipcMain.handle('getState', ()=>{ const db=load(); const today=new Date().toISOString().slice(0,10); const ventasHoy=db.sales.filter(s=>s.fecha.slice(0,10)===today); return { business:db.business, categories:db.categories, brands:db.brands, suppliers:db.suppliers, products:db.products, sales:db.sales.slice(0,20), audits:db.audits.slice(0,50), dashboard:{ productos:db.products.length, stockBajo:db.products.filter(p=>p.activo && Number(p.stock)<=Number(p.stockMin)).length, ventasHoy:ventasHoy.length, facturadoHoy:ventasHoy.reduce((a,s)=>a+s.total,0), ultimaVenta:db.sales[0]?.numero||'--' }}; });
ipcMain.handle('saveBusiness',(e,{business,user})=>{ const db=load(); db.business={...db.business,...business}; audit(db,user,'CONFIGURACION','Actualizó datos del negocio'); save(db); return {ok:true,business:db.business}; });
ipcMain.handle('saveProduct',(e,{product,user})=>{ const db=load(); if(product.id){ const i=db.products.findIndex(p=>p.id===product.id); if(i>=0){ db.products[i]={...db.products[i],...product,precio:Number(product.precio),costo:Number(product.costo),stock:Number(product.stock),stockMin:Number(product.stockMin),iva:Number(product.iva),activo:!!product.activo}; audit(db,user,'PRODUCTO_EDITAR', product.descripcion); }} else { const id=(Math.max(0,...db.products.map(p=>p.id))+1); const interno='PRD-'+String(id).padStart(6,'0'); db.products.unshift({...product,id,interno,precio:Number(product.precio),costo:Number(product.costo),stock:Number(product.stock),stockMin:Number(product.stockMin),iva:Number(product.iva),activo:true}); audit(db,user,'PRODUCTO_ALTA', product.descripcion); } save(db); return {ok:true, products:db.products}; });
ipcMain.handle('deleteProduct',(e,{id,user})=>{ const db=load(); const p=db.products.find(x=>x.id===id); if(p){ p.activo=false; audit(db,user,'PRODUCTO_BAJA',p.descripcion); save(db);} return {ok:true, products:db.products}; });
ipcMain.handle('addCatalogValue',(e,{type,value,user})=>{ const db=load(); const map={category:'categories',brand:'brands',supplier:'suppliers'}; const k=map[type]; if(k && value && !db[k].includes(value)){ db[k].push(value); audit(db,user,'CATALOGO_ALTA',`${type}: ${value}`); save(db); } return {ok:true, categories:db.categories, brands:db.brands, suppliers:db.suppliers}; });
ipcMain.handle('newSale',(e,{items,payment,user})=>{ const db=load(); if(!items?.length) return {ok:false,msg:'Venta sin productos'}; const saleId=(Math.max(0,...db.sales.map(s=>s.id||0))+1); const numero='VTA-'+String(saleId).padStart(6,'0'); let total=0; items.forEach(it=> total += Number(it.precio)*Number(it.cantidad)); items.forEach(it=>{ const p=db.products.find(x=>x.id===it.id); if(p) p.stock = Number(p.stock)-Number(it.cantidad); }); const sale={id:saleId,numero,fecha:now(),items,payment,total,usuario:user?.usuario||''}; db.sales.unshift(sale); audit(db,user,'VENTA',`${numero} $${money(total)} - ${payment}`); const ticket = buildTicket(db.business,sale); const ticketFile=path.join(TICKETS_DIR,`${numero}.txt`); fs.writeFileSync(ticketFile,ticket); save(db); shell.openPath(ticketFile); return {ok:true,sale,ticketFile}; });
ipcMain.handle('backup',(e,{user})=>{ const db=load(); const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const file=path.join(BACKUP_DIR,`backup-petropos-${stamp}.json`); fs.writeFileSync(file,JSON.stringify(db,null,2)); audit(db,user,'BACKUP',path.basename(file)); save(db); return {ok:true,file}; });
function buildTicket(b,s){ return `${b.nombre}\n${b.razonSocial||''}\n${b.domicilio||''}\nCUIT: ${b.cuit||'-'}\n-----------------------------\nTicket: ${s.numero}\nFecha: ${new Date(s.fecha).toLocaleString('es-AR')}\nVendedor: ${s.usuario}\n-----------------------------\n${s.items.map(i=>`${i.descripcion}\n ${i.cantidad} x $${money(i.precio)} = $${money(i.precio*i.cantidad)}`).join('\n')}\n-----------------------------\nTOTAL: $${money(s.total)}\nPago: ${s.payment}\n${b.ticketLeyenda||'Gracias por su compra'}\n`; }
