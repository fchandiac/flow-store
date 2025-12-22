import "reflect-metadata";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
} from "typeorm";
import type { PriceListItem } from "./PriceListItem";

export enum PriceListType {
    RETAIL = 'RETAIL',
    WHOLESALE = 'WHOLESALE',
    VIP = 'VIP',
    PROMOTIONAL = 'PROMOTIONAL',
}

@Entity("price_lists")
export class PriceList {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
    code?: string;

    @Column({ type: 'enum', enum: PriceListType, default: PriceListType.RETAIL })
    priceListType!: PriceListType;

    @Column({ type: 'varchar', length: 10, default: 'CLP' })
    currency!: string;

    @Column({ type: 'date', nullable: true })
    validFrom?: Date;

    @Column({ type: 'date', nullable: true })
    validUntil?: Date;

    @Column({ type: 'int', default: 0 })
    priority!: number;

    @Column({ type: 'boolean', default: false })
    isDefault!: boolean;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @OneToMany('PriceListItem', 'priceList')
    items?: PriceListItem[];
}
