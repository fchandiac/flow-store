# FlowStore Mobile Backend

Proyecto base de Next.js orientado a construir el backend para la aplicación móvil de FlowStore. La meta es
conectar la base de datos existente mediante TypeORM, exponer server actions y APIs especializadas, y mantener
una interfaz mínima de presentación.

## Scripts

- `npm run dev`: Ejecuta el servidor de desarrollo de Next.js en el puerto `3010`.
- `npm run build`: Genera la compilación lista para producción.
- `npm run start`: Inicia la aplicación en modo producción (escucha en `3010`).
- `npm run lint`: Ejecuta las reglas de ESLint provistas por Next.js.
- `npm run db:generate`: Genera una migración de TypeORM usando el data source definido en `src/data-source.ts`.
- `npm run db:run`: Ejecuta las migraciones pendientes contra la base configurada.

## Próximos pasos sugeridos

1. Ajustar el archivo `.env.local` con las credenciales de la base actual (ya se dejaron valores de ejemplo tomados de `app.config.json`).
2. Configurar el data source de TypeORM dentro de `src/` para reutilizar las entidades existentes del proyecto raíz (ya se registran `User`, `PointOfSale`, `CashSession` y `Transaction`).
3. Implementar server actions y rutas API necesarias para la app móvil. Actualmente existen:
	- `POST /api/auth/login`: valida credenciales con bcrypt y regresa el usuario sin contraseña.
	- `GET /api/points-of-sale`: lista los puntos de venta activos con su sucursal asociada.
	- `POST /api/cash-sessions`: crea la sesión de caja (mantiene el estado `OPEN` y espera la transacción de apertura).
	- `POST /api/cash-sessions/opening-transaction`: registra la transacción de apertura para una sesión existente y actualiza el saldo esperado.
	- `POST /api/cash-sessions/sales`: registra una venta (`TransactionType.SALE`) asociada a una sesión abierta y crea sus líneas.
	- `POST /api/cash-sessions/cash-withdrawals`: registra un retiro manual de efectivo (`TransactionType.CASH_SESSION_WITHDRAWAL`) y actualiza el saldo esperado de la sesión.
	- `POST /api/cash-sessions/cash-deposits`: registra un refuerzo de efectivo (`TransactionType.CASH_SESSION_DEPOSIT`) y recalcula el saldo esperado de la sesión.
	- `GET /api/products/search`: busca variantes de producto por nombre, SKU o código de barras con paginación y desglose de precios netos/impuestos.
