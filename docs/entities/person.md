# Entidad: Person

## 1. Descripción

La entidad `Person` es la base central para todos los actores del sistema. Puede representar personas naturales (individuos) o jurídicas (empresas).

> 📝 Ver documentación completa en `../personas.md`

---

## 2. Estructura

```typescript
enum PersonType {
    NATURAL = 'NATURAL',   // Persona física
    COMPANY = 'COMPANY'    // Persona jurídica
}

@Entity("persons")
export class Person {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    companyId: string;

    @Column({ type: "enum", enum: PersonType })
    type: PersonType;

    // Identificación
    @Column({ type: "varchar", length: 50 })
    taxId: string;  // RUT/RFC/DNI

    @Column({ type: "varchar", length: 20, nullable: true })
    taxIdType?: string;

    // Nombres
    @Column({ type: "varchar", length: 255 })
    name: string;  // Nombre completo o Razón social

    @Column({ type: "varchar", length: 100, nullable: true })
    firstName?: string;  // Solo NATURAL

    @Column({ type: "varchar", length: 100, nullable: true })
    lastName?: string;  // Solo NATURAL

    @Column({ type: "varchar", length: 255, nullable: true })
    tradeName?: string;  // Solo COMPANY (nombre fantasía)

    // Contacto
    @Column({ type: "varchar", length: 255, nullable: true })
    email?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    phone?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    mobile?: string;

    // Dirección
    @Column({ type: "text", nullable: true })
    address?: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    city?: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    country?: string;

    // Empresa (solo COMPANY)
    @Column({ type: "varchar", length: 255, nullable: true })
    legalRepresentative?: string;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @Column({ type: "json", nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Company)
    company: Company;
}
```

---

## 3. Diagrama

```
Person
├── id: UUID (PK)
├── companyId: UUID (FK → Company)
├── type: enum(NATURAL, COMPANY)
├── taxId: varchar(50)
├── taxIdType: varchar(20) (nullable)
├── name: varchar(255)
├── firstName: varchar(100) (nullable)
├── lastName: varchar(100) (nullable)
├── tradeName: varchar(255) (nullable)
├── email: varchar(255) (nullable)
├── phone: varchar(50) (nullable)
├── mobile: varchar(50) (nullable)
├── address: text (nullable)
├── city: varchar(100) (nullable)
├── country: varchar(100) (nullable)
├── legalRepresentative: varchar(255) (nullable)
├── isActive: boolean
├── metadata: JSON (nullable)
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Roles de Person

Una persona puede tener múltiples roles:

```
Person ──┬── User (acceso al sistema)
         ├── Customer (cliente)
         └── Supplier (proveedor)
```

---

## 5. Relaciones

```
Company (1) ──────── (N) Person
Person (1) ──────── (N) User
Person (1) ──────── (0..1) Customer
Person (1) ──────── (0..1) Supplier
Person (1) ──────── (N) Transaction (como cliente/proveedor)
```
