import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import type { Category } from "./Category";
import type { ProductVariant } from "./ProductVariant";

export enum ProductType {
    PHYSICAL = 'PHYSICAL',
    SERVICE = 'SERVICE',
    DIGITAL = 'DIGITAL',
}

@Entity("products")
export class Product {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    categoryId?: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    sku!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    barcode?: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'enum', enum: ProductType, default: ProductType.PHYSICAL })
    productType!: ProductType;

    @Column({ type: 'varchar', length: 20, nullable: true })
    unitOfMeasure?: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    basePrice!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    baseCost!: number;

    @Column({ type: 'uuid', nullable: true })
    defaultTaxId?: string;

    @Column({ type: 'boolean', default: true })
    trackInventory!: boolean;

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

    @Column({ type: 'json', nullable: true })
    attributes?: Record<string, any>;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne('Category', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'categoryId' })
    category?: Category;

    @OneToMany('ProductVariant', 'product')
    variants?: ProductVariant[];
}
