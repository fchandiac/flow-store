# Employee

Entidad que representa a colaboradores internos vinculados a `Person`. Gestiona datos contractuales, asignación organizacional y estado laboral.

---

## 1. Esquema de Datos

```typescript
enum EmploymentType {
    FULL_TIME = 'FULL_TIME',
    PART_TIME = 'PART_TIME',
    CONTRACTOR = 'CONTRACTOR',
    TEMPORARY = 'TEMPORARY',
    INTERN = 'INTERN'
}

enum EmployeeStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    TERMINATED = 'TERMINATED'
}

@Entity('employees')
class Employee {
    id: UUID
    companyId: UUID
    personId: UUID
    branchId?: UUID | null
    costCenterId?: UUID | null
    reportsToId?: UUID | null

    positionTitle?: string
    employmentType: EmploymentType
    status: EmployeeStatus

    hireDate: Date
    terminationDate?: Date | null

    baseSalary?: bigint | null // CLP entero
    metadata?: JSON

    createdAt: Date
    updatedAt: Date
    deletedAt?: Date | null
}
```

### Campos Relevantes

| Campo | Descripción |
|-------|-------------|
| `companyId` | FK a `Company`; permite reportes globales. |
| `personId` | FK obligatorio a `Person`; reutiliza datos personales. |
| `branchId` | Sucursal primaria asignada al colaborador. |
| `costCenterId` | Centro de costos principal para imputaciones OPEX. |
| `reportsToId` | Relación jerárquica hacia otro `Employee`. |
| `employmentType` | Tipo de contratación. |
| `status` | Estado laboral vigente. |
| `hireDate` | Fecha de ingreso a la compañía. |
| `terminationDate` | Fecha de término, válida solo para estado `TERMINATED`. |
| `baseSalary` | Monto bruto mensual en CLP (entero). |
| `metadata` | Campo flexible para almacenar datos adicionales (contrato, licencias). |

---

## 2. Relaciones

```
Company ──< Employee >── Person
             │           │
             ├──< Branch │
             └──< CostCenter
                    │
                    └──< Budget
```

| Relación | Tipo | Notas |
|----------|------|-------|
| `company` | N:1 | Restrict al eliminar empresa. |
| `person` | N:1 | Obliga a que todo empleado tenga ficha en `Person`. |
| `branch` | N:1 | Se anula a `NULL` si la sucursal se elimina. |
| `costCenter` | N:1 | Permite trazabilidad de gastos por centro. |
| `manager` | N:1 (self) | Jerarquía opcional (`reportsToId`). |

---

## 3. Ciclo de Vida

| Estado | Descripción | Reglas |
|--------|-------------|--------|
| `ACTIVE` | Colaborador operativo. | Debe tener `hireDate` definida y `terminationDate = NULL`. |
| `SUSPENDED` | Licencia, sanción u otra pausa temporal. | Mantiene `hireDate` y `terminationDate = NULL`. |
| `TERMINATED` | Relación laboral finalizada. | Requiere `terminationDate`. |

### Transiciones sugeridas

```
ACTIVE ──> SUSPENDED ──> ACTIVE
ACTIVE ──> TERMINATED
SUSPENDED ──> TERMINATED
```

---

## 4. Casos de Uso

1. **Asignación de Turnos**: `CashSession` puede vincular el `openedBy` a un usuario que, a su vez, referencia a un `Employee` para auditorías.
2. **Gastos Operativos**: Los presupuestos (`Budget`) y aprobaciones por `CostCenter` requieren saber quién es el responsable.
3. **Control de Acceso**: Emparejar `Employee` con `User` permite habilitar y suspender accesos siguiendo el estado laboral.
4. **Reportes RH**: Generar planillas de dotación, rotación y estructura jerárquica usando `reportsToId`.

---

## 5. Validaciones Recomendadas

- `terminationDate` obligatorio cuando `status = TERMINATED`.
- `hireDate <= terminationDate` si existe fecha de término.
- Único `Employee` por `personId` y `companyId`.
- Si `reportsToId` se usa, evitar ciclos (validación en servicio).
- Sincronizar estado `Employee` con activación de `User` para evitar accesos indebidos.

---

## 6. Integraciones Futuras

- Nómina y liquidaciones (exportar `baseSalary` y tipo de contrato).
- Workflow de aprobaciones (solicitudes de compra/gasto asignadas al responsable del centro de costos).
- Gestión de licencias/ausencias mediante `metadata` o tablas relacionadas.
- Mapeo directo a `CashSession` para identificar cajeros presentes por turno.
