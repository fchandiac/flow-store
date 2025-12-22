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
import { Company } from "./Company";
import { Storage } from "./Storage";
import { PointOfSale } from "./PointOfSale";

@Entity("branches")
export class Branch {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    companyId!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    code?: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    address?: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone?: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'boolean', default: false })
    isHeadquarters!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => Company, company => company.branches, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'companyId' })
    company?: Company;

    @OneToMany(() => Storage, storage => storage.branch)
    storages?: Storage[];

    @OneToMany(() => PointOfSale, pos => pos.branch)
    pointsOfSale?: PointOfSale[];
}
