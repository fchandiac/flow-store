# JSON de soporte para el seed FlowStore

Estos archivos describen por completo el escenario Joyarte consumido por `data/seed/seed-flowstore.ts`. Cada JSON alimenta un bloque del seed:

- `companies.json`: datos corporativos y cuentas bancarias iniciales.
- `branches.json`: sucursales con referencias internas (`ref`) usadas por otros catálogos.
- `costCenters.json`, `organizationalUnits.json`: estructura operativa enlazada a sucursales.
- `taxes.json`: definición de impuestos (solo IVA y Exento activos; el IVA usa el code `IVA`).
- `accountingAccounts.json`: plan de cuentas resumido y jerarquía contable.
- `expenseCategories.json`: categorías de gasto con centro de costo por defecto.
- `accountingRules.json`: reglas automáticas de asiento vinculadas a impuestos o categorías.
- `categories.json`, `attributes.json`: jerarquía de productos y atributos de variantes.
- `priceLists.json`: listas de precio (retail, online, mayorista) y prioridades.
- `storages.json`: bodegas por sucursal e indicadores de bodega por defecto.
- `pointsOfSale.json`: cajas físicas/digitales y su lista de precios asociada.
- `units.json`: unidades base y derivadas con factores de conversión.
- `customers.json`: clientes de referencia, límites de crédito y notas.
- `suppliers.json`: proveedores con contactos, cuentas bancarias y condiciones.
- `users.json`: usuarios del sistema (incluye admin y credenciales).
- `products.json`: catálogo de productos, variantes, atributos y precios por lista.
- Archivos auxiliares vacíos (`formats.json`, `producers.json`, etc.) reservan espacio para futuras fuentes de datos.

El seed valida que cada archivo exista, normaliza enums y muestra alertas cuando falta alguna referencia (por ejemplo, un `branchRef` inexistente). Mantén la coherencia entre los `ref` de este directorio para evitar fallos en cascada durante la carga.
