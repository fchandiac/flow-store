import assert from 'node:assert/strict';

export enum TransactionRelationType {
  RECEPTION_PACK = 'RECEPTION_PACK',
  TRAY_RECEPTION = 'TRAY_RECEPTION',
  TRAY_DEVOLUTION = 'TRAY_DEVOLUTION',
  PALLET_ASSIGNMENT = 'PALLET_ASSIGNMENT',
}

export type PalletMetadata = Array<{ receptionPackId: string; trayId: string; quantity: number; }> | null;

interface ReceptionTransactionExpectations {
  amount: number;
  exchangeRate?: number;
  totalCLPToPay?: number;
  payableCLP?: number;
  payableUSD?: number;
}

type Queryable = { query: (...params: any[]) => Promise<any> };

const normalizeRows = <T = any>(result: any): T[] => {
  if (Array.isArray(result)) {
    if (result.length >= 1 && Array.isArray(result[0])) {
      return result[0] as T[];
    }
    return result as T[];
  }
  if (result === null || result === undefined) {
    return [];
  }
  return [result as T];
};

export const assertReceptionTransaction = async (
  db: Queryable,
  receptionId: string,
  expectations: ReceptionTransactionExpectations,
) => {
  const rawResult = await db.query(
    `SELECT id, type, direction, unit, amount, metadata
     FROM transactions
     WHERE id = ?`,
    [receptionId],
  );
  const rows = normalizeRows<{ id: string; type: string; direction: string; unit: string; amount: number; metadata: any }>(rawResult);
  const row = rows[0];

  assert(row, `No se encontró transacción RECEPTION con id ${receptionId}`);
  assert.equal(row.type, 'RECEPTION');
  assert.equal(row.direction, 'OUT');
  assert.equal(row.unit, 'CLP');
  assert.equal(Number(row.amount), Number(expectations.amount), 'El monto de la recepción no coincide');

  const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata ?? {};
  if (expectations.exchangeRate !== undefined) {
    assert.equal(Number(metadata.exchangeRate), Number(expectations.exchangeRate), 'El exchangeRate no coincide');
  }
  if (expectations.totalCLPToPay !== undefined) {
    assert.equal(Number(metadata.totalCLPToPay), Number(expectations.totalCLPToPay), 'El totalCLPToPay en metadata no coincide');
  }
  const totals = metadata?.totals ?? {};
  if (expectations.payableCLP !== undefined) {
    assert.equal(Number(totals.payableCLP ?? 0), Number(expectations.payableCLP), 'total payableCLP incorrecto');
  }
  if (expectations.payableUSD !== undefined) {
    assert.equal(Number(totals.payableUSD ?? 0), Number(expectations.payableUSD), 'total payableUSD incorrecto');
  }

  return metadata;
};

export const assertReceptionPackCount = async (
  db: Queryable,
  receptionId: string,
  expectedCount: number,
) => {
  const rawResult = await db.query(
    'SELECT id, palletAssignments, traysQuantity FROM reception_packs WHERE receptionTransactionId = ?',
    [receptionId],
  );
  const packs = normalizeRows<{ id: number; palletAssignments: unknown; traysQuantity: number }>(rawResult);
  assert.equal(packs.length, expectedCount, `Se esperaban ${expectedCount} packs, se obtuvieron ${packs.length}`);
  return packs.map((row) => ({
    ...row,
    palletAssignments: typeof row.palletAssignments === 'string' ? JSON.parse(row.palletAssignments) : row.palletAssignments,
  }));
};

export const assertRelationCounts = async (
  db: Queryable,
  receptionId: string,
  expectations: Partial<Record<TransactionRelationType, number>>,
) => {
  const rawResult = await db.query(
    `SELECT relationType, COUNT(*) as count
     FROM transaction_relations
     WHERE parentTransactionId = ?
     GROUP BY relationType`,
    [receptionId],
  );
  const relationRows = normalizeRows<{ relationType: string; count: string | number }>(rawResult);

  const counts = relationRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.relationType] = Number(row.count);
    return acc;
  }, {});

  for (const [relationType, expectedCount] of Object.entries(expectations)) {
    const found = counts[relationType] ?? 0;
    assert.equal(found, expectedCount, `Relation ${relationType} esperada ${expectedCount}, encontrada ${found}`);
  }

  return counts;
};

export const fetchChildTransactionsByRelation = async (
  db: Queryable,
  receptionId: string,
  relationType: TransactionRelationType,
) => {
  const rawResult = await db.query(
    `SELECT t.*
     FROM transactions t
     INNER JOIN transaction_relations tr ON tr.childTransactionId = t.id
     WHERE tr.parentTransactionId = ? AND tr.relationType = ?
     ORDER BY t.id ASC`,
    [receptionId, relationType],
  );
  const transactions = normalizeRows<Record<string, any>>(rawResult);

  return transactions.map((row) => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata ?? {},
    amount: Number(row.amount),
  }));
};

export const assertPalletState = async (
  db: Queryable,
  palletId: number,
  expectations: { traysQuantity: number; metadataLength?: number; receptionPackId?: string; quantityAssigned?: number; },
) => {
  const rawResult = await db.query(
    'SELECT id, traysQuantity, metadata FROM pallets WHERE id = ?',
    [palletId],
  );
  const rows = normalizeRows<{ id: number; traysQuantity: number; metadata: unknown }>(rawResult);
  const row = rows[0];

  assert(row, `No se encontró pallet ${palletId}`);
  assert.equal(Number(row.traysQuantity), expectations.traysQuantity, `Cantidad de bandejas incorrecta para pallet ${palletId}`);

  const metadata: PalletMetadata = row.metadata
    ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
    : null;

  if (expectations.metadataLength !== undefined) {
    const length = Array.isArray(metadata) ? metadata.length : 0;
    assert.equal(length, expectations.metadataLength, `metadata del pallet ${palletId} tiene longitud ${length}, no ${expectations.metadataLength}`);
  }

  if (expectations.receptionPackId !== undefined) {
    const match = Array.isArray(metadata)
      ? metadata.find((item) => item.receptionPackId === expectations.receptionPackId)
      : null;
    assert(match, `No se encontró metadata con receptionPackId ${expectations.receptionPackId} en pallet ${palletId}`);
    if (match && expectations.quantityAssigned !== undefined) {
      assert.equal(Number(match.quantity), Number(expectations.quantityAssigned), `Cantidad asignada incorrecta en pallet ${palletId}`);
    }
  }

  return { ...row, metadata };
};
