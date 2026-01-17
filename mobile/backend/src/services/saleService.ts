import { EntityManager, In } from 'typeorm';
import { PointOfSale } from '../../../../data/entities/PointOfSale';
import { CashSession, CashSessionStatus } from '../../../../data/entities/CashSession';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '../../../../data/entities/Transaction';
import { TransactionLine } from '../../../../data/entities/TransactionLine';
import { ProductVariant } from '../../../../data/entities/ProductVariant';
import { Product } from '../../../../data/entities/Product';
import { Tax } from '../../../../data/entities/Tax';
import { User } from '../../../../data/entities/User';

export interface SaleLineInput {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxId?: string;
  taxRate?: number;
  taxAmount?: number;
  notes?: string;
  unitCost?: number;
}

export interface CreateSaleTransactionParams {
  pointOfSale: PointOfSale;
  cashSession: CashSession;
  user: User;
  paymentMethod: PaymentMethod;
  lines: SaleLineInput[];
  customerId?: string;
  documentNumber?: string;
  externalReference?: string;
  notes?: string;
  metadata?: Record<string, any> | null;
  amountPaid?: number;
  changeAmount?: number;
  bankAccountKey?: string | null;
  storageId?: string;
}

export interface SaleTransactionResult {
  transaction: SerializedTransaction;
  lines: SerializedTransactionLine[];
}

interface VariantWithProduct extends ProductVariant {
  product?: Product;
}

export interface SerializedTransaction {
  id: string;
  documentNumber: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  branchId?: string | null;
  pointOfSaleId?: string | null;
  cashSessionId?: string | null;
  customerId?: string | null;
  userId: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  bankAccountKey?: string | null;
  amountPaid?: number | null;
  changeAmount?: number | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  externalReference?: string | null;
}

export interface SerializedTransactionLine {
  id: string;
  transactionId?: string;
  productId: string;
  productVariantId?: string;
  lineNumber: number;
  productName: string;
  productSku: string;
  variantName?: string | null;
  quantity: number;
  quantityInBase?: number | null;
  unitOfMeasure?: string | null;
  unitId?: string | null;
  unitConversionFactor?: number | null;
  unitPrice: number;
  unitCost?: number | null;
  discountPercentage: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  notes?: string | null;
  createdAt: Date;
}

export class SaleCreationError extends Error {}

export async function createSaleTransaction(
  manager: EntityManager,
  params: CreateSaleTransactionParams,
): Promise<SaleTransactionResult> {
  if (!params.lines || params.lines.length === 0) {
    throw new SaleCreationError('La venta debe incluir al menos una línea.');
  }

  if (params.cashSession.status !== CashSessionStatus.OPEN) {
    throw new SaleCreationError('La sesión de caja debe estar abierta para registrar la venta.');
  }

  if (params.cashSession.pointOfSaleId && params.cashSession.pointOfSaleId !== params.pointOfSale.id) {
    throw new SaleCreationError('La sesión de caja no corresponde al punto de venta indicado.');
  }

  const variantIds = params.lines.map((line) => line.productVariantId).filter(Boolean);
  if (variantIds.length === 0) {
    throw new SaleCreationError('Cada línea de venta debe indicar un productVariantId.');
  }

  const variantRepo = manager.getRepository(ProductVariant);
  const variants = await variantRepo.find({
    where: { id: In(variantIds) },
    relations: ['product'],
  });

  const variantMap = new Map<string, VariantWithProduct>();
  for (const variant of variants) {
    variantMap.set(variant.id, variant as VariantWithProduct);
  }

  if (variantMap.size !== variantIds.length) {
    const missingIds = variantIds.filter((id) => !variantMap.has(id));
    throw new SaleCreationError(`No se encontraron las variantes de producto: ${missingIds.join(', ')}.`);
  }

  const taxIds = Array.from(
    new Set(
      params.lines
        .map((line) => line.taxId)
        .filter((taxId): taxId is string => Boolean(taxId)),
    ),
  );

  const taxMap = new Map<string, Tax>();
  if (taxIds.length > 0) {
    const taxRepo = manager.getRepository(Tax);
    const taxes = await taxRepo.find({ where: { id: In(taxIds) } });
    for (const tax of taxes) {
      taxMap.set(tax.id, tax);
    }
  }

  const transactionRepo = manager.getRepository(Transaction);
  const lineRepo = manager.getRepository(TransactionLine);

  const subtotalAccumulator = new DecimalAccumulator();
  const discountAccumulator = new DecimalAccumulator();
  const taxAccumulator = new DecimalAccumulator();

  const createdLines: TransactionLine[] = [];

  for (let index = 0; index < params.lines.length; index += 1) {
    const lineInput = params.lines[index];
    const variant = variantMap.get(lineInput.productVariantId);
    if (!variant) {
      throw new SaleCreationError(`La variante de producto ${lineInput.productVariantId} no está disponible.`);
    }

    if (variant.deletedAt || variant.isActive === false) {
      throw new SaleCreationError(`La variante ${variant.sku} está inactiva o eliminada.`);
    }

    const product = variant.product;
    if (!product) {
      throw new SaleCreationError(`La variante ${variant.sku} no tiene un producto asociado.`);
    }
    if (product.deletedAt || product.isActive === false) {
      throw new SaleCreationError(`El producto ${product.name} está inactivo o eliminado.`);
    }

    const quantity = normalizeQuantity(lineInput.quantity);
    if (quantity <= 0) {
      throw new SaleCreationError('La cantidad de una línea debe ser mayor a 0.');
    }

    const unitPrice = normalizeCurrency(lineInput.unitPrice);
    const subtotal = normalizeCurrency(quantity * unitPrice);
    const discountAmount = normalizeCurrency(lineInput.discountAmount ?? 0);

    if (discountAmount > subtotal) {
      throw new SaleCreationError('El descuento no puede exceder el subtotal de la línea.');
    }

    const taxId = lineInput.taxId ?? null;
    let effectiveTaxRate = normalizePercentage(lineInput.taxRate ?? 0);
    if ((!lineInput.taxRate || Number.isNaN(lineInput.taxRate)) && taxId) {
      const tax = taxMap.get(taxId);
      if (!tax) {
        throw new SaleCreationError('No se encontró la información del impuesto indicado.');
      }
      effectiveTaxRate = normalizePercentage(Number(tax.rate));
    }

    let taxAmount = normalizeCurrency(lineInput.taxAmount ?? Number(((subtotal - discountAmount) * effectiveTaxRate) / 100));
    if (taxAmount < 0) {
      taxAmount = 0;
    }

    const total = normalizeCurrency(subtotal - discountAmount + taxAmount);
    const discountPercentage = subtotal > 0 ? normalizePercentage((discountAmount / subtotal) * 100) : 0;

    const unit = variant.unit;
    const unitId = variant.unitId ?? unit?.id ?? null;
    const unitSymbol = unit?.symbol ?? null;
    const unitConversionFactor = unit?.conversionFactor ?? null;

    const quantityInBase =
      unitConversionFactor !== null && unitConversionFactor !== undefined
        ? normalizeQuantity(Number((quantity * unitConversionFactor).toFixed(6)))
        : quantity;

    const variantName = buildVariantName(variant);

    const line = lineRepo.create({
      transactionId: undefined,
      productId: variant.productId ?? product.id,
      productVariantId: variant.id,
      lineNumber: index + 1,
      productName: product.name,
      productSku: variant.sku,
      variantName: variantName ?? undefined,
      quantity,
      quantityInBase,
      unitOfMeasure: unitSymbol ?? undefined,
      unitId: unitId ?? undefined,
      unitConversionFactor: unitConversionFactor ?? undefined,
      unitPrice,
      unitCost: lineInput.unitCost !== undefined ? normalizeCurrency(lineInput.unitCost) : undefined,
      discountPercentage,
      discountAmount,
      taxRate: effectiveTaxRate,
      taxAmount,
      subtotal,
      total,
      notes: lineInput.notes?.trim() || undefined,
    });

    createdLines.push(line);

    subtotalAccumulator.add(subtotal);
    discountAccumulator.add(discountAmount);
    taxAccumulator.add(taxAmount);
  }

  const subtotal = subtotalAccumulator.value();
  const discountAmount = discountAccumulator.value();
  const taxAmount = taxAccumulator.value();
  const total = normalizeCurrency(subtotal - discountAmount + taxAmount);

  const documentNumber = await resolveDocumentNumber(manager, params.documentNumber);

  const amountPaid = params.amountPaid !== undefined ? normalizeCurrency(params.amountPaid) : null;
  const changeAmount = params.changeAmount !== undefined ? normalizeCurrency(params.changeAmount) : null;

  const metadataPayload = {
    ...(params.metadata ?? {}),
    cashSessionId: params.cashSession.id,
    pointOfSaleId: params.pointOfSale.id,
    pointOfSaleName: params.pointOfSale.name,
    saleSource: 'mobile-backend',
  };

  const transaction = transactionRepo.create({
    transactionType: TransactionType.SALE,
    status: TransactionStatus.CONFIRMED,
    branchId: params.pointOfSale.branchId ?? null,
    pointOfSaleId: params.pointOfSale.id,
    cashSessionId: params.cashSession.id,
    customerId: params.customerId ?? null,
    userId: params.user.id,
    documentNumber,
    externalReference: params.externalReference ?? null,
    paymentMethod: params.paymentMethod,
    bankAccountKey: params.bankAccountKey ?? null,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    notes: params.notes?.trim() ?? null,
    metadata: JSON.parse(JSON.stringify(metadataPayload)),
    amountPaid: amountPaid ?? undefined,
    changeAmount: changeAmount ?? undefined,
    storageId: params.storageId ?? null,
  });

  const savedTransaction = await transactionRepo.save(transaction);

  for (const line of createdLines) {
    line.transactionId = savedTransaction.id;
  }

  const savedLines = await lineRepo.save(createdLines);

  return {
    transaction: serializeTransaction(savedTransaction),
    lines: savedLines.map(serializeTransactionLine),
  };
}

async function resolveDocumentNumber(manager: EntityManager, provided?: string): Promise<string> {
  if (provided) {
    return provided;
  }

  const transactionRepo = manager.getRepository(Transaction);
  const lastTransaction = await transactionRepo.findOne({
    where: { transactionType: TransactionType.SALE },
    order: { createdAt: 'DESC' },
  });

  const prefix = getDocumentPrefix(TransactionType.SALE);
  const lastCode = lastTransaction?.documentNumber ?? '';
  const lastNumeric = lastCode.startsWith(prefix)
    ? Number.parseInt(lastCode.slice(prefix.length), 10) || 0
    : 0;

  const nextNumber = lastNumeric + 1;
  return `${prefix}${String(nextNumber).padStart(8, '0')}`;
}

function getDocumentPrefix(type: TransactionType): string {
  switch (type) {
    case TransactionType.SALE:
      return 'VTA-';
    case TransactionType.PURCHASE:
      return 'REC-';
    case TransactionType.PURCHASE_ORDER:
      return 'OC-';
    case TransactionType.SALE_RETURN:
      return 'DVT-';
    case TransactionType.PURCHASE_RETURN:
      return 'DCP-';
    case TransactionType.ADJUSTMENT_IN:
      return 'AJE-';
    case TransactionType.ADJUSTMENT_OUT:
      return 'AJS-';
    case TransactionType.TRANSFER_IN:
      return 'TRE-';
    case TransactionType.TRANSFER_OUT:
      return 'TRS-';
    case TransactionType.PAYMENT_IN:
      return 'PIE-';
    case TransactionType.PAYMENT_OUT:
      return 'PIS-';
    case TransactionType.OPERATING_EXPENSE:
      return 'GOP-';
    case TransactionType.CASH_SESSION_WITHDRAWAL:
      return 'RCS-';
    case TransactionType.CASH_SESSION_DEPOSIT:
      return 'ICS-';
    default:
      return 'DOC-';
  }
}

export function serializeTransaction(transaction: Transaction): SerializedTransaction {
  return {
    id: transaction.id,
    documentNumber: transaction.documentNumber,
    transactionType: transaction.transactionType,
    status: transaction.status,
    branchId: transaction.branchId ?? null,
    pointOfSaleId: transaction.pointOfSaleId ?? null,
    cashSessionId: transaction.cashSessionId ?? null,
    customerId: transaction.customerId ?? null,
    userId: transaction.userId,
    subtotal: normalizeCurrency(transaction.subtotal),
    discountAmount: normalizeCurrency(transaction.discountAmount),
    taxAmount: normalizeCurrency(transaction.taxAmount),
    total: normalizeCurrency(transaction.total),
    paymentMethod: transaction.paymentMethod ?? undefined,
    bankAccountKey: transaction.bankAccountKey ?? null,
    amountPaid:
      transaction.amountPaid !== null && transaction.amountPaid !== undefined
        ? normalizeCurrency(transaction.amountPaid)
        : null,
    changeAmount:
      transaction.changeAmount !== null && transaction.changeAmount !== undefined
        ? normalizeCurrency(transaction.changeAmount)
        : null,
    notes: transaction.notes ?? null,
    metadata: transaction.metadata ?? null,
    createdAt: transaction.createdAt,
    externalReference: transaction.externalReference ?? null,
  };
}

export function serializeTransactionLine(line: TransactionLine): SerializedTransactionLine {
  return {
    id: line.id,
    transactionId: line.transactionId ?? undefined,
    productId: line.productId,
    productVariantId: line.productVariantId ?? undefined,
    lineNumber: line.lineNumber,
    productName: line.productName,
    productSku: line.productSku,
    variantName: line.variantName ?? null,
    quantity: normalizeQuantity(line.quantity),
    quantityInBase: line.quantityInBase !== null && line.quantityInBase !== undefined
      ? normalizeQuantity(line.quantityInBase)
      : null,
    unitOfMeasure: line.unitOfMeasure ?? null,
    unitId: line.unitId ?? null,
    unitConversionFactor:
      line.unitConversionFactor !== null && line.unitConversionFactor !== undefined
        ? Number(line.unitConversionFactor)
        : null,
    unitPrice: normalizeCurrency(line.unitPrice),
    unitCost:
      line.unitCost !== null && line.unitCost !== undefined
        ? normalizeCurrency(line.unitCost)
        : null,
    discountPercentage: normalizePercentage(line.discountPercentage),
    discountAmount: normalizeCurrency(line.discountAmount),
    taxRate: normalizePercentage(line.taxRate),
    taxAmount: normalizeCurrency(line.taxAmount),
    subtotal: normalizeCurrency(line.subtotal),
    total: normalizeCurrency(line.total),
    notes: line.notes ?? null,
    createdAt: line.createdAt,
  };
}

function buildVariantName(variant: ProductVariant): string | null {
  if (variant.attributeValues && Object.keys(variant.attributeValues).length > 0) {
    const values = Object.values(variant.attributeValues).filter((value) => Boolean(value));
    if (values.length > 0) {
      return values.join(', ');
    }
  }
  return null;
}

function normalizeCurrency(value: unknown): number {
  const numeric = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(2));
}

function normalizeQuantity(value: unknown): number {
  const numeric = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(4));
}

function normalizePercentage(value: unknown): number {
  const numeric = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(2));
}

class DecimalAccumulator {
  private total = 0;

  add(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this.total += value;
  }

  value(): number {
    return Number(this.total.toFixed(2));
  }
}
