# PetroPOS Professional 1.0 RC Build 006

Build enfocada en corregir de raíz el bloqueo de campos del POS después de cobrar.

## Cambios principales
- PP-006: refuerzo real del foco y desbloqueo de controles en Ventas.
- Se removieron manejadores inline en los campos críticos del POS.
- El cobro ya no usa alert final bloqueante; vuelve automáticamente al buscador.
- Al finalizar venta: limpia carrito, reinicia campos, recalcula y deja cursor listo para escanear/escribir.
- Mantiene compras, stock, caja, reportes y mejoras anteriores.

## Prueba recomendada
1. Abrir caja.
2. Agregar producto manualmente.
3. Cobrar en efectivo.
4. Hacer otra venta seguida.
5. Verificar que se pueda escribir en código/búsqueda, descuento y recibido.
