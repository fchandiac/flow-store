# Server Action: audits.ts

## Ubicación
`app/actions/audits.ts`

---

## Descripción

Server actions para consulta de **Audit** (Auditoría). Solo lectura.

> 📝 Los registros de auditoría se crean automáticamente via TypeORM Subscribers.

---

## Funciones

### getAudits

Obtiene registros de auditoría con filtros.

```typescript
'use server'

interface GetAuditsParams {
    userId?: string;
    action?: AuditAction;
    entityName?: string;
    entityId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

interface AuditsResponse {
    data: (Audit & { user: User })[];
    total: number;
}

export async function getAudits(params?: GetAuditsParams): Promise<AuditsResponse>
```

**Uso:**
```tsx
// Auditoría de un usuario
const { data } = await getAudits({ userId: user.id });

// Cambios a un producto específico
const { data } = await getAudits({
    entityName: 'Product',
    entityId: product.id
});

// Logins de hoy
const { data } = await getAudits({
    action: AuditAction.LOGIN,
    dateFrom: startOfToday()
});
```

---

### getAuditById

Obtiene un registro de auditoría detallado.

```typescript
interface AuditWithDetails extends Audit {
    user: User;
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
}

export async function getAuditById(id: string): Promise<AuditWithDetails | null>
```

---

### getEntityHistory

Obtiene el historial de cambios de una entidad.

```typescript
export async function getEntityHistory(
    entityName: string,
    entityId: string
): Promise<Audit[]>
```

**Uso:**
```tsx
// Ver todos los cambios a un producto
const history = await getEntityHistory('Product', product.id);
```

---

### getUserActivity

Obtiene actividad reciente de un usuario.

```typescript
interface UserActivity {
    date: Date;
    action: AuditAction;
    entityName: string;
    description: string;
}

export async function getUserActivity(
    userId: string,
    limit?: number
): Promise<UserActivity[]>
```

---

### getLoginHistory

Obtiene historial de logins.

```typescript
interface LoginRecord {
    userId: string;
    userName: string;
    loginAt: Date;
    ipAddress?: string;
    success: boolean;
}

export async function getLoginHistory(params?: {
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}): Promise<LoginRecord[]>
```

---

### getAuditSummary

Obtiene resumen de auditoría para dashboard.

```typescript
interface AuditSummary {
    totalToday: number;
    byAction: { action: AuditAction; count: number }[];
    byEntity: { entityName: string; count: number }[];
    recentLogins: LoginRecord[];
}

export async function getAuditSummary(): Promise<AuditSummary>
```

---

## Implementación

```typescript
'use server'

import { getDataSource } from '@/data/db';
import { Audit, AuditAction } from '@/data/entities/Audit';
import { User } from '@/data/entities/User';

export async function getAudits(params?: GetAuditsParams): Promise<AuditsResponse> {
    const ds = await getDataSource();
    const repo = ds.getRepository(Audit);
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    
    const qb = repo.createQueryBuilder('a')
        .leftJoinAndSelect('a.user', 'u');
    
    if (params?.userId) {
        qb.andWhere('a.userId = :userId', { userId: params.userId });
    }
    
    if (params?.action) {
        qb.andWhere('a.action = :action', { action: params.action });
    }
    
    if (params?.entityName) {
        qb.andWhere('a.entityName = :entityName', { entityName: params.entityName });
    }
    
    if (params?.entityId) {
        qb.andWhere('a.entityId = :entityId', { entityId: params.entityId });
    }
    
    if (params?.dateFrom) {
        qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: params.dateFrom });
    }
    
    if (params?.dateTo) {
        qb.andWhere('a.createdAt <= :dateTo', { dateTo: params.dateTo });
    }
    
    const [data, total] = await qb
        .orderBy('a.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    
    return { data, total };
}

export async function getAuditById(id: string): Promise<AuditWithDetails | null> {
    const ds = await getDataSource();
    
    const audit = await ds.getRepository(Audit).findOne({
        where: { id },
        relations: ['user']
    });
    
    if (!audit) return null;
    
    // Calcular cambios si es UPDATE
    let changes: { field: string; oldValue: any; newValue: any }[] | undefined;
    
    if (audit.action === AuditAction.UPDATE && audit.previousData && audit.newData) {
        changes = [];
        const allKeys = new Set([
            ...Object.keys(audit.previousData),
            ...Object.keys(audit.newData)
        ]);
        
        for (const key of allKeys) {
            const oldValue = audit.previousData[key];
            const newValue = audit.newData[key];
            
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({ field: key, oldValue, newValue });
            }
        }
    }
    
    return { ...audit, changes };
}

export async function getEntityHistory(
    entityName: string,
    entityId: string
): Promise<Audit[]> {
    const ds = await getDataSource();
    
    return await ds.getRepository(Audit).find({
        where: { entityName, entityId },
        relations: ['user'],
        order: { createdAt: 'DESC' }
    });
}

export async function getLoginHistory(params?: {
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}): Promise<LoginRecord[]> {
    const ds = await getDataSource();
    
    const qb = ds.getRepository(Audit)
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.user', 'u')
        .where('a.action = :action', { action: AuditAction.LOGIN });
    
    if (params?.userId) {
        qb.andWhere('a.userId = :userId', { userId: params.userId });
    }
    
    if (params?.dateFrom) {
        qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: params.dateFrom });
    }
    
    if (params?.dateTo) {
        qb.andWhere('a.createdAt <= :dateTo', { dateTo: params.dateTo });
    }
    
    const audits = await qb
        .orderBy('a.createdAt', 'DESC')
        .take(100)
        .getMany();
    
    return audits.map(a => ({
        userId: a.userId,
        userName: a.user?.userName ?? 'Unknown',
        loginAt: a.createdAt,
        ipAddress: a.ipAddress,
        success: a.metadata?.success ?? true
    }));
}
```

---

## Registro Automático de Auditoría

Los registros se crean automáticamente con TypeORM Subscribers:

```typescript
// data/subscribers/AuditSubscriber.ts
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
    constructor(dataSource: DataSource) {
        dataSource.subscribers.push(this);
    }

    afterInsert(event: InsertEvent<any>) {
        this.logAudit(event, AuditAction.CREATE);
    }

    afterUpdate(event: UpdateEvent<any>) {
        this.logAudit(event, AuditAction.UPDATE);
    }

    afterSoftRemove(event: SoftRemoveEvent<any>) {
        this.logAudit(event, AuditAction.DELETE);
    }

    private async logAudit(event: any, action: AuditAction) {
        // Implementación...
    }
}
```
