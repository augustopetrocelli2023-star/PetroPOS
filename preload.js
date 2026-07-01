const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api',{
  login:(d)=>ipcRenderer.invoke('login',d),
  getState:()=>ipcRenderer.invoke('getState'),
  getDB:()=>ipcRenderer.invoke('db:get'),
  saveDB:(db,user,accion,detalle)=>ipcRenderer.invoke('db:save',db,user,accion,detalle),
  saveProduct:(d)=>ipcRenderer.invoke('saveProduct',d),
  deleteProduct:(d)=>ipcRenderer.invoke('deleteProduct',d),
  newSale:(d)=>ipcRenderer.invoke('newSale',d),
  backup:()=>ipcRenderer.invoke('backup'),
  backupCreate:()=>ipcRenderer.invoke('backup:create'),
  ticket:(venta,negocio)=>ipcRenderer.invoke('ticket:create',venta,negocio),
  printers:()=>ipcRenderer.invoke('system:printers')
});
