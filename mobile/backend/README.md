# FlowStore Mobile Backend

Proyecto base de Next.js orientado a construir el backend para la aplicación móvil de FlowStore. La meta es
conectar la base de datos existente mediante TypeORM, exponer server actions y APIs especializadas, y mantener
una interfaz mínima de presentación.

## Scripts

- `npm run dev`: Ejecuta el servidor de desarrollo de Next.js.
- `npm run build`: Genera la compilación lista para producción.
- `npm run start`: Inicia la aplicación en modo producción.
- `npm run lint`: Ejecuta las reglas de ESLint provistas por Next.js.
- `npm run db:generate`: Genera una migración de TypeORM usando el data source definido en `src/data-source.ts`.
- `npm run db:run`: Ejecuta las migraciones pendientes contra la base configurada.

## Próximos pasos sugeridos

1. Ajustar el archivo `.env.local` con las credenciales de la base actual (ya se dejaron valores de ejemplo tomados de `app.config.json`).
2. Configurar el data source de TypeORM dentro de `src/` para reutilizar las entidades existentes del proyecto raíz (ya se registran `User`, `PointOfSale`, `CashSession` y `Transaction`).
3. Implementar server actions y rutas API necesarias para la app móvil. Actualmente existen:
	- `POST /api/auth/login`: valida credenciales con bcrypt y regresa el usuario sin contraseña.
	- `POST /api/cash-sessions`: crea la sesión de caja y genera su transacción de apertura.
	- `POST /api/cash-sessions/opening-transaction`: registra la transacción de apertura para una sesión existente.
	- `POST /api/cash-sessions/sales`: registra una venta (`TransactionType.SALE`) asociada a una sesión abierta y crea sus líneas.
	- `POST /api/cash-sessions/cash-withdrawals`: registra un retiro manual de efectivo (`TransactionType.CASH_SESSION_WITHDRAWAL`) y actualiza el saldo esperado de la sesión.
	- `POST /api/cash-sessions/cash-deposits`: registra un refuerzo de efectivo (`TransactionType.CASH_SESSION_DEPOSIT`) y recalcula el saldo esperado de la sesión.
