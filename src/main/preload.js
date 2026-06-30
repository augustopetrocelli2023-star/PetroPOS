const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  login:(d)=>ipcRenderer.invoke('login',d),
  getState:()=>ipcRenderer.invoke('getState'),
  saveBusiness:(d)=>ipcRenderer.invoke('saveBusiness',d),
  saveProduct:(d)=>ipcRenderer.invoke('saveProduct',d),
  deleteProduct:(d)=>ipcRenderer.invoke('deleteProduct',d),
  addCatalogValue:(d)=>ipcRenderer.invoke('addCatalogValue',d),
  newSale:(d)=>ipcRenderer.invoke('newSale',d),
  backup:(d)=>ipcRenderer.invoke('backup',d)
});
