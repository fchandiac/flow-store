# Server Actions - Documentación

Este directorio contiene la documentación de todos los Server Actions del sistema FlowStore.

---

## ¿Qué son los Server Actions?

Los Server Actions son funciones asíncronas que se ejecutan en el servidor. En Next.js 14+, permiten llamar funciones del servidor directamente desde componentes React sin crear endpoints API explícitos.

```typescript
// app/actions/example.ts
'use server'

export async function myServerAction(data: InputDTO) {
    // Este código se ejecuta en el servidor
    const result = await database.query(...);
    return result;
}
```

---

## Convenciones

### Nomenclatura de Archivos

```
app/actions/
├── auth.server.ts          # Helpers de sesión NextAuth (sufijo .server para claridad)
├── transactions.ts         # Transacciones
├── products.ts             # Productos
├── [entidad].ts            # Un archivo por entidad
```

### Estructura de un Server Action

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Entity } from '@/data/entities/Entity';
import { revalidatePath } from 'next/cache';

// Types
interface CreateEntityDTO { ... }
interface UpdateEntityDTO { ... }

// CRUD Operations
export async function getEntities(): Promise<Entity[]> { ... }
export async function getEntityById(id: string): Promise<Entity | null> { ... }
export async function createEntity(data: CreateEntityDTO): Promise<Entity> { ... }
export async function updateEntity(id: string, data: UpdateEntityDTO): Promise<Entity> { ... }
export async function deleteEntity(id: string): Promise<void> { ... }
```

---

## Índice de Server Actions

### Core
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [transactions.ts](./transactions.md) | Transaction | CRUD de transacciones (inmutables) |

### Autenticación
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [auth.server.ts](./auth.md) | User/Session | Helpers de sesión NextAuth |

### Organización
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [companies.ts](./companies.md) | Company | Configuración de empresa |
| [branches.ts](./branches.md) | Branch | Gestión de sucursales |
| [storages.ts](./storages.md) | Storage | Gestión de almacenes |
| [pointsOfSale.ts](./points-of-sale.md) | PointOfSale | Puntos de venta |
| [cashSessions.ts](./cash-sessions.md) | CashSession | Sesiones de caja |

### Actores
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [persons.ts](./persons.md) | Person | CRUD de personas |
| [users.ts](./users.md) | User | Gestión de usuarios |
| [customers.ts](./customers.md) | Customer | Gestión de clientes |
| [suppliers.ts](./suppliers.md) | Supplier | Gestión de proveedores |

### Productos
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [products.ts](./products.md) | Product | Productos base |
| [productVariants.ts](./product-variants.md) | ProductVariant | Variantes/SKUs |
| [categories.ts](./categories.md) | Category | Categorías |
| [priceLists.ts](./price-lists.md) | PriceList | Listas de precios |

### Inventario
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [stock.ts](./stock.md) | StockLevel | Consultas de stock |

### Fiscal
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [taxes.ts](./taxes.md) | Tax | Gestión de impuestos |

### Sistema
| Archivo | Entidad | Descripción |
|---------|---------|-------------|
| [audits.ts](./audits.md) | Audit | Consulta de auditorías |
| [permissions.ts](./permissions.md) | Permission | Gestión de permisos |

---

## Patrones Comunes

### Manejo de Errores

```typescript
'use server'

export async function createProduct(data: CreateProductDTO) {
    try {
        const ds = await getDataSource();
        const repo = ds.getRepository(Product);
        const product = repo.create(data);
        await repo.save(product);
        
        revalidatePath('/admin/products');
        return { success: true, data: product };
    } catch (error) {
        console.error('Error creating product:', error);
        return { success: false, error: 'Failed to create product' };
    }
}
```

### Validación

```typescript
'use server'

import { z } from 'zod';

const createProductSchema = z.object({
    code: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    categoryId: z.string().uuid().optional(),
});

export async function createProduct(data: unknown) {
    const validated = createProductSchema.parse(data);
    // ... continuar con datos validados
}
```

### Transacciones de Base de Datos

```typescript
'use server'

export async function transferStock(data: TransferDTO) {
    const ds = await getDataSource();
    const queryRunner = ds.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        // Crear transacción de salida
        await queryRunner.manager.save(Transaction, stockOut);
        
        // Crear transacción de entrada
        await queryRunner.manager.save(Transaction, stockIn);
        
        await queryRunner.commitTransaction();
        return { success: true };
    } catch (error) {
        await queryRunner.rollbackTransaction();
        return { success: false, error: error.message };
    } finally {
        await queryRunner.release();
    }
}
```
