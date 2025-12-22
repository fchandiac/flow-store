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
import type { Product } from "./Product";

@Entity("product_variants")
export class ProductVariant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    productId!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    sku!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    barcode?: string;

    @Column({ type: 'json', nullable: true })
    attributes?: Record<string, any>;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    priceModifier?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    costModifier?: number;

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
    @ManyToOne('Product', 'variants', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product?: Product;
}
