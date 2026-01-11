# Entidad: User

## 1. Descripción

La entidad `User` representa una cuenta de acceso al sistema. Está vinculada a una `Person` para heredar datos de identificación.

> 📝 Ver documentación completa en `project/usuarios.md`

---

## 2. Estructura

```typescript
enum UserRole {
    ADMIN = 'ADMIN',
    OPERATOR = 'OPERATOR'
}

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", nullable: true })
    personId?: string;

    @Column({ type: "varchar", length: 100, unique: true })
    userName: string;

    @Column({ type: "varchar", length: 255 })
    pass: string;  // Encriptado

    @Column({ type: "varchar", length: 255 })
    mail: string;

    @Column({ type: "enum", enum: UserRole, default: UserRole.OPERATOR })
    rol: UserRole;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
    person?: Person;

    @OneToMany(() => Permission, permission => permission.user)
    permissions: Permission[];
}
```

---

## 3. Diagrama

```
User
├── id: UUID (PK)
├── personId: UUID (FK → Person, nullable)
├── userName: varchar(100) UNIQUE
├── pass: varchar(255) (encrypted)
├── mail: varchar(255)
├── rol: enum(ADMIN, OPERATOR)
└── deletedAt: timestamp (soft delete)
```

---

## 4. Roles

| Rol | Acceso |
|-----|--------|
| `ADMIN` | Acceso total al sistema |
| `OPERATOR` | Operaciones básicas + permisos asignados |

---

## 5. Relaciones

```
Person (1) ──────── (N) User
User (1) ──────── (N) Permission
User (1) ──────── (N) CashSession
User (1) ──────── (N) Transaction (como autor)
User (1) ──────── (N) Audit
```
