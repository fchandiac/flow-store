import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn
} from "typeorm";

/**
 * Entidad para registrar el precio histórico del oro.
 */
@Entity("gold_prices")
export class GoldPrice {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'datetime' })
    date!: Date;

    @Column({ type: 'decimal', precision: 18, scale: 2 })
    valueCLP!: number;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}
