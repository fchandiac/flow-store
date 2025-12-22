# Entidad: CashSession

## 1. Descripción

La entidad `CashSession` representa un turno o sesión de caja. Encapsula todos los movimientos de efectivo de un cajero en un período de tiempo.

---

## 2. Estructura

```typescript
enum CashSessionStatus {
    OPEN = 'OPEN',           // Activa, permite transacciones
    CLOSED = 'CLOSED',       // Cerrada por cajero
    RECONCILED = 'RECONCILED' // Validada por supervisor
}

@Entity("cash_sessions")
export class CashSession {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    pointOfSaleId: string;

    @Column({ type: "uuid" })
    userId: string;  // Cajero

    @Column({ type: "enum", enum: CashSessionStatus, default: CashSessionStatus.OPEN })
    status: CashSessionStatus;

    @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
    openingAmount: number;  // Fondo de caja inicial

    @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
    declaredAmount?: number;  // Conteo declarado al cerrar

    @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
    difference?: number;  // Diferencia (sobrante/faltante)

    @Column({ type: "timestamp" })
    openedAt: Date;

    @Column({ type: "timestamp", nullable: true })
    closedAt?: Date;

    @Column({ type: "timestamp", nullable: true })
    reconciledAt?: Date;

    @Column({ type: "uuid", nullable: true })
    reconciledByUserId?: string;  // Supervisor

    @Column({ type: "text", nullable: true })
    notes?: string;

    // Relaciones
    @ManyToOne(() => PointOfSale)
    pointOfSale: PointOfSale;

    @ManyToOne(() => User)
    user: User;

    @ManyToOne(() => User, { nullable: true })
    reconciledByUser?: User;
}
```

---

## 3. Diagrama

```
CashSession
├── id: UUID (PK)
├── pointOfSaleId: UUID (FK → PointOfSale)
├── userId: UUID (FK → User)
├── status: enum(OPEN, CLOSED, RECONCILED)
├── openingAmount: decimal(15,2)
├── declaredAmount: decimal(15,2) (nullable)
├── difference: decimal(15,2) (nullable)
├── openedAt: timestamp
├── closedAt: timestamp (nullable)
├── reconciledAt: timestamp (nullable)
├── reconciledByUserId: UUID (FK → User, nullable)
└── notes: text (nullable)
```

---

## 4. Estados

```
OPEN → CLOSED → RECONCILED
```

| Estado | Permite Transacciones | Descripción |
|--------|----------------------|-------------|
| `OPEN` | ✅ Sí | Sesión activa |
| `CLOSED` | ❌ No | Cajero cerró y declaró conteo |
| `RECONCILED` | ❌ No | Supervisor validó, **INMUTABLE** |

---

## 5. Saldo de Caja

El saldo se calcula desde transacciones:

```sql
SELECT 
    SUM(CASE 
        WHEN type IN ('CASH_IN', 'CASH_OVERAGE') THEN amount
        WHEN type IN ('CASH_OUT', 'CASH_SHORTAGE') THEN -amount
        ELSE 0
    END) + opening_amount as saldo_teorico
FROM transactions t
JOIN cash_sessions cs ON cs.id = t.cash_session_id
WHERE cs.id = :session_id;
```

---

## 6. Flujo de Cierre

```
1. Cajero cierra sesión → status = CLOSED
2. Sistema calcula saldo teórico
3. Cajero declara conteo físico (declaredAmount)
4. Sistema calcula diferencia
5. Si diferencia != 0:
   - Sobrante → Transaction CASH_OVERAGE
   - Faltante → Transaction CASH_SHORTAGE
6. Supervisor valida → status = RECONCILED
```

---

## 7. Relaciones

```
PointOfSale (1) ──────── (N) CashSession
User (1) ──────── (N) CashSession (como cajero)
CashSession (1) ──────── (N) Transaction
```
