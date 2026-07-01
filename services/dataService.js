// services/dataService.js
// Wrapper that centralizes data access from the renderer to the preload IPC `window.api`.
(function(){
  // If preload didn't expose `api`, attempts will fail gracefully with resolved Promises.
  const _api = window.api || {};
  window.dataService = {
    getDB: async function(){ return _api.getState ? await _api.getState() : (_api.getDB? await _api.getDB(): null); },
    getProducts: async function(){ return _api.getProducts ? await _api.getProducts() : []; },
    searchProducts: async function(term){ return _api.searchProducts ? await _api.searchProducts(term) : []; },
    saveDB: async function(db,user,accion,detalle){ if(_api.saveDB) return await _api.saveDB(db,user,accion,detalle); if(_api.saveProduct) return await _api.saveProduct({product:db,user}); return null; },
    saveProduct: async function(product,user){ return _api.saveProduct ? await _api.saveProduct({product,user}) : null; },
    deleteProduct: async function(id,user){ return _api.deleteProduct ? await _api.deleteProduct({id,user}) : null; },
    backup: async function(){ return _api.backup ? await _api.backup() : null; },
    ticket: async function(venta,negocio){ return _api.ticket ? await _api.ticket(venta,negocio) : null; },
    printers: async function(){ return _api.printers ? await _api.printers() : []; }
  };
})();
