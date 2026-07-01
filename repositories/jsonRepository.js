const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'database');
const DB_FILE = path.join(DATA_DIR, 'petropos-data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const TICKETS_DIR = path.join(ROOT, 'tickets');

function ensureDirs(){ [DATA_DIR,BACKUP_DIR,TICKETS_DIR].forEach(d=>{ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }); }

function seed(){ return {
  negocio:{nombre:'PetroPOS Professional', razonSocial:'', cuit:'', direccion:'', telefono:'', email:'', iva:'Responsable Monotributo', ticketMm:'80', impresora:'Windows / TXT', ticketLeyenda:'Gracias por su compra', ticketAutoOpen:true, logo:'', puntoVenta:'Caja 1', lectorModo:'USB teclado', pointTerminal:'No configurado', abrirCajon:false},
  users:[{id:1,usuario:'admin',clave:'admin123',nombre:'Administrador',rol:'admin',activo:true},{id:2,usuario:'vendedor',clave:'venta123',nombre:'Vendedor',rol:'vendedor',activo:true}],
  clientes:[{id:1,nombre:'Consumidor Final',apellido:'',razonSocial:'',dni:'',cuit:'',condicionIva:'',telefono:'',email:'',domicilio:'',localidad:'',provincia:'',descuento:0,limiteCredito:0,saldoCuentaCorriente:0,observaciones:'',activo:true,historialCompras:[]}],
  clients:[{id:1,nombre:'Consumidor Final',apellido:'',razonSocial:'',dni:'',cuit:'',condicionIva:'',telefono:'',email:'',domicilio:'',localidad:'',provincia:'',descuento:0,limiteCredito:0,saldoCuentaCorriente:0,observaciones:'',activo:true,historialCompras:[]}],
  productos:[],
  products:[],
  ventas:[],
  sales:[],
  auditoria:[],
  audits:[]
}; }

function normalizeLegacy(db){
  if (Array.isArray(db.products) && !Array.isArray(db.productos)) db.productos = db.products;
  if (Array.isArray(db.productos) && !Array.isArray(db.products)) db.products = db.productos;
  if (Array.isArray(db.sales) && !Array.isArray(db.ventas)) db.ventas = db.sales;
  if (Array.isArray(db.ventas) && !Array.isArray(db.sales)) db.sales = db.ventas;
  if (Array.isArray(db.audits) && !Array.isArray(db.auditoria)) db.auditoria = db.audits;
  if (Array.isArray(db.auditoria) && !Array.isArray(db.audits)) db.audits = db.auditoria;
  if (Array.isArray(db.clients) && !Array.isArray(db.clientes)) db.clientes = db.clients;
  if (Array.isArray(db.clientes) && !Array.isArray(db.clients)) db.clients = db.clientes;
  return db;
}

function load(){ ensureDirs(); if(!fs.existsSync(DB_FILE)) save(seed()); const db = normalizeLegacy(JSON.parse(fs.readFileSync(DB_FILE,'utf8'))); return db; }

function save(db){ ensureDirs(); db = normalizeLegacy(db); fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2),'utf8'); }

function backup(){ ensureDirs(); const stamp = new Date().toISOString().replace(/[:.]/g,'-'); const dest=path.join(BACKUP_DIR,`petropos-backup-${stamp}.json`); fs.copyFileSync(DB_FILE,dest); return dest; }

function writeTicket(filename,content){ ensureDirs(); fs.writeFileSync(path.join(TICKETS_DIR,filename), content, 'utf8'); return path.join(TICKETS_DIR,filename); }

module.exports = { load, save, backup, writeTicket, DB_FILE, DATA_DIR, BACKUP_DIR, TICKETS_DIR };
