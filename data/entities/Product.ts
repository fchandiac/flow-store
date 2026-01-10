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
import { Unit } from "./Unit";

export type ProductChangeHistoryTargetType = 'PRODUCT' | 'VARIANT';
export type ProductChangeHistoryAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ProductChangeHistoryChange {
    field: string;
    previousValue?: unknown;
    newValue?: unknown;
}

export interface ProductChangeHistoryEntry {
    id: string;
    timestamp: string;
    targetType: ProductChangeHistoryTargetType;
    targetId: string;
    targetLabel?: string;
    action: ProductChangeHistoryAction;
    summary: string;
    userId?: string;
    userName?: string;
    changes?: ProductChangeHistoryChange[];
    metadata?: Record<string, unknown>;
}

export enum ProductType {
    PHYSICAL = 'PHYSICAL',
    SERVICE = 'SERVICE',
    DIGITAL = 'DIGITAL',
}

/**
 * Product representa los datos maestros/padre del catálogo.
 * SKU, precios e inventario viven en ProductVariant.
 * Todo producto se gestiona exclusivamente a través de variantes.
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

    @Column({ type: 'uuid', nullable: true, name: 'base_unit_id' })
    baseUnitId?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    @Column({ type: 'json', nullable: true })
    changeHistory?: ProductChangeHistoryEntry[];

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

    @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'base_unit_id' })
    baseUnit?: Unit;

    // Note: ProductVariant has ManyToOne to Product
    // We don't define inverse OneToMany here to avoid circular metadata issues
}
