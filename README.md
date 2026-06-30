# PetroPOS v0.5.0 Pro Piloto

Versión piloto operativa para Windows 10/11 y preparada para mantener compatibilidad con Windows 7 usando Electron compatible.

## Instalación

Copiar la carpeta a:

```powershell
C:\PetroPOS
```

Luego ejecutar:

```powershell
cd C:\PetroPOS
npm install electron@latest --save-exact
npm install
npm start
```

## Usuarios

- Admin: `admin` / `admin123`
- Vendedor: `vendedor` / `venta123`

## Incluye

- Dashboard
- Productos CRUD
- Stock
- Ventas con lector preparado
- Caja apertura/cierre
- Clientes
- Proveedores
- Reportes
- Configuración del comercio
- Auditoría
- Backups
- Tickets TXT

## Nota técnica

Esta versión usa base local en archivo `database/petropos-data.json` para máxima compatibilidad sin dependencias nativas. La estructura queda preparada para migrar a SQLite cuando definamos el motor definitivo según la PC final.
