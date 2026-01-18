import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  CashSession,
  CashSessionClosingDetails,
  CashSessionStatus,
  CashSessionTenderBreakdown,
} from '../../../../data/entities/CashSession';
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

  const transaction = transactionRepo.create();
  transaction.documentNumber = documentNumber;
  transaction.transactionType = TransactionType.CASH_SESSION_OPENING;
  transaction.status = TransactionStatus.CONFIRMED;
  transaction.branchId = pointOfSale.branchId ?? null;
  transaction.pointOfSaleId = pointOfSale.id;
  transaction.cashSessionId = cashSession.id;
  transaction.userId = cashSession.openedById ?? user.id;
  transaction.subtotal = openingAmount;
  transaction.taxAmount = 0;
  transaction.discountAmount = 0;
  transaction.total = openingAmount;
  transaction.paymentMethod = PaymentMethod.CASH;
  transaction.metadata = buildOpeningMetadata({ cashSession, pointOfSale, user, openingAmount });

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

  const transaction = transactionRepo.create();
  transaction.transactionType = TransactionType.CASH_SESSION_WITHDRAWAL;
  transaction.status = TransactionStatus.CONFIRMED;
  transaction.branchId = params.pointOfSale.branchId ?? null;
  transaction.pointOfSaleId = params.pointOfSale.id;
  transaction.cashSessionId = params.cashSession.id;
  transaction.userId = params.user.id;
  transaction.documentNumber = documentNumber;
  transaction.paymentMethod = PaymentMethod.CASH;
  transaction.subtotal = amount;
  transaction.discountAmount = 0;
  transaction.taxAmount = 0;
  transaction.total = amount;
  transaction.notes = params.reason?.trim() || null;
  transaction.metadata = JSON.parse(JSON.stringify(metadataPayload));

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

  const transaction = transactionRepo.create();
  transaction.transactionType = TransactionType.CASH_SESSION_DEPOSIT;
  transaction.status = TransactionStatus.CONFIRMED;
  transaction.branchId = params.pointOfSale.branchId ?? null;
  transaction.pointOfSaleId = params.pointOfSale.id;
  transaction.cashSessionId = params.cashSession.id;
  transaction.userId = params.user.id;
  transaction.documentNumber = documentNumber;
  transaction.paymentMethod = PaymentMethod.CASH;
  transaction.subtotal = amount;
  transaction.discountAmount = 0;
  transaction.taxAmount = 0;
  transaction.total = amount;
  transaction.notes = params.reason?.trim() || null;
  transaction.metadata = JSON.parse(JSON.stringify(metadataPayload));

  const savedTransaction = await transactionRepo.save(transaction);

  const expectedAmount = await recomputeCashSessionExpectedAmount(manager, params.cashSession);
  params.cashSession.expectedAmount = expectedAmount;
  await cashSessionRepo.save(params.cashSession);

  return {
    transaction: serializeTransaction(savedTransaction),
    expectedAmount,
  };
}

export class CashSessionClosingError extends Error {}

export interface CashSessionClosingParams {
  cashSession: CashSession;
  pointOfSale: PointOfSale;
  user: User;
  actualCash: number;
  voucherDebitAmount: number;
  voucherCreditAmount: number;
  transferAmount?: number;
  checkAmount?: number;
  otherAmount?: number;
  notes?: string | null;
}

export interface CashSessionClosingResult {
  cashSession: CashSession;
  expected: CashSessionTenderBreakdown;
  actual: CashSessionTenderBreakdown;
  difference: {
    cash: number;
    total: number;
  };
}

export async function persistCashSessionClosing(
  manager: EntityManager,
  params: CashSessionClosingParams,
): Promise<CashSessionClosingResult> {
  if (params.cashSession.status !== CashSessionStatus.OPEN) {
    throw new CashSessionClosingError('La sesión de caja ya se encuentra cerrada.');
  }

  if (
    params.cashSession.pointOfSaleId &&
    params.cashSession.pointOfSaleId !== params.pointOfSale.id
  ) {
    throw new CashSessionClosingError('La sesión de caja no corresponde al punto de venta indicado.');
  }

  const actualCash = sanitizeAmount(params.actualCash);
  if (!Number.isFinite(actualCash) || actualCash < 0) {
    throw new CashSessionClosingError('El monto de efectivo contado debe ser mayor o igual a 0.');
  }

  const actualBreakdown: CashSessionTenderBreakdown = {
    cash: actualCash,
    debitCard: sanitizeAmount(params.voucherDebitAmount ?? 0),
    creditCard: sanitizeAmount(params.voucherCreditAmount ?? 0),
    transfer: sanitizeAmount(params.transferAmount ?? 0),
    check: sanitizeAmount(params.checkAmount ?? 0),
    other: sanitizeAmount(params.otherAmount ?? 0),
  };

  const expectedCash = await recomputeCashSessionExpectedAmount(manager, params.cashSession);
  params.cashSession.expectedAmount = expectedCash;

  const expectedBreakdown = await computeCashSessionTenderBreakdown(
    manager,
    params.cashSession,
    expectedCash,
  );

  const cashDifference = Number((actualBreakdown.cash - expectedBreakdown.cash).toFixed(2));
  const totalActual =
    actualBreakdown.cash +
    actualBreakdown.debitCard +
    actualBreakdown.creditCard +
    actualBreakdown.transfer +
    actualBreakdown.check +
    actualBreakdown.other;
  const totalExpected =
    expectedBreakdown.cash +
    expectedBreakdown.debitCard +
    expectedBreakdown.creditCard +
    expectedBreakdown.transfer +
    expectedBreakdown.check +
    expectedBreakdown.other;
  const totalDifference = Number((totalActual - totalExpected).toFixed(2));

  const requiresExplanation = Math.abs(cashDifference) >= 0.01;
  const normalizedNotes = params.notes?.trim() ?? null;

  if (requiresExplanation && (!normalizedNotes || normalizedNotes.length < 3)) {
    throw new CashSessionClosingError(
      'Debes ingresar una nota explicando la diferencia detectada en efectivo.',
    );
  }

  const now = new Date();

  params.cashSession.status = CashSessionStatus.CLOSED;
  params.cashSession.closedById = params.user.id;
  params.cashSession.closedAt = now;
  params.cashSession.closingAmount = actualBreakdown.cash;
  params.cashSession.difference = cashDifference;
  if (normalizedNotes) {
    params.cashSession.notes = [params.cashSession.notes, normalizedNotes]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value!.trim())
      .join('\n');
  }

  const closingDetails: CashSessionClosingDetails = {
    countedByUserId: params.user.id,
    countedByUserName: params.user.userName ?? null,
    countedAt: now.toISOString(),
    notes: normalizedNotes,
    actual: actualBreakdown,
    expected: expectedBreakdown,
    difference: {
      cash: cashDifference,
      total: totalDifference,
    },
  };

  params.cashSession.closingDetails = closingDetails;

  const cashSessionRepo = manager.getRepository(CashSession);
  await cashSessionRepo.save(params.cashSession);

  return {
    cashSession: params.cashSession,
    actual: actualBreakdown,
    expected: expectedBreakdown,
    difference: {
      cash: cashDifference,
      total: totalDifference,
    },
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

async function computeCashSessionTenderBreakdown(
  manager: EntityManager,
  cashSession: CashSession,
  expectedCash: number,
): Promise<CashSessionTenderBreakdown> {
  const transactionRepo = manager.getRepository(Transaction);
  const transactions = await transactionRepo.find({
    where: {
      cashSessionId: cashSession.id,
      status: TransactionStatus.CONFIRMED,
    },
  });

  const breakdown: CashSessionTenderBreakdown = {
    cash: expectedCash,
    debitCard: 0,
    creditCard: 0,
    transfer: 0,
    check: 0,
    other: 0,
  };

  for (const tx of transactions) {
    if (!tx.paymentMethod) {
      continue;
    }

    const total = Number(tx.total) || 0;

    switch (tx.paymentMethod) {
      case PaymentMethod.DEBIT_CARD:
        breakdown.debitCard = Number((breakdown.debitCard + total).toFixed(2));
        break;
      case PaymentMethod.CREDIT_CARD:
        breakdown.creditCard = Number((breakdown.creditCard + total).toFixed(2));
        break;
      case PaymentMethod.TRANSFER:
        breakdown.transfer = Number((breakdown.transfer + total).toFixed(2));
        break;
      case PaymentMethod.CHECK:
        breakdown.check = Number((breakdown.check + total).toFixed(2));
        break;
      case PaymentMethod.CASH:
        // Already represented in expected cash calculation.
        break;
      default:
        breakdown.other = Number((breakdown.other + total).toFixed(2));
        break;
    }
  }

  return breakdown;
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
