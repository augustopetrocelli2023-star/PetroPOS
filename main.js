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
const VERSION = '1.0 RC Build 010';

function ensureDirs(){ [DATA_DIR,BACKUP_DIR,TICKET_DIR,LOG_DIR,path.join(ROOT,'config')].forEach(d=>{ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }); }
function now(){ return new Date().toISOString(); }
function today(){ return new Date().toISOString().slice(0,10); }
function seed(){ return {
  version: VERSION,
  negocio:{nombre:'PetroPOS Professional', razonSocial:'', cuit:'', direccion:'', telefono:'', email:'', iva:'Responsable Monotributo', ticketMm:'80', impresora:'Windows / TXT', ticketLeyenda:'Gracias por su compra', ticketAutoOpen:true, logo:'', puntoVenta:'Caja 1', lectorModo:'USB teclado', pointTerminal:'No configurado', abrirCajon:false},
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
  ventas:[], compras:[], stockMovimientos:[], gastos:[], auditoria:[]
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
ipcMain.handle('ticket:create',(e,venta,negocio)=>{
  const nro = venta.numero;
  const file = path.join(TICKET_DIR,`${nro}.txt`);
  const width = String(negocio.ticketMm || '80') === '58' ? 32 : 42;
  const sep = '-'.repeat(width);
  const center = (t='') => String(t).slice(0,width).padStart(Math.floor((width+String(t).length)/2)).padEnd(width);
  const moneyLine = (label, value) => `${String(label).padEnd(width-14).slice(0,width-14)}$${Number(value||0).toFixed(2).padStart(13)}`;
  const lines=[];
  lines.push(center(negocio.nombre||'PetroPOS Professional'));
  if(negocio.razonSocial) lines.push(center(negocio.razonSocial));
  if(negocio.cuit) lines.push(center('CUIT: '+negocio.cuit));
  if(negocio.iva) lines.push(center(negocio.iva));
  if(negocio.direccion) lines.push(center(negocio.direccion));
  if(negocio.telefono) lines.push(center('Tel: '+negocio.telefono));
  lines.push(sep);
  lines.push(`Ticket: ${nro}`);
  if (venta.anulada) lines.push(center('*** TICKET ANULADO ***'));
  if (venta.devolucion) lines.push(center('*** CON DEVOLUCION ***'));
  lines.push(`Fecha : ${new Date(venta.fecha).toLocaleString('es-AR')}`);
  lines.push(`Caja  : Local`);
  lines.push(`Cajero: ${venta.usuario}`);
  if(venta.clienteNombre) lines.push(`Cliente: ${venta.clienteNombre}`);
  lines.push(sep);
  venta.items.forEach(i=>{
    lines.push(String(i.descripcion).slice(0,width));
    lines.push(`${String(i.cantidad).padStart(3)} x $${Number(i.precio||0).toFixed(2).padStart(10)} = $${Number(i.precio*i.cantidad||0).toFixed(2).padStart(10)}`);
  });
  lines.push(sep);
  const subtotal = venta.items.reduce((a,i)=>a+Number(i.precio||0)*Number(i.cantidad||0),0);
  lines.push(moneyLine('Subtotal', subtotal));
  if (venta.descuento) lines.push(moneyLine('Descuento', -Number(venta.descuento||0)));
  lines.push(moneyLine('TOTAL', venta.total));
  lines.push(`Pago: ${venta.pago}`);
  if (venta.recibido) lines.push(moneyLine('Recibido', venta.recibido));
  if (venta.vuelto) lines.push(moneyLine('Vuelto', venta.vuelto));
  lines.push(sep);
  lines.push(center(negocio.ticketLeyenda || 'Gracias por su compra'));
  lines.push(center('PetroPOS Professional'));
  fs.writeFileSync(file,lines.join('\n'),'utf8');
  if (negocio.ticketAutoOpen !== false) shell.openPath(file);
  return file;
});

ipcMain.handle('system:printers', async () => {
  const wins = BrowserWindow.getAllWindows();
  if (!wins.length) return [];
  try { return await wins[0].webContents.getPrintersAsync(); }
  catch (err) { return [{ name: 'No se pudieron leer impresoras', description: String(err.message || err) }]; }
});
