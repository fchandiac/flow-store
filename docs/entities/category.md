# Entidad: Category

## 1. Descripción

La entidad `Category` organiza los productos en una estructura jerárquica. Soporta categorías anidadas (árbol).

---

## 2. Estructura

```typescript
@Entity("categories")
export class Category {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100 })
    name: string;

    @Column({ type: "varchar", length: 300, nullable: true })
    description?: string;

    @Column({ type: "uuid", nullable: true })
    parentId?: string;  // Para subcategorías

    @Column({ type: "int", default: 0 })
    sortOrder: number;  // Orden de visualización

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relaciones
    @ManyToOne(() => Category, cat => cat.children, { nullable: true })
    @JoinColumn({ name: 'parentId' })
    parent?: Category;

    @OneToMany(() => Category, cat => cat.parent)
    children: Category[];

    @OneToMany(() => Product, product => product.category)
    products: Product[];
}
```

---

## 3. Diagrama

```
Category
├── id: UUID (PK)
├── name: varchar(100)
├── description: varchar(300) nullable
├── parentId: UUID (FK → Category, self-ref) nullable
├── sortOrder: int
├── isActive: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
└── deletedAt: timestamp (soft delete)
```

---

## 4. Estructura Jerárquica

```
Frutas (parentId: null)
├── Manzanas (parentId: frutas.id)
│   ├── Manzanas Rojas
│   └── Manzanas Verdes
├── Naranjas (parentId: frutas.id)
└── Berries (parentId: frutas.id)
    ├── Fresas
    ├── Arándanos
    └── Frambuesas

Verduras (parentId: null)
├── Hojas Verdes
└── Tubérculos
```

---

## 5. Uso en Consultas

```typescript
// Obtener categorías raíz
const rootCategories = await categoryRepo.find({
    where: { parentId: IsNull() },
    order: { sortOrder: 'ASC' }
});

// Obtener árbol completo
const tree = await categoryRepo.findTrees();

// Productos de una categoría y subcategorías
const products = await productRepo
    .createQueryBuilder('p')
    .leftJoin('p.category', 'c')
    .where('c.id = :catId OR c.parentId = :catId', { catId })
    .getMany();
```

---

## 6. Relación con Transaction (Indirecta)

Las categorías se relacionan indirectamente con Transaction a través de Product → ProductVariant → TransactionLine:

```
Category → Product → ProductVariant → TransactionLine → Transaction
```

Esto permite reportes como:
- Ventas por categoría
- Productos más vendidos por categoría
- Inventario por categoría
