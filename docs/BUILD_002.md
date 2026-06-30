# PetroPOS Professional - 1.0 RC Build 002

## Cambios principales
- Corrección del flujo de cobro para ventas consecutivas.
- Bloqueo anti-doble-cobro mientras se procesa una venta.
- Reinicio limpio del carrito y del formulario de venta.
- Validación de stock antes de confirmar venta.
- Productos carga la tabla automáticamente al entrar al módulo.
- package.json actualizado con Electron fijo 31.7.7.
- Scripts de instalación y reparación agregados.

## Nota
Esta build mantiene la base JSON actual para no romper datos existentes. La migración a SQLite queda para la siguiente build grande.
