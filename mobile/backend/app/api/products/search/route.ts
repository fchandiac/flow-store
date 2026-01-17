import { NextResponse } from 'next/server';
import { In } from 'typeorm';
import { getDataSource } from '../../../../src/db';
import { ProductVariant } from '@/data/entities/ProductVariant';
import { Tax } from '@/data/entities/Tax';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

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
        trackInventory: Boolean(variant.trackInventory),
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
