import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Product } from "./Product";
import { Unit } from "./Unit";

/**
 * ProductVariant es donde vive el SKU, precio, costo y datos de inventario.
 * Todo producto tiene al menos una variante.
 * Para productos simples, se crea automáticamente una variante "default".
 * 
 * La variante NO tiene nombre propio - se identifica por el producto + sus atributos.
 * Ejemplo: "Camiseta Nike" + {Color: "Rojo", Talla: "M"} = "Camiseta Nike - Rojo, M"
 */
@Entity("product_variants")
export class ProductVariant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    productId?: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    sku!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    barcode?: string;

    /**
     * Precio base de venta (sin impuestos)
     */
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    basePrice!: number;

    /**
     * Costo/PPP (Precio Promedio Ponderado)
     */
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    baseCost!: number;

    /**
     * Precio Promedio Ponderado actual (PMP)
     */
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    pmp!: number;

    @Column({ type: 'varchar', length: 36, name: 'unit_id' })
    unitId!: string;

    @ManyToOne(() => Unit, { onDelete: 'RESTRICT', eager: true })
    @JoinColumn({ name: 'unit_id' })
    unit!: Unit;

    @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
    weight?: number;

    @Column({ type: 'varchar', length: 16, name: 'weight_unit', default: 'kg' })
    weightUnit!: string;

    /**
     * Valores de atributos para esta variante.
     * Formato: { "attributeId1": "opción seleccionada", "attributeId2": "opción seleccionada" }
     * Ejemplo: { "uuid-color": "Rojo", "uuid-talla": "M" }
     * 
     * Para productos sin atributos, este campo puede estar vacío o null.
     */
    @Column({ type: 'json', nullable: true })
    attributeValues?: Record<string, string>;

    /**
     * Array de IDs de impuestos aplicables a esta variante
     * Si está vacío o null, se usan los impuestos por defecto del producto
     */
    @Column({ type: 'json', nullable: true })
    taxIds?: string[];

    /**
     * Si se controla inventario para esta variante
     */
    @Column({ type: 'boolean', default: true })
    trackInventory!: boolean;

    /**
     * Si se permite stock negativo para esta variante
     */
    @Column({ type: 'boolean', default: false })
    allowNegativeStock!: boolean;

    /**
     * Niveles de stock para control de inventario
     */
    @Column({ type: 'int', default: 0 })
    minimumStock!: number;

    @Column({ type: 'int', default: 0 })
    maximumStock!: number;

    @Column({ type: 'int', default: 0 })
    reorderPoint!: number;

    @Column({ type: 'varchar', length: 500, nullable: true })
    imagePath?: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => Product, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'productId' })
    product?: Product;
}
