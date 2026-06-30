# PetroPOS Professional 1.0 RC - Build 003

## Cambios principales

- POS estabilizado para ventas consecutivas.
- Medio de pago conserva estado correctamente y no queda bloqueado entre ventas.
- Antidoble venta mediante bloqueo de proceso (`saleBusy`).
- Venta temporal/autoguardado para recuperar carrito.
- Descuento, recibido y vuelto en pantalla de venta.
- Ticket TXT ahora incluye descuento, recibido y vuelto cuando corresponde.
- Dashboard con ganancia estimada, ticket promedio, stock bajo y últimas ventas.
- Productos mejorado: validación de código interno y código de barras duplicado.
- Productos: duplicar producto, gestionar categorías y marcas.
- Stock: ajuste rápido desde el módulo Stock.
- Caja: detalle en ingresos/retiros y cierre con confirmación.
- Reportes: resumen por medio de pago.
- Identidad actualizada a Build 003.

## Nota técnica

La base sigue usando JSON estable por compatibilidad con la versión actual. La migración a SQLite queda para el siguiente salto estructural, para no romper datos existentes mientras se estabiliza POS + Caja + Productos.
