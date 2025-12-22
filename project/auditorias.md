# Documentación Técnica: Sistema de Auditoría

Este documento describe el sistema de auditoría del ERP, diseñado para mantener un registro completo e inmutable de todas las operaciones realizadas en el sistema.

---

## 1. Filosofía de Auditoría

### 1.1 Principios Fundamentales

| Principio | Descripción |
|-----------|-------------|
| **Inmutabilidad** | Los registros de auditoría nunca se modifican |
| **Completitud** | Toda operación relevante genera un registro |
| **Trazabilidad** | Cada registro identifica quién, qué y cuándo |
| **Persistencia** | Registros preservados incluso si la entidad se elimina |

---

## 2. Entidad Audit

### 2.1 Estructura de Datos

```typescript
@Entity("audits")
export class Audit {
    id: UUID                        // Identificador único
    entityName: string              // Nombre de la entidad afectada
    entityId: string                // ID de la entidad afectada
    userId?: string                 // Usuario que realizó la acción
    user?: User                     // Relación con usuario
    action: AuditActionType         // Tipo de acción
    changes?: Record<string, any>   // Cambios realizados
    oldValues?: Record<string, any> // Valores anteriores
    newValues?: Record<string, any> // Valores nuevos
    description?: string            // Descripción legible
    createdAt: Date                 // Timestamp de creación
    deletedAt?: Date                // Soft delete
}
```

### 2.2 Diagrama de Entidad

```
Audit
├── id: UUID (PK)
├── entityName: varchar(255)
├── entityId: varchar(255)
├── userId: UUID (FK → User, nullable)
├── action: enum(AuditActionType)
├── changes: JSON (nullable)
├── oldValues: JSON (nullable)
├── newValues: JSON (nullable)
├── description: text (nullable)
├── createdAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 3. Tipos de Acciones (AuditActionType)

### 3.1 Acciones CRUD Básicas

| Acción | Código | Descripción |
|--------|--------|-------------|
| **Crear** | `CREATE` | Creación de nueva entidad |
| **Leer** | `READ` | Lectura de datos (opcional) |
| **Actualizar** | `UPDATE` | Modificación de entidad |
| **Eliminar** | `DELETE` | Eliminación de entidad |

### 3.2 Acciones de Autenticación

| Acción | Código | Descripción |
|--------|--------|-------------|
| **Login Exitoso** | `LOGIN_SUCCESS` | Inicio de sesión correcto |
| **Login Fallido** | `LOGIN_FAILED` | Intento de login rechazado |
| **Logout** | `LOGOUT` | Cierre de sesión |

### 3.3 Acciones Especiales

| Acción | Código | Descripción |
|--------|--------|-------------|
| **Cambio Password** | `UPDATE_PASSWORD` | Cambio de contraseña |
| **Exportación** | `EXPORT` | Exportación de datos |

---

## 4. Entidades Auditadas

### 4.1 Entidades del Sistema

| Entidad | entityName | Descripción |
|---------|------------|-------------|
| Usuario | `User` | Gestión de usuarios |
| Persona | `Person` | Datos de personas |
| Autenticación | `Auth` | Eventos de login/logout |

### 4.2 Entidades de Producción

| Entidad | entityName | Descripción |
|---------|------------|-------------|
| Temporada | `Season` | Temporadas de producción |
| Variedad | `Variety` | Variedades de producto |
| Formato | `Format` | Formatos de empaque |
| Productor | `Producer` | Productores |
| Recepción | `Reception` | Recepciones de producto |
| Pallet | `Pallet` | Pallets de almacenamiento |

### 4.3 Entidades de Almacenamiento

| Entidad | entityName | Descripción |
|---------|------------|-------------|
| Almacenamiento | `Storage` | Ubicaciones de almacenamiento |
| Bandeja | `Tray` | Bandejas de producto |

### 4.4 Entidades Financieras

| Entidad | entityName | Descripción |
|---------|------------|-------------|
| Anticipo | `Advance` | Anticipos a productores |
| Liquidación | `Settlement` | Liquidaciones |
| Transacción | `Transaction` | Transacciones financieras |

### 4.5 Entidades de Despacho

| Entidad | entityName | Descripción |
|---------|------------|-------------|
| Cliente | `Customer` | Clientes |
| Despacho | `Dispatch` | Despachos de producto |

---

## 5. Estructura de Cambios (Changes)

### 5.1 Formato de Changes

```typescript
interface AuditChangeData {
    fields: Record<string, {
        oldValue: any;
        newValue: any;
    }>;
    summary: string;      // Resumen de campos cambiados
    changeCount: number;  // Cantidad de campos modificados
}
```

### 5.2 Ejemplo de Changes

```json
{
    "fields": {
        "userName": {
            "oldValue": "usuario_anterior",
            "newValue": "usuario_nuevo"
        },
        "mail": {
            "oldValue": "old@email.com",
            "newValue": "new@email.com"
        }
    },
    "summary": "userName, mail",
    "changeCount": 2
}
```

---

## 6. AuditService

### 6.1 Funcionalidades

```typescript
class AuditService {
    // Registrar auditoría
    async logAudit(payload: AuditLogPayload): Promise<Audit>
    
    // Calcular cambios entre valores
    private calculateChanges(
        oldValues?: Record<string, any>, 
        newValues?: Record<string, any>
    ): AuditChangeData
    
    // Generar descripción legible
    private generateDescription(
        action: AuditActionType, 
        entityName: string, 
        changes: AuditChangeData
    ): string
}
```

### 6.2 Campos Ignorados en Auditoría

Los siguientes campos no se registran en los cambios:

```typescript
const ignoredFields = [
    'id',           // Identificador (no cambia)
    '__v',          // Versión interna
    'createdAt',    // Timestamp de creación
    'updatedAt',    // Timestamp de actualización
    'deletedAt',    // Soft delete
    'person'        // Relaciones complejas
];
```

---

## 7. AuditSubscriber (Automático)

### 7.1 Funcionamiento

El `AuditSubscriber` captura automáticamente eventos de TypeORM para ciertas entidades.

```typescript
@EventSubscriber()
class AuditSubscriber {
    // Entidades auditadas automáticamente
    const AUDITABLE_ENTITIES = ['Person'];
    
    // Eventos capturados
    afterInsert(event)  // → CREATE
    afterUpdate(event)  // → UPDATE
    afterRemove(event)  // → DELETE
}
```

### 7.2 Flujo de Auditoría Automática

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Operación  │────▶│ TypeORM      │────▶│   Audit     │
│  CRUD       │     │ Subscriber   │     │   Service   │
│             │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Registro   │
                    │   Auditoría  │
                    │   Creado     │
                    └──────────────┘
```

---

## 8. Traducciones

### 8.1 Traducción de Entidades

```typescript
const ENTITY_NAME_TRANSLATIONS = {
    User: 'Usuario',
    Person: 'Persona',
    Auth: 'Autenticación',
    Season: 'Temporada',
    Variety: 'Variedad',
    // ... más entidades
};
```

### 8.2 Traducción de Acciones

```typescript
const ACTION_TRANSLATIONS = {
    CREATE: 'Crear',
    UPDATE: 'Actualizar',
    DELETE: 'Eliminar',
    LOGIN_SUCCESS: 'Inicio de sesión exitoso',
    LOGIN_FAILED: 'Inicio de sesión fallido',
    // ... más acciones
};
```

---

## 9. Consultas Comunes

### 9.1 Auditorías por Usuario

```sql
SELECT * FROM audits 
WHERE userId = ? 
ORDER BY createdAt DESC;
```

### 9.2 Auditorías por Entidad

```sql
SELECT * FROM audits 
WHERE entityName = ? AND entityId = ?
ORDER BY createdAt DESC;
```

### 9.3 Historial de Cambios

```sql
SELECT * FROM audits 
WHERE entityName = 'User' 
AND action = 'UPDATE'
ORDER BY createdAt DESC;
```

### 9.4 Intentos de Login Fallidos

```sql
SELECT * FROM audits 
WHERE entityName = 'Auth' 
AND action = 'LOGIN_FAILED'
AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

---

## 10. Índices Recomendados

| Columna(s) | Tipo | Propósito |
|------------|------|-----------|
| `entityName, entityId` | INDEX | Búsqueda por entidad |
| `userId` | INDEX | Búsqueda por usuario |
| `action` | INDEX | Filtrado por tipo de acción |
| `createdAt` | INDEX | Ordenamiento cronológico |
| `entityName, createdAt` | INDEX COMPUESTO | Historial por entidad |

---

## 11. Retención de Datos

### 11.1 Política de Retención

| Tipo de Auditoría | Retención Sugerida |
|-------------------|-------------------|
| Login/Logout | 1 año |
| CRUD de usuarios | Permanente |
| Operaciones financieras | 7 años (fiscal) |
| Otras operaciones | 2 años |

### 11.2 Soft Delete

```typescript
@DeleteDateColumn()
deletedAt?: Date;
```

Los registros de auditoría usan soft delete para preservar la trazabilidad.

---

## 12. Mejores Prácticas

### 12.1 Cuándo Auditar

✅ **Sí auditar:**
- Creación, modificación y eliminación de entidades
- Eventos de autenticación
- Cambios de permisos o roles
- Operaciones financieras
- Exportaciones de datos

❌ **No auditar:**
- Consultas de lectura frecuentes
- Operaciones de sistema automáticas
- Datos temporales o de caché

### 12.2 Información a Registrar

```typescript
// Siempre incluir:
{
    entityName: "Entidad afectada",
    entityId: "ID de la entidad",
    userId: "Usuario que ejecutó",
    action: "Tipo de acción",
    oldValues: { /* valores anteriores */ },
    newValues: { /* valores nuevos */ }
}
```

### 12.3 Seguridad

- No registrar contraseñas ni tokens en `changes`
- Sanitizar datos sensibles antes de auditar
- Restringir acceso a visualización de auditorías
