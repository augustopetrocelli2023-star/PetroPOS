const os = require('os');

function audit(db, user, accion, detalle) {
  db.auditoria = Array.isArray(db.auditoria) ? db.auditoria : [];
  db.auditoria.unshift({
    fecha: new Date().toISOString(),
    usuario: user?.usuario || user?.id || 'sistema',
    rol: user?.rol || user?.rol || '',
    pc: os.hostname(),
    accion,
    detalle
  });
  if (db.auditoria.length > 1000) db.auditoria.length = 1000;
  return db;
}

module.exports = { audit };