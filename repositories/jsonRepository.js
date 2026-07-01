const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'database');
const DB_FILE = path.join(DATA_DIR, 'petropos-data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const TICKETS_DIR = path.join(ROOT, 'tickets');

function ensureDirs(){ [DATA_DIR,BACKUP_DIR,TICKETS_DIR].forEach(d=>{ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }); }

function seed(){ return { negocio:{nombre:'PetroPOS Professional', razonSocial:'', cuit:'', direccion:'', telefono:'', email:'', iva:'Responsable Monotributo', ticketMm:'80', impresora:'Windows / TXT', ticketLeyenda:'Gracias por su compra', ticketAutoOpen:true, logo:'', puntoVenta:'Caja 1', lectorModo:'USB teclado', pointTerminal:'No configurado', abrirCajon:false}, users:[{id:1,usuario:'admin',clave:'admin123',nombre:'Administrador',rol:'admin',activo:true},{id:2,usuario:'vendedor',clave:'venta123',nombre:'Vendedor',rol:'vendedor',activo:true}], products:[], sales:[], audits:[]}; }

function load(){ ensureDirs(); if(!fs.existsSync(DB_FILE)) save(seed()); return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }

function save(db){ ensureDirs(); fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2),'utf8'); }

function backup(){ ensureDirs(); const stamp = new Date().toISOString().replace(/[:.]/g,'-'); const dest=path.join(BACKUP_DIR,`petropos-backup-${stamp}.json`); fs.copyFileSync(DB_FILE,dest); return dest; }

function writeTicket(filename,content){ ensureDirs(); fs.writeFileSync(path.join(TICKETS_DIR,filename), content, 'utf8'); return path.join(TICKETS_DIR,filename); }

module.exports = { load, save, backup, writeTicket, DB_FILE, DATA_DIR, BACKUP_DIR, TICKETS_DIR };
