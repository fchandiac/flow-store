import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { CashSession, CashSessionStatus } from '../../../../data/entities/CashSession';
import { PointOfSale } from '../../../../data/entities/PointOfSale';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '../../../../data/entities/Transaction';
import { User } from '../../../../data/entities/User';
import { SerializedTransaction, serializeTransaction } from './saleService';

export interface CashSessionOpeningTransactionParams {
  cashSession: CashSession;
  pointOfSale: PointOfSale;
  user: User;
  openingAmount: number;
}

export async function persistCashSessionOpeningTransaction(
  manager: EntityManager,
  params: CashSessionOpeningTransactionParams,
): Promise<SerializedTransaction> {
  const { cashSession, pointOfSale, user } = params;
  const openingAmount = sanitizeAmount(params.openingAmount);
  const transactionRepo = manager.getRepository(Transaction);
  const cashSessionRepo = manager.getRepository(CashSession);

  const documentNumber = buildCashSessionDocumentNumber(cashSession.openedAt ?? new Date(), pointOfSale);

  const transaction = transactionRepo.create({
    documentNumber,
    transactionType: TransactionType.CASH_SESSION_OPENING,
    status: TransactionStatus.CONFIRMED,
    branchId: pointOfSale.branchId ?? null,
    pointOfSaleId: pointOfSale.id,
    cashSessionId: cashSession.id,
    userId: cashSession.openedById ?? user.id,
    subtotal: openingAmount,
    taxAmount: 0,
    discountAmount: 0,
    total: openingAmount,
    paymentMethod: PaymentMethod.CASH,
    metadata: buildOpeningMetadata({ cashSession, pointOfSale, user, openingAmount }),
  });

  const saved = await transactionRepo.save(transaction);

  cashSession.openingAmount = openingAmount;
  cashSession.expectedAmount = openingAmount;
  await cashSessionRepo.save(cashSession);

  return serializeTransaction(saved);
}

function sanitizeAmount(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Number(value.toFixed(2));
}

export interface CashSessionWithdrawalParams {
  cashSession: CashSession;
  pointOfSale: PointOfSale;
  user: User;
  amount: number;
  reason?: string;
}

export interface CashSessionWithdrawalResult {
  transaction: SerializedTransaction;
  expectedAmount: number;
}

export class CashSessionMovementError extends Error {}

export async function persistCashSessionWithdrawalTransaction(
  manager: EntityManager,
  params: CashSessionWithdrawalParams,
): Promise<CashSessionWithdrawalResult> {
  if (params.cashSession.status !== CashSessionStatus.OPEN) {
    throw new CashSessionMovementError('La sesión de caja debe estar abierta.');
  }

  if (
    params.cashSession.pointOfSaleId &&
    params.cashSession.pointOfSaleId !== params.pointOfSale.id
  ) {
    throw new CashSessionMovementError('La sesión de caja no pertenece al punto de venta indicado.');
  }

  const amount = sanitizeAmount(params.amount);
  if (amount <= 0) {
    throw new CashSessionMovementError('El monto a retirar debe ser mayor a 0.');
  }

  const documentNumber = buildCashSessionWithdrawalDocumentNumber(new Date(), params.pointOfSale);

  const transactionRepo = manager.getRepository(Transaction);
  const cashSessionRepo = manager.getRepository(CashSession);

  const metadataPayload = {
    cashSessionId: params.cashSession.id,
    pointOfSaleId: params.pointOfSale.id,
    pointOfSaleName: params.pointOfSale.name,
    withdrawalReason: params.reason?.trim() || null,
    movementSource: 'mobile-backend',
  };

  const transaction = transactionRepo.create({
    transactionType: TransactionType.CASH_SESSION_WITHDRAWAL,
    status: TransactionStatus.CONFIRMED,
    branchId: params.pointOfSale.branchId ?? null,
    pointOfSaleId: params.pointOfSale.id,
    cashSessionId: params.cashSession.id,
    userId: params.user.id,
    documentNumber,
    paymentMethod: PaymentMethod.CASH,
    subtotal: amount,
    discountAmount: 0,
    taxAmount: 0,
    total: amount,
    notes: params.reason?.trim() || null,
    metadata: JSON.parse(JSON.stringify(metadataPayload)),
  });

  const savedTransaction = await transactionRepo.save(transaction);

  const expectedAmount = await recomputeCashSessionExpectedAmount(manager, params.cashSession);
  params.cashSession.expectedAmount = expectedAmount;
  await cashSessionRepo.save(params.cashSession);

  return {
    transaction: serializeTransaction(savedTransaction),
    expectedAmount,
  };
}

export interface CashSessionDepositParams {
  cashSession: CashSession;
  pointOfSale: PointOfSale;
  user: User;
  amount: number;
  reason?: string;
}

export interface CashSessionDepositResult {
  transaction: SerializedTransaction;
  expectedAmount: number;
}

export async function persistCashSessionDepositTransaction(
  manager: EntityManager,
  params: CashSessionDepositParams,
): Promise<CashSessionDepositResult> {
  if (params.cashSession.status !== CashSessionStatus.OPEN) {
    throw new CashSessionMovementError('La sesión de caja debe estar abierta.');
  }

  if (params.cashSession.pointOfSaleId && params.cashSession.pointOfSaleId !== params.pointOfSale.id) {
    throw new CashSessionMovementError('La sesión de caja no pertenece al punto de venta indicado.');
  }

  const amount = sanitizeAmount(params.amount);
  if (amount <= 0) {
    throw new CashSessionMovementError('El monto a ingresar debe ser mayor a 0.');
  }

  const documentNumber = buildCashSessionDepositDocumentNumber(new Date(), params.pointOfSale);

  const transactionRepo = manager.getRepository(Transaction);
  const cashSessionRepo = manager.getRepository(CashSession);

  const metadataPayload = {
    cashSessionId: params.cashSession.id,
    pointOfSaleId: params.pointOfSale.id,
    pointOfSaleName: params.pointOfSale.name,
    depositReason: params.reason?.trim() || null,
    movementSource: 'mobile-backend',
  };

  const transaction = transactionRepo.create({
    transactionType: TransactionType.CASH_SESSION_DEPOSIT,
    status: TransactionStatus.CONFIRMED,
    branchId: params.pointOfSale.branchId ?? null,
    pointOfSaleId: params.pointOfSale.id,
    cashSessionId: params.cashSession.id,
    userId: params.user.id,
    documentNumber,
    paymentMethod: PaymentMethod.CASH,
    subtotal: amount,
    discountAmount: 0,
    taxAmount: 0,
    total: amount,
    notes: params.reason?.trim() || null,
    metadata: JSON.parse(JSON.stringify(metadataPayload)),
  });

  const savedTransaction = await transactionRepo.save(transaction);

  const expectedAmount = await recomputeCashSessionExpectedAmount(manager, params.cashSession);
  params.cashSession.expectedAmount = expectedAmount;
  await cashSessionRepo.save(params.cashSession);

  return {
    transaction: serializeTransaction(savedTransaction),
    expectedAmount,
  };
}

async function recomputeCashSessionExpectedAmount(
  manager: EntityManager,
  cashSession: CashSession,
): Promise<number> {
  const transactionRepo = manager.getRepository(Transaction);
  const transactions = await transactionRepo.find({
    where: {
      cashSessionId: cashSession.id,
      status: TransactionStatus.CONFIRMED,
    },
  });

  let cashIn = 0;
  let cashOut = 0;

  for (const tx of transactions) {
    const total = Number(tx.total) || 0;
    switch (tx.transactionType) {
      case TransactionType.SALE:
      case TransactionType.PAYMENT_IN:
        cashIn += total;
        break;
      case TransactionType.CASH_SESSION_DEPOSIT:
        cashIn += total;
        break;
      case TransactionType.SALE_RETURN:
      case TransactionType.PAYMENT_OUT:
      case TransactionType.OPERATING_EXPENSE:
      case TransactionType.CASH_DEPOSIT:
      case TransactionType.CASH_SESSION_WITHDRAWAL:
        cashOut += total;
        break;
      default:
        break;
    }
  }

  const opening = Number(cashSession.openingAmount) || 0;
  const expected = opening + cashIn - cashOut;
  return Number(expected.toFixed(2));
}

function buildOpeningMetadata(params: {
  cashSession: CashSession;
  pointOfSale: PointOfSale;
  user: User;
  openingAmount: number;
}): Record<string, any> {
  return {
    cashSessionId: params.cashSession.id,
    cashSessionOpenedAt: (params.cashSession.openedAt ?? new Date()).toISOString(),
    openingAmount: params.openingAmount,
    pointOfSaleId: params.pointOfSale.id,
    pointOfSaleName: params.pointOfSale.name,
    branchId: params.pointOfSale.branchId ?? null,
    openedByUserId: params.cashSession.openedById ?? params.user.id,
    openedByUserName: params.user.userName,
  };
}

function buildCashSessionDocumentNumber(openedAt: Date, pointOfSale: PointOfSale): string {
  const processedDate = openedAt instanceof Date ? openedAt : new Date(openedAt);
  const iso = processedDate.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const suffixSource = (pointOfSale.deviceId ?? pointOfSale.name ?? pointOfSale.id)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(-6);
  const randomSegment = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  const parts = ['CSO', iso];
  if (suffixSource.length > 0) {
    parts.push(suffixSource);
  }
  parts.push(randomSegment);
  return parts.join('-');
}

function buildCashSessionWithdrawalDocumentNumber(now: Date, pointOfSale: PointOfSale): string {
  const iso = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const suffixSource = (pointOfSale.deviceId ?? pointOfSale.name ?? pointOfSale.id)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(-6);
  const randomSegment = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  const parts = ['CSW', iso];
  if (suffixSource.length > 0) {
    parts.push(suffixSource);
  }
  parts.push(randomSegment);
  return parts.join('-');
}

function buildCashSessionDepositDocumentNumber(now: Date, pointOfSale: PointOfSale): string {
  const iso = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const suffixSource = (pointOfSale.deviceId ?? pointOfSale.name ?? pointOfSale.id)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(-6);
  const randomSegment = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  const parts = ['CSD', iso];
  if (suffixSource.length > 0) {
    parts.push(suffixSource);
  }
  parts.push(randomSegment);
  return parts.join('-');
}
