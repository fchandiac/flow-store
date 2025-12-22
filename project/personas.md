# Documentación Técnica: Sistema de Personas

Este documento describe el modelo de personas del ERP, que sirve como base para usuarios, clientes, proveedores y cualquier otra entidad que represente un actor en el sistema.

---

## 1. Filosofía del Modelo

### 1.1 Principios Fundamentales

| Principio | Descripción |
|-----------|-------------|
| **Centralización** | Una sola entidad base para todos los actores del sistema |
| **Flexibilidad** | Soporta personas naturales y jurídicas (empresas) |
| **Reutilización** | Evita duplicación de datos de contacto e identificación |
| **Extensibilidad** | Roles múltiples para una misma persona |

### 1.2 Modelo Conceptual

```
┌─────────────────────────────────────────────────────────────────────┐
│                           PERSON                                    │
│                    (Entidad Central)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐                                                  │
│   │   NATURAL    │  Persona física (individuo)                      │
│   │              │  - RUT/DNI personal                              │
│   │              │  - Nombre + Apellido                             │
│   └──────────────┘                                                  │
│                                                                     │
│   ┌──────────────┐                                                  │
│   │   COMPANY    │  Persona jurídica (empresa)                      │
│   │              │  - RUT/RFC empresa                               │
│   │              │  - Razón social                                  │
│   │              │  - Representante legal                           │
│   └──────────────┘                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Una persona puede tener múltiples roles
                              ▼
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐         ┌──────────┐
   │  USER   │          │ CUSTOMER │         │ SUPPLIER │
   │(Usuario)│          │ (Cliente)│         │(Proveedor)│
   └─────────┘          └──────────┘         └──────────┘
```

> **Importante:** Una misma persona puede ser simultáneamente usuario, cliente y proveedor.

---

## 2. Entidad Person

### 2.1 Estructura de Datos

```typescript
enum PersonType {
    NATURAL = 'NATURAL',   // Persona natural/física
    COMPANY = 'COMPANY'    // Persona jurídica/empresa
}

@Entity("persons")
export class Person {
    id: UUID                    // Identificador único
    type: PersonType            // Tipo de persona
    
    // Identificación fiscal
    taxId: string               // RUT/RFC/RUC/DNI
    taxIdType?: string          // Tipo de documento (RUT, RFC, DNI, etc.)
    
    // Datos básicos
    name: string                // Nombre completo o Razón social
    firstName?: string          // Primer nombre (solo NATURAL)
    lastName?: string           // Apellido (solo NATURAL)
    tradeName?: string          // Nombre de fantasía (solo COMPANY)
    
    // Contacto
    email?: string              // Correo electrónico principal
    phone?: string              // Teléfono principal
    mobile?: string             // Teléfono móvil
    
    // Dirección
    address?: string            // Dirección completa
    city?: string               // Ciudad
    state?: string              // Estado/Región/Provincia
    country?: string            // País
    postalCode?: string         // Código postal
    
    // Datos empresa (solo COMPANY)
    legalRepresentative?: string    // Representante legal
    legalRepresentativeTaxId?: string // RUT del representante
    
    // Metadata
    isActive: boolean           // Estado activo/inactivo
    notes?: string              // Notas adicionales
    metadata?: JSON             // Datos adicionales flexibles
    
    // Timestamps
    createdAt: Date
    updatedAt: Date
    deletedAt?: Date            // Soft delete
}
```

### 2.2 Diagrama de Entidad

```
Person
├── id: UUID (PK)
├── type: enum(NATURAL, COMPANY)
│
├── taxId: varchar (indexed, unique per company)
├── taxIdType: varchar (nullable)
│
├── name: varchar (nombre completo / razón social)
├── firstName: varchar (nullable, solo NATURAL)
├── lastName: varchar (nullable, solo NATURAL)
├── tradeName: varchar (nullable, solo COMPANY)
│
├── email: varchar (nullable)
├── phone: varchar (nullable)
├── mobile: varchar (nullable)
│
├── address: text (nullable)
├── city: varchar (nullable)
├── state: varchar (nullable)
├── country: varchar (nullable)
├── postalCode: varchar (nullable)
│
├── legalRepresentative: varchar (nullable, solo COMPANY)
├── legalRepresentativeTaxId: varchar (nullable, solo COMPANY)
│
├── isActive: boolean (default: true)
├── notes: text (nullable)
├── metadata: JSON (nullable)
│
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 3. Tipos de Persona

### 3.1 Persona Natural (NATURAL)

Representa a un individuo/persona física.

```typescript
// Ejemplo de persona natural
{
    type: PersonType.NATURAL,
    taxId: "12.345.678-9",
    taxIdType: "RUT",
    name: "Juan Pérez González",
    firstName: "Juan",
    lastName: "Pérez González",
    email: "juan.perez@email.com",
    phone: "+56 9 1234 5678",
    address: "Av. Principal 123, Depto 45",
    city: "Santiago",
    country: "Chile"
}
```

**Campos relevantes:**
- `firstName` y `lastName` separados para reportes
- `name` es la concatenación para display
- `taxId` es el RUT/DNI personal

### 3.2 Persona Jurídica (COMPANY)

Representa a una empresa/organización.

```typescript
// Ejemplo de empresa
{
    type: PersonType.COMPANY,
    taxId: "76.543.210-K",
    taxIdType: "RUT",
    name: "Comercial ABC Ltda.",
    tradeName: "Tienda ABC",
    email: "contacto@tiendaabc.cl",
    phone: "+56 2 2345 6789",
    address: "Av. Industrial 456",
    city: "Santiago",
    country: "Chile",
    legalRepresentative: "María García López",
    legalRepresentativeTaxId: "11.222.333-4"
}
```

**Campos relevantes:**
- `name` es la razón social oficial
- `tradeName` es el nombre comercial/fantasía
- `legalRepresentative` para documentos legales

---

## 4. Relaciones con Otras Entidades

### 4.1 Person → User (Usuario)

```
Person ◄──────────── User
        OneToMany
```

| Relación | Descripción |
|----------|-------------|
| Cardinalidad | 1:N (una persona puede tener múltiples usuarios) |
| Nullable | Sí (usuario puede existir sin persona vinculada) |
| Caso de uso | Empleados con acceso al sistema |

```typescript
// En User
@ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
person?: Person;
```

### 4.2 Person → Customer (Cliente)

```
Person ◄──────────── Customer
        OneToOne
```

| Relación | Descripción |
|----------|-------------|
| Cardinalidad | 1:1 (una persona = un registro de cliente) |
| Campos adicionales | `creditLimit`, `paymentTermDays`, `priceListId` |
| Caso de uso | Personas que compran productos/servicios |

### 4.3 Person → Supplier (Proveedor)

```
Person ◄──────────── Supplier
        OneToOne
```

| Relación | Descripción |
|----------|-------------|
| Cardinalidad | 1:1 (una persona = un registro de proveedor) |
| Campos adicionales | `paymentTermDays`, `bankAccount`, `categories[]` |
| Caso de uso | Personas/empresas que venden insumos |

### 4.4 Diagrama Completo de Relaciones

```
                    ┌──────────────────┐
                    │      Person      │
                    │   (Base común)   │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    ┌───────────┐     ┌───────────┐      ┌───────────┐
    │   User    │     │ Customer  │      │ Supplier  │
    │           │     │           │      │           │
    │ userName  │     │creditLimit│      │paymentTerm│
    │ pass      │     │priceListId│      │bankAccount│
    │ rol       │     │paymentTerm│      │categories │
    │ permisos  │     │           │      │           │
    └───────────┘     └───────────┘      └───────────┘
          │                  │                  │
          │                  │                  │
          ▼                  ▼                  ▼
    ┌───────────┐     ┌───────────┐      ┌───────────┐
    │Permission │     │   Sale    │      │ Purchase  │
    │  Audit    │     │  Invoice  │      │ Reception │
    └───────────┘     └───────────┘      └───────────┘
```

---

## 5. Roles Múltiples

### 5.1 Una Persona, Múltiples Roles

Una misma persona puede actuar en diferentes capacidades:

```
┌─────────────────────────────────────────────────────────┐
│  Person: "Comercial XYZ Ltda." (RUT: 76.123.456-7)     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ Es PROVEEDOR: Nos vende insumos                     │
│  ✓ Es CLIENTE: Nos compra productos terminados          │
│  ✓ Tiene USUARIO: Acceso al portal de proveedores       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Beneficios del Modelo

| Beneficio | Descripción |
|-----------|-------------|
| **Sin duplicación** | Un solo registro de contacto e identificación |
| **Consistencia** | Cambios se reflejan en todos los roles |
| **Trazabilidad** | Historial unificado de interacciones |
| **Reportes** | Visión 360° del actor |

---

## 6. Validaciones

### 6.1 Validaciones Comunes

| Campo | Validación |
|-------|------------|
| `taxId` | Formato válido según país, único por company |
| `email` | Formato email válido |
| `phone` | Formato teléfono válido |
| `type` | Valor del enum válido |

### 6.2 Validaciones por Tipo

**Persona Natural:**
```typescript
if (type === PersonType.NATURAL) {
    // firstName y lastName recomendados
    // legalRepresentative debe ser null
}
```

**Persona Jurídica:**
```typescript
if (type === PersonType.COMPANY) {
    // tradeName recomendado
    // legalRepresentative recomendado para docs legales
}
```

---

## 7. Operaciones CRUD

### 7.1 Crear Persona

```typescript
interface CreatePersonPayload {
    type: PersonType;
    taxId: string;
    name: string;
    firstName?: string;   // para NATURAL
    lastName?: string;    // para NATURAL
    tradeName?: string;   // para COMPANY
    email?: string;
    phone?: string;
    address?: string;
    // ... otros campos opcionales
}
```

### 7.2 Buscar Persona

```sql
-- Por RUT/taxId
SELECT * FROM persons WHERE taxId = ? AND deletedAt IS NULL;

-- Por nombre (búsqueda parcial)
SELECT * FROM persons 
WHERE (name ILIKE ? OR tradeName ILIKE ?) 
AND deletedAt IS NULL;

-- Con sus roles
SELECT p.*, 
       u.id as user_id,
       c.id as customer_id,
       s.id as supplier_id
FROM persons p
LEFT JOIN users u ON u.person_id = p.id
LEFT JOIN customers c ON c.person_id = p.id
LEFT JOIN suppliers s ON s.person_id = p.id
WHERE p.id = ?;
```

### 7.3 Verificar Roles

```typescript
async function getPersonRoles(personId: string): Promise<{
    isUser: boolean;
    isCustomer: boolean;
    isSupplier: boolean;
}> {
    const user = await userRepo.findOne({ where: { personId } });
    const customer = await customerRepo.findOne({ where: { personId } });
    const supplier = await supplierRepo.findOne({ where: { personId } });
    
    return {
        isUser: !!user,
        isCustomer: !!customer,
        isSupplier: !!supplier
    };
}
```

---

## 8. Integración con Auditoría

Todas las operaciones sobre personas generan auditoría:

| Operación | Acción | entityName |
|-----------|--------|------------|
| Crear persona | `CREATE` | `Person` |
| Actualizar datos | `UPDATE` | `Person` |
| Eliminar (soft) | `DELETE` | `Person` |
| Asignar como cliente | `CREATE` | `Customer` |
| Asignar como proveedor | `CREATE` | `Supplier` |

---

## 9. Índices Recomendados

| Columna(s) | Tipo | Propósito |
|------------|------|-----------|
| `taxId` | UNIQUE (por company) | Búsqueda por RUT |
| `name` | INDEX | Búsqueda por nombre |
| `email` | INDEX | Búsqueda por email |
| `type` | INDEX | Filtrado por tipo |
| `isActive` | INDEX | Filtrar activos |
| `deletedAt` | INDEX | Soft delete queries |

---

## 10. Mejores Prácticas

### 10.1 Al Crear Personas

✅ **Recomendado:**
- Validar formato de taxId antes de guardar
- Normalizar nombre (mayúsculas/minúsculas consistentes)
- Verificar si ya existe persona con mismo taxId

❌ **Evitar:**
- Crear duplicados por variaciones en el taxId (puntos, guiones)
- Dejar campos de contacto vacíos si están disponibles

### 10.2 Al Asignar Roles

```typescript
// Antes de crear un Customer o Supplier, verificar si Person existe
const existingPerson = await personRepo.findOne({ 
    where: { taxId: normalizedTaxId } 
});

if (existingPerson) {
    // Vincular al existente
    customer.person = existingPerson;
} else {
    // Crear nueva persona
    const newPerson = await personRepo.save({ ... });
    customer.person = newPerson;
}
```
