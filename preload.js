const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api',{
  getDB:()=>ipcRenderer.invoke('db:get'),
  saveDB:(db,user,accion,detalle)=>ipcRenderer.invoke('db:save',db,user,accion,detalle),
  backup:()=>ipcRenderer.invoke('backup:create'),
  ticket:(venta,negocio)=>ipcRenderer.invoke('ticket:create',venta,negocio),
  printers:()=>ipcRenderer.invoke('system:printers')
});
