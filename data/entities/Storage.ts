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
import { Branch } from "./Branch";

export enum StorageType {
    WAREHOUSE = 'WAREHOUSE',
    STORE = 'STORE',
    COLD_ROOM = 'COLD_ROOM',
    TRANSIT = 'TRANSIT',
}

export enum StorageCategory {
    IN_BRANCH = 'IN_BRANCH',
    CENTRAL = 'CENTRAL',
    EXTERNAL = 'EXTERNAL',
}

@Entity("storages")
export class Storage {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    branchId?: string | null;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    code?: string;

    @Column({ type: 'enum', enum: StorageType, default: StorageType.WAREHOUSE })
    type!: StorageType;

    @Column({ type: 'enum', enum: StorageCategory, default: StorageCategory.IN_BRANCH })
    category!: StorageCategory;

    @Column({ type: 'int', nullable: true })
    capacity?: number;

    @Column({ type: 'varchar', length: 500, nullable: true })
    location?: string;

    @Column({ type: 'boolean', default: false })
    isDefault!: boolean;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'branchId' })
    branch?: Branch;
}
