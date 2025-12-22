import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import type { Transaction } from "./Transaction";
import type { Product } from "./Product";
import type { ProductVariant } from "./ProductVariant";
import type { Tax } from "./Tax";

/**
 * TransactionLine - Línea de detalle de transacción
 * 
 * Cada línea es inmutable como su transacción padre.
 * Almacena una instantánea del producto al momento de la transacción
 * para preservar el registro histórico incluso si el producto cambia.
 */
@Entity("transaction_lines")
export class TransactionLine {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    transactionId!: string;

    @Column({ type: 'uuid' })
    productId!: string;

    @Column({ type: 'uuid', nullable: true })
    productVariantId?: string;

    @Column({ type: 'uuid', nullable: true })
    taxId?: string;

    // Número de línea para ordenamiento
    @Column({ type: 'int', default: 1 })
    lineNumber!: number;

    // Snapshot del producto al momento de la transacción
    @Column({ type: 'varchar', length: 255 })
    productName!: string;

    @Column({ type: 'varchar', length: 100 })
    productSku!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    variantName?: string;

    // Cantidades
    @Column({ type: 'decimal', precision: 15, scale: 4 })
    quantity!: number;

    @Column({ type: 'varchar', length: 20, nullable: true })
    unitOfMeasure?: string;

    // Precios
    @Column({ type: 'decimal', precision: 15, scale: 2 })
    unitPrice!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    unitCost?: number;

    // Descuentos
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    discountPercentage!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    discountAmount!: number;

    // Impuestos
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    taxRate!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    taxAmount!: number;

    // Totales
    @Column({ type: 'decimal', precision: 15, scale: 2 })
    subtotal!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    total!: number;

    // Notas por línea
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // INMUTABLE: Solo fecha de creación
    @CreateDateColumn()
    createdAt!: Date;

    // Relations
    @ManyToOne('Transaction', 'lines', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'transactionId' })
    transaction?: Transaction;

    @ManyToOne('Product', { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'productId' })
    product?: Product;

    @ManyToOne('ProductVariant', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'productVariantId' })
    productVariant?: ProductVariant;

    @ManyToOne('Tax', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'taxId' })
    tax?: Tax;
}
