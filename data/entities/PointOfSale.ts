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
import { Branch } from "./Branch";
import { CashSession } from "./CashSession";

@Entity("points_of_sale")
export class PointOfSale {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid' })
    branchId!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    code?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    deviceId?: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;

    // Relations
    @ManyToOne(() => Branch, branch => branch.pointsOfSale, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'branchId' })
    branch?: Branch;

    @OneToMany(() => CashSession, session => session.pointOfSale)
    cashSessions?: CashSession[];
}
