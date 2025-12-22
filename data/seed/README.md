# Sistema de Seed de Datos

Este directorio contiene el sistema completo de seeding de datos para la aplicación ElectNext. El sistema permite poblar la base de datos con datos iniciales para desarrollo, testing y producción.

## 📁 Estructura del Directorio

```
data/seed/
├── README.md                    # Esta documentación
├── seed.ts                      # Script principal de seeding (desarrollo/testing)
├── seed-production.ts           # Script de seeding para producción (TypeORM)
├── seed-prod-direct.ts          # Script de seeding para producción (SQL directo)
└── sql/
    ├── create-tables.sql        # Creación completa de todas las tablas
    ├── drop-all-tables.sql      # Eliminación de todas las tablas
    └── seed-data.sql            # Datos de prueba/demostración
```

## 🎯 Scripts Disponibles

### 1. `seed.ts` - Seeding Principal (Desarrollo/Testing)

**Propósito**: Script principal para poblar la base de datos en entornos de desarrollo y testing.

**Características**:
- Utiliza TypeORM para interactuar con la base de datos
- Configurable por entorno (desarrollo, testing, producción)
- Ejecuta scripts SQL para crear tablas y poblar datos
- Manejo de errores robusto con rollback automático

**Uso**:
```bash
# Desde la raíz del proyecto
npm run seed
# o directamente
npx ts-node data/seed/seed.ts
```

**Configuración por entorno**:
- **Desarrollo**: Crea tablas, pobla datos de prueba, mantiene datos existentes
- **Testing**: Limpia tablas existentes, recrea esquema, pobla datos de test
- **Producción**: Solo crea usuario admin si no existe

### 2. `seed-production.ts` - Seeding de Producción (TypeORM)

**Propósito**: Script especializado para inicializar producción usando TypeORM.

**Características**:
- Crea únicamente el usuario administrador por defecto
- Verifica existencia previa para evitar duplicados
- Utiliza entidades TypeORM para validación de datos
- Hashing seguro de contraseñas

**Credenciales por defecto**:
- **Usuario**: admin
- **Contraseña**: 1234
- **Email**: admin@electnext.com
- **Rol**: ADMIN

### 3. `seed-prod-direct.ts` - Seeding de Producción (SQL Directo)

**Propósito**: Script de producción que usa conexiones SQL directas sin TypeORM.

**Características**:
- Conexión directa a MySQL usando mysql2/promise
- Configurado para servidor de producción específico
- Manejo de duplicados y errores de conexión
- Actualización de contraseña si el usuario ya existe

**Configuración de conexión**:
```typescript
host: '72.61.6.232',
user: 'next-elect',
password: 'redbull90',
database: 'next-start'
```

## 📊 Archivos SQL

### `create-tables.sql`

Script completo que crea todas las tablas de la base de datos en el orden correcto:

1. **Tablas base** (sin dependencias):
   - `persons` - Información de personas
   - `varieties` - Variedades de productos
   - `formats` - Formatos de empaque
   - `storages` - Almacenes y cámaras
   - `seasons` - Temporadas agrícolas
   - `trays` - Tipos de bandejas

2. **Tablas dependientes**:
   - `users` - Usuarios del sistema (depende de persons)
   - `producers` - Productores (depende de persons)
   - `customers` - Clientes (depende de persons)
   - `pallets` - Pallets (depende de storages, trays)
   - `audits` - Registros de auditoría (depende de users)
   - `transactions` - Transacciones del sistema (depende de múltiples tablas)

### `drop-all-tables.sql`

Script para eliminar todas las tablas en orden inverso de dependencias:
- Desactiva restricciones de clave foránea temporalmente
- Elimina tablas dependientes primero
- Elimina tablas base al final
- Reactiva restricciones de clave foránea

### `seed-data.sql`

Datos de ejemplo para desarrollo y testing:

- **Usuarios**: Admin + 5 operadores de ejemplo
- **Personas**: Datos personales asociados a usuarios
- **Variedades**: Variedades de berries con precios
- **Formatos**: Tipos de empaque disponibles
- **Almacenes**: Cámaras frigoríficas y bodegas
- **Temporadas**: Temporadas agrícolas activas
- **Bandejas**: Tipos de bandejas con pesos
- **Productores**: Productores asociados a unidades
- **Clientes**: Empresas distribuidoras
- **Pallets**: Pallets de ejemplo en almacenes
- **Auditorías**: Registros de ejemplo

## 🚀 Uso del Sistema

### Para Desarrollo

```bash
# Ejecutar seeding completo
npm run seed

# O ejecutar directamente
npx ts-node data/seed/seed.ts
```

### Para Producción

```bash
# Usando TypeORM (recomendado)
npx ts-node data/seed/seed-production.ts

# O usando SQL directo
npx ts-node data/seed/seed-prod-direct.ts
```

### Para Testing

```bash
# Configurar NODE_ENV=test
NODE_ENV=test npx ts-node data/seed/seed.ts
```

## ⚙️ Configuración

### Variables de Entorno

El sistema respeta las siguientes variables de entorno:

- `NODE_ENV`: Entorno de ejecución (development, test, production)
- `DB_HOST`: Host de la base de datos
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `DB_NAME`: Nombre de la base de datos

### Configuración de Base de Datos

Los scripts SQL están optimizados para MySQL con:
- Motor InnoDB
- Charset UTF8MB4
- Collation unicode_ci
- Índices apropiados para rendimiento
- Claves foráneas con integridad referencial

## 🔒 Seguridad

- **Hashing de contraseñas**: Usa bcrypt con salt rounds = 10
- **Validación de existencia**: Evita creación duplicada de usuarios admin
- **Conexiones seguras**: Manejo apropiado de conexiones y errores
- **Rollback automático**: En caso de errores, se revierten cambios

## 📝 Notas Importantes

1. **Orden de ejecución**: Los scripts SQL deben ejecutarse en orden específico
2. **Dependencias**: Algunas tablas requieren que otras existan primero
3. **Entornos**: Cada script está optimizado para su entorno específico
4. **Datos sensibles**: Las contraseñas están hasheadas y son solo para desarrollo
5. **Backup**: Siempre hacer backup antes de ejecutar en producción

## 🐛 Troubleshooting

### Error de conexión
- Verificar credenciales de base de datos
- Confirmar que el servidor MySQL esté ejecutándose
- Revisar configuración de firewall/red

### Error de tabla duplicada
- Ejecutar primero `drop-all-tables.sql`
- Verificar que no haya sesiones activas usando las tablas

### Error de clave foránea
- Asegurar que las tablas padre existan antes de las hijas
- Verificar integridad de datos de referencia

## 🔄 Mantenimiento

Para actualizar el sistema de seed:

1. **Modificar entidades**: Actualizar `create-tables.sql`
2. **Agregar datos**: Extender `seed-data.sql`
3. **Actualizar scripts**: Modificar archivos TypeScript según necesites
4. **Probar cambios**: Ejecutar en entorno de desarrollo primero
5. **Documentar**: Actualizar este README con cambios

## 📞 Soporte

Para issues relacionados con el sistema de seed, revisar:
- Logs de ejecución en consola
- Configuración de base de datos
- Permisos de usuario en MySQL
- Variables de entorno activas</content>
<filePath>filePath">/Users/felipe/dev/ElectNextStart/data/seed/README.md