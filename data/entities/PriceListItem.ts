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
    Unique,
} from "typeorm";
import { PriceList } from "./PriceList";
import { Product } from "./Product";
import { ProductVariant } from "./ProductVariant";

@Entity("price_list_items")
@Unique(['priceListId', 'productId', 'productVariantId'])
export class PriceListItem {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    priceListId?: string;

    @Column({ type: 'uuid', nullable: true })
    productId?: string;

    @Column({ type: 'uuid', nullable: true })
    productVariantId?: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    price!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    minPrice?: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    discountPercentage?: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => PriceList, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'priceListId' })
    priceList?: PriceList;

    @ManyToOne(() => Product, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'productId' })
    product?: Product;

    @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'productVariantId' })
    productVariant?: ProductVariant;
}
