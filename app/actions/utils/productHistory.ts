import { randomUUID } from 'crypto';
import type {
    Product,
    ProductChangeHistoryAction,
    ProductChangeHistoryChange,
    ProductChangeHistoryEntry,
    ProductChangeHistoryTargetType,
} from '@/data/entities/Product';

const MAX_HISTORY_ENTRIES = 50;

type Serializable = ProductChangeHistoryChange['previousValue'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeHistoryValue(value: Serializable): Serializable {
    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeHistoryValue(item as Serializable));
    }

    if (isPlainObject(value)) {
        const entries = Object.entries(value).map(([key, val]) => [key, sanitizeHistoryValue(val as Serializable)]);
        return Object.fromEntries(entries);
    }

    return value;
}

export function areValuesEqual(a: Serializable, b: Serializable): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        const normalizedA = [...a].map((item) => JSON.stringify(sanitizeHistoryValue(item as Serializable))).sort();
        const normalizedB = [...b].map((item) => JSON.stringify(sanitizeHistoryValue(item as Serializable))).sort();
        return normalizedA.every((value, index) => value === normalizedB[index]);
    }

    if (isPlainObject(a) && isPlainObject(b)) {
        return JSON.stringify(sanitizeHistoryValue(a)) === JSON.stringify(sanitizeHistoryValue(b));
    }

    if (a === undefined || b === undefined) {
        return a === b;
    }

    return sanitizeHistoryValue(a) === sanitizeHistoryValue(b);
}

export interface BuildHistoryEntryParams {
    action: ProductChangeHistoryAction;
    targetType: ProductChangeHistoryTargetType;
    targetId: string;
    targetLabel?: string;
    summary: string;
    userId?: string;
    userName?: string;
    changes?: ProductChangeHistoryChange[];
    metadata?: Record<string, unknown>;
    timestamp?: string;
}

export function buildHistoryEntry(params: BuildHistoryEntryParams): ProductChangeHistoryEntry {
    const {
        action,
        targetType,
        targetId,
        targetLabel,
        summary,
        userId,
        userName,
        changes,
        metadata,
        timestamp,
    } = params;

    const sanitizedChanges = Array.isArray(changes)
        ? changes
            .filter((change) => change && typeof change.field === 'string' && change.field.length > 0)
            .map((change) => ({
                field: change.field,
                previousValue: change.previousValue !== undefined ? sanitizeHistoryValue(change.previousValue) : undefined,
                newValue: change.newValue !== undefined ? sanitizeHistoryValue(change.newValue) : undefined,
            }))
        : undefined;

    return {
        id: randomUUID(),
        timestamp: timestamp ?? new Date().toISOString(),
        targetType,
        targetId,
        targetLabel,
        action,
        summary,
        userId,
        userName,
        changes: sanitizedChanges && sanitizedChanges.length > 0 ? sanitizedChanges : undefined,
        metadata: metadata ? sanitizeHistoryValue(metadata) as Record<string, unknown> : undefined,
    };
}

export function addHistoryEntry(product: Product, entry: ProductChangeHistoryEntry, maxEntries: number = MAX_HISTORY_ENTRIES): void {
    const history = Array.isArray(product.changeHistory) ? [...product.changeHistory] : [];
    history.push(entry);

    if (history.length > maxEntries) {
        history.splice(0, history.length - maxEntries);
    }

    product.changeHistory = history;
}

export function buildSummary(
    action: ProductChangeHistoryAction,
    targetType: ProductChangeHistoryTargetType,
    targetLabel?: string,
    fields?: string[]
): string {
    const label = targetLabel ? ` "${targetLabel}"` : '';
    if (action === 'CREATE') {
        return `Creación de ${targetType === 'PRODUCT' ? 'producto' : 'variante'}${label}`;
    }
    if (action === 'DELETE') {
        return `Eliminación de ${targetType === 'PRODUCT' ? 'producto' : 'variante'}${label}`;
    }

    const fieldList = Array.isArray(fields) && fields.length > 0 ? ` (campos: ${fields.join(', ')})` : '';
    return `Actualización de ${targetType === 'PRODUCT' ? 'producto' : 'variante'}${label}${fieldList}`;
}
