# PetroPOS Professional 1.0 RC - Build 005

## Cambios principales
- Corrección del bloqueo de foco en POS luego de ventas consecutivas.
- Los campos Código/Lector, Descuento y Recibido quedan habilitados luego de cobrar.
- El selector de medio de pago ya no fuerza un render completo que podía bloquear la interfaz.
- Recalculo inmediato de subtotal, total y vuelto mientras se escribe.
- Reinicio limpio del formulario de venta y foco automático en el campo de código.

## Pruebas recomendadas
1. Realizar una venta en efectivo.
2. Realizar otra venta inmediatamente.
3. Escribir manualmente en Código/Lector.
4. Cambiar medio de pago.
5. Escribir en Descuento y Recibido.
6. Confirmar que el cursor vuelve al buscador al finalizar.
