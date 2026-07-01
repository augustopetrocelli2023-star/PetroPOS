const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const repo = require('./repositories/jsonRepository');
const service = require('./services/businessService');
const productService = require('./services/productService');
const clientService = require('./services/clientService');
const supplierService = require('./services/supplierService');
const purchaseService = require('./services/purchaseService');

const ROOT = __dirname;
const VERSION = '1.0 RC Build 010';

function ensureDirs(){ [repo.DATA_DIR,repo.BACKUP_DIR,repo.TICKETS_DIR,path.join(ROOT,'config')].forEach(d=>{ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }); }
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
function load(){ return repo.load(); }
function save(db){ return repo.save(db); }
function audit(db,user,accion,detalle){ db.auditoria = db.auditoria || []; db.auditoria.unshift({fecha:now(),usuario:user?.usuario||'sistema',rol:user?.rol||'',pc:os.hostname(),accion,detalle}); db.auditoria=db.auditoria.slice(0,1000); return repo.save(db); }
function backup(){ return repo.backup(); }
function createWindow(){
  const win = new BrowserWindow({width:1360,height:820,minWidth:1100,minHeight:700,center:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.js')}});
  win.loadFile(path.join(__dirname,'app','index.html'));
  win.once('ready-to-show', ()=>{
    win.center();
    win.show();
    win.focus();
  });
  // DevTools opening removed in production runs
  win.webContents.on('console-message',(e,level,message,line,source)=>{ console.log('RENDERER_CONSOLE',level,message,source + ':' + line); });
  win.webContents.on('did-finish-load', async ()=>{
    try{
      const scripts = await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('script')).map(s=>s.src||s.getAttribute('src')||'inline').join('\\n')");
      console.log('PAGE_SCRIPTS:\n' + scripts);
    }catch(err){ console.log('PAGE_SCRIPTS_ERROR',String(err)); }
  });
}
app.whenReady().then(()=>{ ensureDirs(); load(); createWindow(); });
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });

ipcMain.handle('db:get',()=>load());
ipcMain.handle('db:save',(e,db,user,accion,detalle)=>{ audit(db,user,accion,detalle); save(db); return load(); });
ipcMain.handle('login', (e, d) => service.login(d));
ipcMain.handle('getState', () => service.getState());
ipcMain.handle('getProducts',()=>productService.getProducts());
ipcMain.handle('searchProducts',(e,term)=>productService.searchProducts(term));
ipcMain.handle('saveProduct',(e,payload)=>service.saveProduct(payload));
ipcMain.handle('deleteProduct',(e,payload)=>service.deleteProduct(payload));
ipcMain.handle('getClients',()=>service.getClients());
ipcMain.handle('searchClients',(e,term)=>service.searchClients({term}));
ipcMain.handle('saveClient',(e,payload)=>service.saveClient(payload));
ipcMain.handle('deleteClient',(e,payload)=>service.deleteClient(payload));
ipcMain.handle('addClientPurchase',(e,payload)=>service.addClientPurchase(payload));
ipcMain.handle('getSuppliers',()=>supplierService.getSuppliers());
ipcMain.handle('saveSupplier',(e,payload)=>service.saveSupplier(payload));
ipcMain.handle('deleteSupplier',(e,payload)=>service.deleteSupplier(payload));
ipcMain.handle('getPurchases',()=>purchaseService.getPurchases());
ipcMain.handle('addPurchase',(e,payload)=>purchaseService.addPurchase(payload));
ipcMain.handle('backup:create',()=>backup());
ipcMain.handle('ticket:create',async(e,venta,negocio)=>{
  // delegate to service to build and write ticket
  try {
    const p = await service.ticket(venta, negocio);
    if (negocio.ticketAutoOpen !== false) shell.openPath(p);
    return p;
  } catch (err) { return err.message || String(err); }
});

ipcMain.handle('system:printers', async () => {
  const wins = BrowserWindow.getAllWindows();
  if (!wins.length) return [];
  try { return await wins[0].webContents.getPrintersAsync(); }
  catch (err) { return [{ name: 'No se pudieron leer impresoras', description: String(err.message || err) }]; }
});
