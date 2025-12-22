import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from "typeorm";
import type { Branch } from "./Branch";
import type { PointOfSale } from "./PointOfSale";
import type { CashSession } from "./CashSession";
import type { Customer } from "./Customer";
import type { Supplier } from "./Supplier";
import type { User } from "./User";
import type { TransactionLine } from "./TransactionLine";

/**
 * Transaction Types:
 * - SALE: Venta a cliente
 * - PURCHASE: Compra a proveedor
 * - SALE_RETURN: Devolución de venta
 * - PURCHASE_RETURN: Devolución de compra
 * - TRANSFER_OUT: Salida por transferencia entre bodegas
 * - TRANSFER_IN: Entrada por transferencia entre bodegas
 * - ADJUSTMENT_IN: Ajuste de inventario positivo
 * - ADJUSTMENT_OUT: Ajuste de inventario negativo
 * - PAYMENT_IN: Pago recibido
 * - PAYMENT_OUT: Pago realizado
 */
export enum TransactionType {
    SALE = 'SALE',
    PURCHASE = 'PURCHASE',
    SALE_RETURN = 'SALE_RETURN',
    PURCHASE_RETURN = 'PURCHASE_RETURN',
    TRANSFER_OUT = 'TRANSFER_OUT',
    TRANSFER_IN = 'TRANSFER_IN',
    ADJUSTMENT_IN = 'ADJUSTMENT_IN',
    ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
    PAYMENT_IN = 'PAYMENT_IN',
    PAYMENT_OUT = 'PAYMENT_OUT',
}

export enum TransactionStatus {
    DRAFT = 'DRAFT',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    TRANSFER = 'TRANSFER',
    CHECK = 'CHECK',
    CREDIT = 'CREDIT',
    MIXED = 'MIXED',
}

/**
 * ENTIDAD CENTRAL E INMUTABLE
 * 
 * Transaction es el corazón del sistema. Cada operación comercial
 * genera un registro inmutable que no puede ser modificado ni eliminado.
 * Las correcciones se hacen mediante nuevas transacciones de anulación
 * o ajuste que referencian a la original.
 */
@Entity("transactions")
@Index(['transactionType', 'createdAt'])
@Index(['branchId', 'createdAt'])
@Index(['documentNumber'])
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    // Número de documento único por sucursal y tipo
    @Column({ type: 'varchar', length: 50 })
    documentNumber!: string;

    @Column({ type: 'enum', enum: TransactionType })
    transactionType!: TransactionType;

    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.CONFIRMED })
    status!: TransactionStatus;

    // Referencias de ubicación
    @Column({ type: 'uuid' })
    branchId!: string;

    @Column({ type: 'uuid', nullable: true })
    pointOfSaleId?: string;

    @Column({ type: 'uuid', nullable: true })
    cashSessionId?: string;

    @Column({ type: 'uuid', nullable: true })
    storageId?: string;

    // Para transferencias: bodega destino
    @Column({ type: 'uuid', nullable: true })
    targetStorageId?: string;

    // Actores
    @Column({ type: 'uuid', nullable: true })
    customerId?: string;

    @Column({ type: 'uuid', nullable: true })
    supplierId?: string;

    @Column({ type: 'uuid' })
    userId!: string;

    // Montos
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    subtotal!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    taxAmount!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    discountAmount!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    total!: number;

    // Pago
    @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
    paymentMethod?: PaymentMethod;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    amountPaid?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    changeAmount?: number;

    // Referencias
    @Column({ type: 'uuid', nullable: true })
    relatedTransactionId?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    externalReference?: string;

    // Metadatos
    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    // INMUTABLE: Solo fecha de creación, no se puede modificar
    @CreateDateColumn()
    createdAt!: Date;

    // Relations
    @ManyToOne('Branch', { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'branchId' })
    branch?: Branch;

    @ManyToOne('PointOfSale', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'pointOfSaleId' })
    pointOfSale?: PointOfSale;

    @ManyToOne('CashSession', 'transactions', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'cashSessionId' })
    cashSession?: CashSession;

    @ManyToOne('Customer', 'transactions', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'customerId' })
    customer?: Customer;

    @ManyToOne('Supplier', 'transactions', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'supplierId' })
    supplier?: Supplier;

    @ManyToOne('User', { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'userId' })
    user?: User;

    @ManyToOne('Transaction', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'relatedTransactionId' })
    relatedTransaction?: Transaction;

    @OneToMany('TransactionLine', 'transaction')
    lines?: TransactionLine[];
}
