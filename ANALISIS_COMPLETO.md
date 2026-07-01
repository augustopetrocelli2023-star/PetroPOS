# Análisis completo — PetroPOS

Fecha: 2026-06-30

Resumen: este documento recoge el análisis estático del repositorio PetroPOS: arquitectura, módulos, código duplicado, riesgos, propuestas de mejora y un plan de refactorización por fases.

**1. Arquitectura del proyecto**

- **Proceso principal (Main / Backend):** hay dos variantes activas en el repo:
  - `main.js` (raíz) — expone handlers IPC: `db:get`, `db:save`, `ticket:create`, `backup:create`, `system:printers`. Usa `database/petropos-data.json` como almacén y funciones síncronas `fs.readFileSync`/`writeFileSync`.
  - `src/main/main.js` — otra implementación muy similar (duplicada) que expone handlers más granulares: `login`, `getState`, `saveProduct`, `newSale`, `backup`, `buildTicket` y más. Usa `data/petropos-data.json` y rutas distintas (`data/`, `backups/`).

- **Preload / Bridge:** `preload.js` (raíz) expone API de IPC (`getDB`, `saveDB`, `backup`, `ticket`, `printers`) a la UI mediante `contextBridge`.

- **Renderer (UI / Frontend):** también hay dos variantes:
  - `app/renderer.js` + `app/index.html`: versión monolítica que carga en `app/index.html` y trabaja con la estructura de datos del `database/` root.
  - `src/renderer/app.js` + `src/renderer/index.html`: versión más nueva/alternativa, también monolítica y con funciones muy parecidas (login, ventas, productos, caja, tickets, etc.).

- **Assets y estilos:** `assets/`, `css/`, `app/style.css`, `src/renderer/style.css`.

- **Datos y backups:** `database/petropos-data.json`, `data/petropos-data.json`, y `backups/` con copias JSON.

**Diagrama lógico (simplificado)**

- Electron Main ↔ IPC (preload) ↔ Renderer UI
- Filesystem JSON (database/data) usado como DB (lectura/escritura síncrona)

**2. Módulos existentes**

- Main process (root `main.js`): inicialización, carga/guardado DB, auditoría, tickets, backups, lectura de impresoras.
- Main process (src): handlers CRUD (productos, ventas, business), `getState` agregador para dashboard.
- Preload: expone llamadas IPC.
- Renderer (app/ and src/): UI, lógica POS, formularios, búsqueda, tablas, manejo de ventas, clientes, proveedores, caja, export CSV, guardado temporal.
- Recursos estáticos: CSS, imágenes, `tickets/` generados con `fs`.

**3. Código duplicado**

- Duplicación principal entre dos ramas/versions:
  - `main.js` (raíz) y `src/main/main.js` — muchas funciones y handlers duplicados (save/load, backup, ticket builder, audit).
  - `app/renderer.js` y `src/renderer/app.js` — vistas y lógica de UI muy similares con nombres y flujos casi idénticos (login, ventas, productos, tickets, caja).
  - `database` vs `data` JSON y backups — duplicación de almacén/ubicaciones.

Impacto: mantenimiento costoso, posibles divergencias y bugs por inconsistencias entre versiones.

**4. Bugs potenciales (observados en lectura estática)**

- Escritura síncrona del JSON en el hilo principal (`fs.writeFileSync`) sin control de concurrencia → riesgo de race conditions y bloqueo de UI durante operaciones I/O grandes.
- Falta de manejo de errores en operaciones de lectura/escritura (no capturan excepciones de `JSON.parse` o `fs`), lo que puede dejar la aplicación en estado inconsistente.
- IDs generados con `Date.now()` o `Math.max(...)+1` mezclado con `Date.now()` produce riesgo de colisiones y números no secuenciales entre versiones.
- Campos y nombres inconsistentes entre versiones (`productos` vs `products`, `ventas` vs `sales`, `auditoria` vs `audits`) → riesgos de path / key errors si se mezclan módulos.
- Lógica que asume existencia de `db.caja` o `db.ventaTemporal` sin validación completa → posibles NPEs cuando la estructura del JSON cambia.
- Guardado de contraseña en texto plano en `database/petropos-data.json` y seed → riesgo de exposición.
- Funciones que usan `shell.openPath(file)` abren archivos generados por la app: si el contenido o nombre no se valida podría abrir ficheros no deseados (aunque limitado al entorno local).

**5. Archivos que deberían dividirse / modularizar**

- `main.js` y `src/main/main.js`: separar en módulos: `db.js` (capa de persistencia), `ipc-handlers.js` (registro de handlers), `tickets.js` (generador de tickets), `backup.js`, `audit.js`, `printers.js`, `app.js` (arranque y ventana).
- `app/renderer.js` y `src/renderer/app.js`: dividir en vistas/componentes: `auth.js`, `pos.js`, `products.js`, `clients.js`, `suppliers.js`, `reports.js`, `ui-utils.js` y `store.js` (estado local). Evitar un fichero monolítico.
- `preload.js`: mantener pequeño, mover adaptadores (API wrappers) a `src/main/api.js` y documentar la interfaz.

**6. Lugares donde conviene migrar a SQLite**

Recomendación: migración incremental de JSON → SQLite para mejorar integridad, concurrencia y consultas.

- Tablas sugeridas:
  - `users` (id, usuario, clave_hash, nombre, rol, activo)
  - `business` (configuración del negocio)
  - `products` (id, codigo, barra, descripcion, marca, categoria, proveedor, costo, precio, iva, stock, minimo, activo, createdAt, updatedAt)
  - `sales` (id, numero, fecha, usuario, cliente_id, pago, descuento, total, recibido, vuelto, anulada, motivo)
  - `sale_items` (sale_id, producto_id, cantidad, precio, costo)
  - `stock_movements` (fecha, producto_id, tipo, cantidad, referencia, usuario)
  - `audits` (fecha, usuario, rol, pc, accion, detalle)
  - `clients`, `suppliers`, `categories`, `brands`, `cash_movements`

- Áreas prioritarias para migración:
  1. `ventas` y `sale_items` — mayor beneficio en consultas y atomicidad.
  2. `productos` y `stock_movimientos` — integridad de stock y consultas rápidas.
  3. `auditoria` — insert rápido y consultas.

Notas: mantener una tabla de metadatos / versión para migraciones y backups. Usar `better-sqlite3` o `sqlite3` en proceso principal.

**7. Problemas de rendimiento**

- Uso intensivo de `JSON.stringify`/`fs.writeFileSync` para toda la base cada vez que se guarda → operaciones I/O completas que crecen con el tamaño de los arrays.
- Renderizado UI con tablas completas y sin paginación para listas grandes (productos, ventas) → bloqueos en DOM y pérdida de responsividad.
- Uso de loops y map con plantillas grandes en cada render sin diffs parciales.
- Falta de caching o índices para búsquedas, por lo que filtros recorren arrays completos.

Recomendaciones inmediatas: evitar writes síncronos; usar un adaptador asíncrono o cola de escritura; paginar listas; debouncing en búsquedas; convertir a DB relacional e índices.

**8. Problemas de seguridad**

- Credenciales en texto plano en seed y en `database/petropos-data.json`.
- IPC handlers que reciben objetos enteros (`db:save`) y escriben sin validación → riesgo si se obtiene acceso a IPC (mal uso por inyección o extensión maliciosa).
- Potencial XSS: abundante uso de `innerHTML` con interpolación. Aunque muchas vistas usan `esc()` para escapar, no está garantizado en todas las rutas y hay lugares donde se concatenan datos sin escape. Revisar cada `innerHTML`.
- Falta de `contextIsolation` / `nodeIntegration` estrictos en la creación de algunas BrowserWindow (ver `main.js` raíz) — asegurar `contextIsolation: true` y `nodeIntegration: false` en todas las ventanas.
- Abrir archivos con `shell.openPath` puede exponer al usuario a ficheros generados; validar paths y permisos.

Medidas de mitigación: hashear contraseñas (bcrypt/scrypt), validar y sanitizar datos (server-side), endurecer opciones de BrowserWindow, filtrar/escapar todo contenido que vaya a `innerHTML`, limitar API expuesta en `preload.js` y añadir autorización en handlers críticos (anular ventas, borrar productos).

**9. Mejoras de UX/UI**

- Añadir paginación y búsqueda incremental con debounce para tablas grandes (productos, ventas).
- Indicadores de carga (spinners) en operaciones I/O (backup, guardado, lectura impresoras).
- Feedback asíncrono: deshabilitar botones durante operaciones y mostrar notificaciones no-blocking.
- Formularios: validación inline y mensajes de error claros (por ejemplo, chequeo de códigos duplicados antes de enviar).
- Accesibilidad: etiquetas `aria-`, tab-index, contrates de color y tamaños de fuente.
- Guardado automático configurable y posibilidad de sincronía con almacenamiento local y backups programados.
- Unificar layout/estilos entre `app/` y `src/` para consistencia.

**10. Plan de refactorización por fases (incremental)**

Fase 0 — Preparación (0.5–1 día)
- Añadir control de versiones y pruebas mínimas.
- Añadir linter/prettier y reglas básicas.
- Documentar convenciones y crear `README.dev` con pasos para ejecutar la app en modo desarrollo.

Fase 1 — Separar y modularizar (1–3 días)
- Extraer capa de persistencia: crear `src/main/db/*.js` con interfaz `load()`, `save()`, `backup()`, `migrate()`.
- Mover construcción de tickets a `src/main/tickets.js`.
- Registrar handlers IPC desde un único archivo `src/main/ipc-handlers.js` que use la capa de persistencia.
- Mantener el comportamiento actual (compatibilidad), cubrir con pruebas unitarias básicas.

Fase 2 — Endurecer seguridad y APIs (1–2 días)
- Forzar `contextIsolation:true`, `nodeIntegration:false` en BrowserWindow.
- Reducir surface API en `preload.js` y validar entradas en el main antes de aplicar cambios (whitelist de campos).
- Reemplazar almacenamiento de contraseñas por hash (migración de seed + script de migración).

Fase 3 — Migración a SQLite (incremental) (2–5 días)
- Implementar adapter `db/adapter-json.js` y `db/adapter-sqlite.js` con la misma API.
- Empezar migración por tablas prioritarias: `sales`, `sale_items`, `products`.
- Añadir script de migración y flag de rollback; mantener backups automáticos.

Fase 4 — Refactor UI (2–4 días)
- Dividir `src/renderer/app.js` en componentes: `auth`, `pos`, `products`, `clients`, `reports`.
- Implementar paginación, filtros con debounce y loading states.
- Consolidar estilos y variables CSS.

Fase 5 — Rendimiento y pruebas (1–2 días)
- Reemplazar escrituras completas por escrituras parciales o transacciones DB.
- Añadir tests E2E (Electron + Playwright) para flujos críticos: login, venta, backup, anulación.

Fase 6 — Pulido y despliegue (1 día)
- Documentación de migración, actualizar instaladores y batch scripts.
- Revisar y desplegar versión estable.

Entregables y checkpoints
- Al final de cada fase: PR con cambios, checklist (tests, validaciones, docs), migración/rollback tested.

Apéndices — Observaciones prácticas y prioridades inmediatas

- Prioridad inmediata (hacer ahora):
  1. Respaldar `database/` y `data/` actuales.
  2. Forzar `contextIsolation:true` y `nodeIntegration:false` en todas las `BrowserWindow`.
  3. Reemplazar `fs.writeFileSync` por método asíncrono o cola de escritura con debounce.
  4. Centralizar un único archivo de datos (evitar `database/` vs `data/` duplicados) o adaptar puente de compatibilidad.
  5. Hashear contraseñas y obligar a cambiar credenciales por defecto.

- Riesgos que requieren atención antes de liberar a producción:
  - Corrupción de datos por escrituras simultáneas.
  - Exposición de credenciales.
  - Divergencia entre ramas (`app/` vs `src/`) que complica despliegues.

Contacto / próximos pasos

Si querés, implemento el Paso "Prioridad inmediata" #1–#4 con cambios pequeños y PRs separados: 1) centralizar DB y cambiar writes a asíncrono, 2) endurecer BrowserWindow + preload, 3) extraer capa DB, 4) crear script inicial de migración a SQLite.

---

Archivo generado automáticamente por análisis estático. Para detalles puntuales pídeme que incluya fragmentos de código o que ejecute los primeros cambios (haré commits y pruebas). 
