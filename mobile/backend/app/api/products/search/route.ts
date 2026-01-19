import { NextResponse } from 'next/server';
import { In } from 'typeorm';
import { getDataSource } from '../../../../src/db';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Tax } from '@/data/entities/Tax';
import { Transaction, TransactionStatus, TransactionType } from '@/data/entities/Transaction';
import { TransactionLine } from '@/data/entities/TransactionLine';
import { Attribute } from '@/data/entities/Attribute';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type MovementDirection = 'IN' | 'OUT';

const MOVEMENT_DIRECTION: Record<TransactionType, MovementDirection | null> = {
  [TransactionType.SALE]: 'OUT',
  [TransactionType.PURCHASE]: 'IN',
  [TransactionType.PURCHASE_ORDER]: null,
  [TransactionType.SALE_RETURN]: 'IN',
  [TransactionType.PURCHASE_RETURN]: 'OUT',
  [TransactionType.TRANSFER_OUT]: 'OUT',
  [TransactionType.TRANSFER_IN]: 'IN',
  [TransactionType.ADJUSTMENT_IN]: 'IN',
  [TransactionType.ADJUSTMENT_OUT]: 'OUT',
  [TransactionType.PAYMENT_IN]: null,
  [TransactionType.PAYMENT_OUT]: null,
  [TransactionType.CASH_DEPOSIT]: null,
  [TransactionType.OPERATING_EXPENSE]: null,
  [TransactionType.CASH_SESSION_OPENING]: null,
  [TransactionType.CASH_SESSION_WITHDRAWAL]: null,
  [TransactionType.CASH_SESSION_DEPOSIT]: null,
};

const resolveDirection = (type: TransactionType): MovementDirection | null => MOVEMENT_DIRECTION[type] ?? null;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
    const rawPage = Number(url.searchParams.get('page'));
    const rawPageSize = Number(url.searchParams.get('pageSize'));

    const query = rawQuery.trim();
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const pageSizeCandidate = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(pageSizeCandidate, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const dataSource = await getDataSource();
    const variantRepo = dataSource.getRepository(ProductVariant);

    const qb = variantRepo
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .where('variant.isActive = :variantActive', { variantActive: true })
      .andWhere('variant.deletedAt IS NULL')
      .andWhere('product.deletedAt IS NULL')
      .andWhere('product.isActive = :productActive', { productActive: true });

    if (query.length > 0) {
      const likeQuery = `%${query.toLowerCase()}%`;
      qb.andWhere(
        'LOWER(product.name) LIKE :likeQuery OR LOWER(variant.sku) LIKE :likeQuery OR LOWER(COALESCE(variant.barcode, "")) LIKE :likeQuery',
        { likeQuery },
      );
    }

    qb.orderBy('product.name', 'ASC').addOrderBy('variant.sku', 'ASC');

    const [variants, total] = await qb.skip(skip).take(pageSize).getManyAndCount();

    const taxIdSet = new Set<string>();
    for (const variant of variants) {
      if (Array.isArray(variant.taxIds)) {
        variant.taxIds.forEach((id) => id && taxIdSet.add(id));
      }
      if (Array.isArray(variant.product?.taxIds)) {
        variant.product?.taxIds.forEach((id) => id && taxIdSet.add(id));
      }
    }

    const taxMap = new Map<string, number>();
    if (taxIdSet.size > 0) {
      const taxRepo = dataSource.getRepository(Tax);
      const taxes = await taxRepo.find({ where: { id: In(Array.from(taxIdSet)) } });
      for (const tax of taxes) {
        taxMap.set(tax.id, Number(tax.rate) || 0);
      }
    }

    const variantIds = variants.map((variant) => variant.id);

    const attributeIdSet = new Set<string>();
    for (const variant of variants) {
      if (variant.attributeValues) {
        Object.keys(variant.attributeValues).forEach((attributeId) => {
          if (attributeId) {
            attributeIdSet.add(attributeId);
          }
        });
      }
    }

    const attributeNameMap = new Map<string, string>();
    if (attributeIdSet.size > 0) {
      const attributeRepo = dataSource.getRepository(Attribute);
      const attributes = await attributeRepo.find({ where: { id: In(Array.from(attributeIdSet)) } });
      for (const attribute of attributes) {
        attributeNameMap.set(attribute.id, attribute.name);
      }
    }

    const variantStockMap = new Map<string, { total: number; totalBase: number }>();

    if (variantIds.length > 0) {
      const rawLines = await dataSource
        .getRepository(TransactionLine)
        .createQueryBuilder('line')
        .innerJoin(Transaction, 'tx', 'tx.id = line.transactionId')
        .select('line.productVariantId', 'variantId')
        .addSelect('line.quantity', 'quantity')
        .addSelect('line.quantityInBase', 'quantityInBase')
        .addSelect('line.unitConversionFactor', 'unitConversionFactor')
        .addSelect('tx.transactionType', 'transactionType')
        .where('line.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('tx.status = :status', { status: TransactionStatus.CONFIRMED })
        .getRawMany();

      for (const raw of rawLines) {
        const variantId = (raw.variantId as string | null) ?? null;
        if (!variantId) {
          continue;
        }

        const transactionType = raw.transactionType as TransactionType;
        const direction = resolveDirection(transactionType);
        if (!direction) {
          continue;
        }

        const quantityRaw = raw.quantity;
        const quantity = typeof quantityRaw === 'string' ? Number(quantityRaw) : Number(quantityRaw ?? 0);
        if (!Number.isFinite(quantity) || quantity === 0) {
          continue;
        }

        const conversionRaw = raw.unitConversionFactor;
        const conversion = typeof conversionRaw === 'string' ? Number(conversionRaw) : Number(conversionRaw ?? 0);
        const hasConversion = Number.isFinite(conversion) && conversion !== 0;

        const quantityInBaseRaw = raw.quantityInBase;
        const quantityInBaseCandidate = typeof quantityInBaseRaw === 'string'
          ? Number(quantityInBaseRaw)
          : Number(quantityInBaseRaw ?? 0);

        const quantityInBase = Number.isFinite(quantityInBaseCandidate) && quantityInBaseCandidate !== 0
          ? quantityInBaseCandidate
          : hasConversion
            ? Number((quantity * conversion).toFixed(6))
            : quantity;

        const signedQuantity = direction === 'IN' ? quantity : -quantity;
        const signedQuantityBase = direction === 'IN' ? quantityInBase : -quantityInBase;

        const existing = variantStockMap.get(variantId) ?? { total: 0, totalBase: 0 };
        existing.total = Number((existing.total + signedQuantity).toFixed(4));
        existing.totalBase = Number((existing.totalBase + signedQuantityBase).toFixed(4));
        variantStockMap.set(variantId, existing);
      }
    }

    const items = variants.map((variant) => {
      const product = variant.product;
      const variantTaxIds = Array.isArray(variant.taxIds) && variant.taxIds.length > 0
        ? variant.taxIds
        : Array.isArray(product?.taxIds)
          ? product.taxIds
          : [];

      const taxRate = variantTaxIds.reduce((acc, taxId) => acc + (taxMap.get(taxId) ?? 0), 0);
      const netPrice = Number(variant.basePrice) || 0;
      const unitTaxAmount = Number(((netPrice * taxRate) / 100).toFixed(2));
      const grossPrice = Number((netPrice + unitTaxAmount).toFixed(2));

      const stockEntry = variantStockMap.get(variant.id);

      const attributes = variant.attributeValues
        ? Object.entries(variant.attributeValues)
            .filter(([_, value]) => typeof value === 'string' && value.trim().length > 0)
            .map(([attributeId, value]) => ({
              attributeId,
              attributeName: attributeNameMap.get(attributeId) ?? null,
              attributeValue: value,
            }))
        : [];

      const trackInventory = Boolean(variant.trackInventory);

      return {
        productId: product?.id ?? null,
        productName: product?.name ?? variant.sku,
        productDescription: product?.description ?? null,
        productImagePath: variant.imagePath ?? product?.imagePath ?? null,
        variantId: variant.id,
        sku: variant.sku,
        barcode: variant.barcode ?? null,
        unitSymbol: variant.unit?.symbol ?? null,
        unitId: variant.unitId ?? null,
        unitPrice: netPrice,
        unitTaxRate: taxRate,
        unitTaxAmount,
        unitPriceWithTax: grossPrice,
        trackInventory,
        availableStock: trackInventory ? Number((stockEntry?.total ?? 0).toFixed(4)) : null,
        availableStockBase: trackInventory ? Number((stockEntry?.totalBase ?? 0).toFixed(4)) : null,
        attributes,
        metadata: product?.metadata ?? null,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      success: true,
      products: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      query,
    });
  } catch (error) {
    console.error('[products/search] Error searching products', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
