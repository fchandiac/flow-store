# FlowStore Seed Toolkit

Este directorio agrupa los utilitarios necesarios para inicializar o restaurar la base de datos de FlowStore. Incluye scripts TypeScript, plantillas SQL y un generador automático que deja un snapshot con todas las sentencias ejecutadas durante el seed.

## Estructura

```
data/seed/
├── README.md                  # Esta documentación
├── seed.ts                    # Seed principal con SQL directo + snapshot automático
├── seed-production.ts         # Seed productivo usando TypeORM
├── seed-prod-direct.ts        # Variante productiva con SQL directo
├── seed-units.ts              # Utilidad puntual para poblar unidades
├── seed-clean.ts              # Script de limpieza auxiliar
├── seed-flowstore.ts          # Seed completo FlowStore con TypeORM
├── seed-flowstore.broken.ts.bak  # Respaldo histórico
├── generated/
│   └── seed-data.sql          # Snapshot generado por `seed.ts`
└── dataToSeed/                # JSON con datos de soporte (se crea cuando se necesite)
```

> `generated/seed-data.sql` se crea/actualiza automáticamente cada vez que corre `seed.ts`. Si la carpeta `generated/` no existe, el script la genera antes de escribir el snapshot.

## Scripts principales

### `seed.ts`
- Restaura la base desde cero: desactiva llaves foráneas, ejecuta los scripts de drop/create y carga datos desde los JSON en `dataToSeed/`.
- Todas las sentencias ejecutadas (`DDL` y `DML`) pasan por un wrapper (`executeStatement`) que las registra y escribe el resultado en `generated/seed-data.sql` al final del proceso.
- Uso:
  ```bash
  npx ts-node data/seed/seed.ts [test|production|local]
  # El valor por defecto es `test`
  ```

### `seed-flowstore.ts`
- Seed completo basado en las entidades de TypeORM, pensado para levantar escenarios funcionales de FlowStore con relaciones complejas.

#### Datos generados (escenario Joyarte)
- **Identidad y estructura**: crea la empresa Joyarte SpA (CLP) con cuenta corriente Santander `JOYARTE-SANTANDER-CC-001`; habilita las sucursales Sucursal Parral (casa matriz con geolocalización) y Tienda Online; asegura los centros de costo `OPS-PARRAL` y `OPS-ONLINE`, además de las unidades organizativas `ADM-CENTRAL`, `OPS-PARRAL` y `OPS-ONLINE`.
- **Finanzas y contabilidad**: provisiona 8 impuestos (IVA 19 %, Exento, cuatro ILA configurados y un impuesto de lujo); publica un plan de cuentas base con 38 códigos que cubren activos, pasivos, patrimonio, ingresos y gastos; mantiene activas 18 categorías de gasto con metadatos y más de 30 reglas contables automáticas para ventas, compras, egresos y aportes de capital.
- **Catálogo y precios**: reemplaza catálogos heredados por 8 categorías de joyería; define 5 atributos de variantes (Material, Talla, Piedra, Quilates, Largo); genera 3 listas de precios (`Precio Público`, `Venta Online`, `Mayorista Joyero`) y 3 productos de ejemplo con 7 variantes que quedan valorizadas en cada lista.
- **Operaciones**: crea la bodega `Vitrina Principal` en la sede Parral como almacén por defecto; registra 2 puntos de venta (`Caja Principal`, `Caja Mayorista`) enlazados a sus listas; configura unidades de medida `un`, `cj`, `kg` y `g` con factores de conversión consistentes.
- **Personas y accesos**: asegura el usuario administrador `admin` con contraseña `890890` y le asigna todos los permisos disponibles; registra 3 clientes base (Camila Paredes, Miguel Mesa, Valeria Rojas) y 5 proveedores con cuentas bancarias y plazos de pago definidos.
- **Movimientos iniciales**: normaliza las cuentas bancarias existentes y registra el aporte de capital `CAP-INITIAL-0001` por CLP 10.000.000 como transferencia inicial; elimina documentos legacy (`CAP-2025-11-30`, `CAP-2025-12-15`) antes de crear el nuevo asiento.

> ⚠️ El script desactiva llaves foráneas y trunca todas las tablas antes de sembrar datos; ejecútalo únicamente en una base desechable.

### `seed-production.ts` y `seed-prod-direct.ts`
- Variantes productivas minimalistas (TypeORM o SQL directo) centradas en asegurar la existencia del usuario administrador y datos críticos.

### Otros utilitarios
- `seed-units.ts` y `seed-clean.ts` sirven para poblar subconjuntos específicos o limpiar tablas sin correr el seed completo.

## Flujo para modificar datos seed

1. Ajusta los JSON en `data/seed/dataToSeed/` o la lógica en `seed.ts`.
2. Ejecuta el seed contra un entorno aislado:
   ```bash
   npx ts-node data/seed/seed.ts local
   ```
3. Verifica que el comando termine con el log `Seed SQL snapshot saved ...`.
4. Revisa el diff de `data/seed/generated/seed-data.sql` y súbelo junto con el resto de cambios.

## Archivo `generated/seed-data.sql`
- Encabezado con la fecha ISO del último run.
- Contiene el orden real de ejecución: drops, creates, alters, inserts, updates, etc.
- Permite rehacer el seed manual ejecutando el archivo completo en un cliente MySQL.
- Si los diffs muestran UUIDs o timestamps distintos, valida que provengan de valores determinísticos en los JSON o aplícalos manualmente.

## Configuración y entornos

Los scripts leen credenciales desde `app.config.json` y/o variables de entorno (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`). Asegúrate de tenerlas definidas antes de ejecutar cualquier seed.

Entornos soportados por `seed.ts`:
- `local`: usa las credenciales de desarrollo del `app.config.json`.
- `test`: orientado a pipelines y entornos efímeros.
- `production`: requiere variables de entorno explícitas; úsalo con precaución.

## Buenas prácticas

- Corre los seeds contra bases descartables para validar cambios.
- Revisa el diff del snapshot antes de subirlo para detectar sentencias inesperadas.
- Si agregas tablas nuevas, incorpora primero los scripts a `data/sql/` y luego referencia esos archivos en `seed.ts`.
- Documenta casos especiales o scripts manuales adicionales en este mismo directorio.

## Problemas comunes

| Problema | Causa probable | Solución |
| --- | --- | --- |
| Falta `drop-all-tables.sql`/`create-tables.sql` | Los scripts de esquema no están en `data/sql/` | Genera o recupera los archivos antes de correr `seed.ts`. |
| Error de conexión | Credenciales erróneas o base caída | Revisa `app.config.json`, variables de entorno y conectividad. |
| El snapshot no se actualiza | El proceso falló antes de finalizar o no hubo cambios | Revisa la consola y asegúrate de llegar al log de guardado. |
| Diferen­cias no determinísticas en el snapshot | UUIDs/timestamps calculados al vuelo | Usa IDs fijos en los JSON o ajusta la lógica para valores deterministas. |

## FAQ

- **¿Puedo editar `seed-data.sql` a mano?** Se puede, pero la próxima ejecución de `seed.ts` lo sobrescribirá. La fuente de la verdad debe ser el código/JSON.
- **¿Dónde agrego nuevos catálogos?** En `data/seed/dataToSeed/*.json` y consumidos desde `seed.ts` (o en un script dedicado si es complejo).
- **¿Qué ocurre si el seed falla a mitad de camino?** La conexión se cierra y no se escribe el snapshot. Corrige el error y vuelve a ejecutarlo.

Mantener esta carpeta sincronizada facilita el onboarding y evita sorpresas al alinear ambientes. Si detectas huecos o flujos no documentados, agrégalos aquí mismo.
<filePath>filePath">/Users/felipe/dev/ElectNextStart/data/seed/README.md