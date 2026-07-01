const { contextBridge, ipcRenderer } = require('electron');

try {
  console.log('preload: exposing API to renderer');
  const api = {
    login: (d) => ipcRenderer.invoke('login', d),
    getState: () => ipcRenderer.invoke('getState'),
    getProducts: () => ipcRenderer.invoke('getProducts'),
    searchProducts: (term) => ipcRenderer.invoke('searchProducts', term),
    getClients: () => ipcRenderer.invoke('getClients'),
    searchClients: (term) => ipcRenderer.invoke('searchClients', term),
    saveClient: (payload) => ipcRenderer.invoke('saveClient', payload),
    deleteClient: (payload) => ipcRenderer.invoke('deleteClient', payload),
    addClientPurchase: (payload) => ipcRenderer.invoke('addClientPurchase', payload),
    getSuppliers: () => ipcRenderer.invoke('getSuppliers'),
    saveSupplier: (payload) => ipcRenderer.invoke('saveSupplier', payload),
    deleteSupplier: (payload) => ipcRenderer.invoke('deleteSupplier', payload),
    getPurchases: () => ipcRenderer.invoke('getPurchases'),
    addPurchase: (payload) => ipcRenderer.invoke('addPurchase', payload),
    saveDB: (db, user, accion, detalle) => ipcRenderer.invoke('db:save', db, user, accion, detalle),
    saveProduct: (payload) => ipcRenderer.invoke('saveProduct', payload),
    deleteProduct: (payload) => ipcRenderer.invoke('deleteProduct', payload),
    newSale: (d) => ipcRenderer.invoke('newSale', d),
    backup: () => ipcRenderer.invoke('backup'),
    backupCreate: () => ipcRenderer.invoke('backup:create'),
    ticket: (venta, negocio) => ipcRenderer.invoke('ticket:create', venta, negocio),
    printers: () => ipcRenderer.invoke('system:printers')
  };
  contextBridge.exposeInMainWorld('api', api);
} catch (err) {
  // If exposing fails, provide a minimal fallback and log the error
  try { console.error('preload: failed to expose api', err); } catch (e) {}
  contextBridge.exposeInMainWorld('api', {
    login: async () => ({ ok: false, msg: 'preload exposure failed' })
  });
}

// Small health ping so renderer can check preload availability
try { console.log('preload: ready'); } catch (e) {}
