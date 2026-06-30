const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT,'database');
const BACKUP_DIR = path.join(DATA_DIR,'backups');
const TICKET_DIR = path.join(ROOT,'tickets');
const LOG_DIR = path.join(ROOT,'logs');
const DB_FILE = path.join(DATA_DIR,'petropos-data.json');
const VERSION = '1.0 RC Build 002';

function ensureDirs(){ [DATA_DIR,BACKUP_DIR,TICKET_DIR,LOG_DIR,path.join(ROOT,'config')].forEach(d=>{ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }); }
function now(){ return new Date().toISOString(); }
function today(){ return new Date().toISOString().slice(0,10); }
function seed(){ return {
  version: VERSION,
  negocio:{nombre:'PetroPOS Professional', razonSocial:'', cuit:'', direccion:'', telefono:'', email:'', iva:'Responsable Monotributo', ticketMm:'80', impresora:'Windows / TXT'},
  usuarios:[{id:1,usuario:'admin',clave:'admin123',nombre:'Administrador',rol:'ADMIN'},{id:2,usuario:'vendedor',clave:'venta123',nombre:'Vendedor',rol:'VENDEDOR'}],
  caja:{abierta:false,fecha:null,usuario:null,saldoInicial:0,movimientos:[]},
  categorias:['General','Bebidas','Almacén','Limpieza','Ferretería'],
  marcas:['Sin marca','Coca Cola','Pepsi','Genérica'],
  proveedores:[{id:1,nombre:'Proveedor General',telefono:'',email:'',direccion:'',activo:true}],
  clientes:[{id:1,nombre:'Consumidor Final',dni:'',telefono:'',email:'',saldo:0,activo:true}],
  productos:[
    {id:1,codigo:'P000001',barra:'7790000000011',descripcion:'Coca Cola 2.25L',marca:'Coca Cola',categoria:'Bebidas',proveedor:'Proveedor General',costo:1800,precio:3200,iva:21,stock:20,minimo:5,activo:true,imagen:'',createdAt:now()},
    {id:2,codigo:'P000002',barra:'7790000000028',descripcion:'Producto demo',marca:'Genérica',categoria:'General',proveedor:'Proveedor General',costo:500,precio:900,iva:21,stock:15,minimo:3,activo:true,imagen:'',createdAt:now()}
  ],
  ventas:[], auditoria:[]
};}
function load(){ ensureDirs(); if(!fs.existsSync(DB_FILE)) save(seed()); return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }
function save(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2),'utf8'); }
function audit(db,user,accion,detalle){ db.auditoria.unshift({fecha:now(),usuario:user?.usuario||'sistema',rol:user?.rol||'',pc:os.hostname(),accion,detalle}); db.auditoria=db.auditoria.slice(0,1000); }
function backup(){ const stamp = new Date().toISOString().replace(/[:.]/g,'-'); const dest=path.join(BACKUP_DIR,`petropos-backup-${stamp}.json`); fs.copyFileSync(DB_FILE,dest); return dest; }
function createWindow(){ const win = new BrowserWindow({width:1360,height:820,minWidth:1100,minHeight:700,webPreferences:{preload:path.join(__dirname,'preload.js')}}); win.loadFile(path.join(__dirname,'app','index.html')); }
app.whenReady().then(()=>{ ensureDirs(); load(); createWindow(); });
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });

ipcMain.handle('db:get',()=>load());
ipcMain.handle('db:save',(e,db,user,accion,detalle)=>{ audit(db,user,accion,detalle); save(db); return load(); });
ipcMain.handle('backup:create',()=>backup());
ipcMain.handle('ticket:create',(e,venta,negocio)=>{ const nro = venta.numero; const file = path.join(TICKET_DIR,`${nro}.txt`); const lines=[]; lines.push(negocio.nombre||'PetroPOS'); lines.push(negocio.razonSocial||''); lines.push(negocio.direccion||''); lines.push('--------------------------------'); lines.push(`Ticket: ${nro}`); lines.push(`Fecha: ${new Date(venta.fecha).toLocaleString('es-AR')}`); lines.push(`Vendedor: ${venta.usuario}`); lines.push('--------------------------------'); venta.items.forEach(i=>lines.push(`${i.descripcion} x${i.cantidad}  $${(i.precio*i.cantidad).toFixed(2)}`)); lines.push('--------------------------------'); lines.push(`TOTAL: $${venta.total.toFixed(2)}`); lines.push(`Pago: ${venta.pago}`); lines.push('Gracias por su compra'); fs.writeFileSync(file,lines.join('\n'),'utf8'); shell.openPath(file); return file; });
