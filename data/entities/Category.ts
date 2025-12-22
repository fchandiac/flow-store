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

@Entity("categories")
export class Category {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'uuid', nullable: true })
    parentId?: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
    code?: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'int', default: 0 })
    sortOrder!: number;

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

    // Self-referential relation for hierarchy
    @ManyToOne('Category', 'children', { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'parentId' })
    parent?: Category;

    @OneToMany('Category', 'parent')
    children?: Category[];
}
