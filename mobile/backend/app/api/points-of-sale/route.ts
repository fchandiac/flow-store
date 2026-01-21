import { NextResponse } from 'next/server';
import { IsNull } from 'typeorm';
import { getDataSource } from '../../../src/db';
import { PointOfSale } from '@/data/entities/PointOfSale';

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const pointOfSaleRepo = dataSource.getRepository(PointOfSale);

    const pointsOfSale = await pointOfSaleRepo.find({
      relations: ['branch'],
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        name: 'ASC',
      },
    });

    const payload = pointsOfSale.map((pos) => ({
      id: pos.id,
      name: pos.name,
      deviceId: pos.deviceId ?? null,
      branchId: pos.branchId ?? null,
      branchName: pos.branch?.name ?? null,
      isActive: pos.isActive,
      createdAt: pos.createdAt,
      updatedAt: pos.updatedAt,
    }));

    return NextResponse.json({ success: true, pointsOfSale: payload });
  } catch (error) {
    console.error('[points-of-sale] Error fetching list', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
