const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const repo = require('../../repositories/jsonRepository');
const service = require('../../services/businessService');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const BACKUP_DIR = path.join(ROOT, 'backups');
const TICKETS_DIR = path.join(ROOT, 'tickets');
const LOGS_DIR = path.join(ROOT, 'logs');
const DB_FILE = path.join(DATA_DIR, 'petropos-data.json');

function ensureDirs(){ [repo.DATA_DIR,repo.BACKUP_DIR,repo.TICKETS_DIR,LOGS_DIR].forEach(d=>{ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }); }
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
function load(){ return repo.load(); }
function save(db){ return repo.save(db); }
function audit(db, user, action, detail){ db.audits = db.audits || []; db.audits.unshift({fecha:now(), usuario:user?.usuario||'sistema', rol:user?.rol||'', accion:action, detalle:detail}); repo.save(db); }
function money(n){ return Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2, maximumFractionDigits:2}); }

function createWindow(){
  const win = new BrowserWindow({ width:1280, height:820, minWidth:1100, minHeight:700, title:'PetroPOS', webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false }});
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(ROOT,'src','renderer','index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });

ipcMain.handle('login', (e, d)=> service.login(d));
ipcMain.handle('getState', ()=> service.getState());
ipcMain.handle('saveBusiness',(e,d)=> service.saveBusiness(d));
ipcMain.handle('saveProduct',(e,d)=> service.saveProduct(d));
ipcMain.handle('deleteProduct',(e,d)=> service.deleteProduct(d));
ipcMain.handle('addCatalogValue',(e,d)=> service.addCatalogValue(d));
ipcMain.handle('newSale',(e,d)=> service.newSale(d));
ipcMain.handle('backup',(e,d)=> service.backup(d));
function buildTicket(b,s){ return `${b.nombre}\n${b.razonSocial||''}\n${b.domicilio||''}\nCUIT: ${b.cuit||'-'}\n-----------------------------\nTicket: ${s.numero}\nFecha: ${new Date(s.fecha).toLocaleString('es-AR')}\nVendedor: ${s.usuario}\n-----------------------------\n${s.items.map(i=>`${i.descripcion}\n ${i.cantidad} x $${money(i.precio)} = $${money(i.precio*i.cantidad)}`).join('\n')}\n-----------------------------\nTOTAL: $${money(s.total)}\nPago: ${s.payment}\n${b.ticketLeyenda||'Gracias por su compra'}\n`; }
