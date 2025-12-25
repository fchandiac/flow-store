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
import { Category } from "./Category";

export enum ProductType {
    PHYSICAL = 'PHYSICAL',
    SERVICE = 'SERVICE',
    DIGITAL = 'DIGITAL',
}

/**
 * Product es el producto maestro/padre.
 * NO contiene SKU, precio ni costo - esos datos viven en ProductVariant.
 * Todo producto debe tener al menos una variante (se crea automáticamente para productos simples).
 */
@Entity("products")
export class Product {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    categoryId?: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    brand?: string;

    @Column({ type: 'enum', enum: ProductType, default: ProductType.PHYSICAL })
    productType!: ProductType;

    /**
     * Array de IDs de impuestos aplicables por defecto a las variantes
     * Las variantes pueden sobreescribir esto con su propio taxIds
     */
    @Column({ type: 'json', nullable: true })
    taxIds?: string[];

    @Column({ type: 'varchar', length: 500, nullable: true })
    imagePath?: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    /**
     * Indica si el producto tiene múltiples variantes definidas por el usuario.
     * Si false, tiene una única variante "default" creada automáticamente.
     */
    @Column({ type: 'boolean', default: false })
    hasVariants!: boolean;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => Category, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'categoryId' })
    category?: Category;

    // Note: ProductVariant has ManyToOne to Product
    // We don't define inverse OneToMany here to avoid circular metadata issues
}
