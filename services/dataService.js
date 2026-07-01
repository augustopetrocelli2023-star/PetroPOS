// services/dataService.js
// Wrapper that centralizes data access from the renderer to the preload IPC `window.api`.
(function(){
  // If preload didn't expose `api`, attempts will fail gracefully with resolved Promises.
  const _api = window.api || {};
  window.dataService = {
    getDB: async function(){ return _api.getState ? await _api.getState() : (_api.getDB? await _api.getDB(): null); },
    login: async function(credentials){ return _api.login ? await _api.login(credentials) : { ok: false, msg: 'login no disponible' }; },
    getProducts: async function(){ return _api.getProducts ? await _api.getProducts() : []; },
    searchProducts: async function(term){ return _api.searchProducts ? await _api.searchProducts(term) : []; },
    getClients: async function(){ return _api.getClients ? await _api.getClients() : []; },
    searchClients: async function(term){ return _api.searchClients ? await _api.searchClients(term) : []; },
    saveDB: async function(db,user,accion,detalle){ if(_api.saveDB) return await _api.saveDB(db,user,accion,detalle); if(_api.saveProduct) return await _api.saveProduct({product:db,user}); return null; },
    saveProduct: async function(product,user){ return _api.saveProduct ? await _api.saveProduct({product,user}) : null; },
    deleteProduct: async function(id,user){ return _api.deleteProduct ? await _api.deleteProduct({id,user}) : null; },
    saveClient: async function(client,user){ return _api.saveClient ? await _api.saveClient({client,user}) : null; },
    deleteClient: async function(id,user){ return _api.deleteClient ? await _api.deleteClient({id,user}) : null; },
    addClientPurchase: async function(clientId,purchase){ return _api.addClientPurchase ? await _api.addClientPurchase({clientId,purchase}) : null; },
    getSuppliers: async function(){ return _api.getSuppliers ? await _api.getSuppliers() : []; },
    saveSupplier: async function(supplier,user){ return _api.saveSupplier ? await _api.saveSupplier({supplier,user}) : null; },
    deleteSupplier: async function(id,user){ return _api.deleteSupplier ? await _api.deleteSupplier({id,user}) : null; },
    getPurchases: async function(){ return _api.getPurchases ? await _api.getPurchases() : []; },
    addPurchase: async function(purchase,user){ return _api.addPurchase ? await _api.addPurchase({purchase,user}) : null; },
    backup: async function(){ return _api.backup ? await _api.backup() : null; },
    ticket: async function(venta,negocio){ return _api.ticket ? await _api.ticket(venta,negocio) : null; },
    printers: async function(){ return _api.printers ? await _api.printers() : []; }
  };
})();
