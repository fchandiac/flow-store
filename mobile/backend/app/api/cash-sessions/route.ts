import { NextResponse } from 'next/server';
import { getDataSource } from '../../../src/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { User } from '@/data/entities/User';

interface CreateCashSessionRequest {
  userName?: string;
  pointOfSaleId?: string;
  openingAmount?: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pointOfSaleId = searchParams.get('pointOfSaleId')?.trim();

    if (!pointOfSaleId) {
      return NextResponse.json(
        { success: false, message: 'pointOfSaleId es obligatorio.' },
        { status: 400 },
      );
    }

    const dataSource = await getDataSource();
    const cashSessionRepo = dataSource.getRepository(CashSession);

    const activeSession = await cashSessionRepo.findOne({
      where: {
        pointOfSaleId,
        status: CashSessionStatus.OPEN,
      },
      order: {
        openedAt: 'DESC',
      },
    });

    if (!activeSession) {
      return NextResponse.json(
        { success: true, cashSession: null, openedByUser: null },
        { status: 200 },
      );
    }

    let openedByUser: { id: string; userName: string; personName: string | null } | null = null;

    if (activeSession.openedById) {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: activeSession.openedById },
        relations: ['person'],
      });

      if (user) {
        const fallbackName = user.person
          ? [user.person.firstName, user.person.lastName].filter(Boolean).join(' ').trim()
          : '';

        const personName = user.person
          ? user.person.businessName ?? (fallbackName !== '' ? fallbackName : null)
          : null;

        openedByUser = {
          id: user.id,
          userName: user.userName,
          personName,
        };
      }
    }

    const cashSessionPayload = {
      id: activeSession.id,
      pointOfSaleId: activeSession.pointOfSaleId,
      openedById: activeSession.openedById,
      status: activeSession.status,
      openingAmount: Number(activeSession.openingAmount),
      openedAt: activeSession.openedAt,
      createdAt: activeSession.createdAt,
      updatedAt: activeSession.updatedAt,
      expectedAmount: activeSession.expectedAmount ?? null,
    };

    return NextResponse.json(
      {
        success: true,
        cashSession: cashSessionPayload,
        openedByUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[cash-sessions] Error fetching active session', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateCashSessionRequest = await request.json();
    const userName = body.userName?.trim();
    const pointOfSaleId = body.pointOfSaleId?.trim();
    const openingAmount =
      typeof body.openingAmount === 'number' && !Number.isNaN(body.openingAmount)
        ? body.openingAmount
        : 0;

    if (!userName || !pointOfSaleId) {
      return NextResponse.json(
        { success: false, message: 'userName y pointOfSaleId son obligatorios.' },
        { status: 400 },
      );
    }

    const dataSource = await getDataSource();

    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { userName } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'El usuario especificado no existe.' },
        { status: 404 },
      );
    }

    const pointOfSaleRepo = dataSource.getRepository(PointOfSale);
    const pointOfSale = await pointOfSaleRepo.findOne({ where: { id: pointOfSaleId } });
    if (!pointOfSale) {
      return NextResponse.json(
        { success: false, message: 'El punto de venta especificado no existe.' },
        { status: 404 },
      );
    }

    const result = await dataSource.transaction(async (manager) => {
      const cashSessionRepo = manager.getRepository(CashSession);

      const existingOpenSession = await cashSessionRepo.findOne({
        where: {
          pointOfSaleId: pointOfSale.id,
          status: CashSessionStatus.OPEN,
        },
      });

      if (existingOpenSession) {
        return { conflict: true } as const;
      }

      const openedAt = new Date();

      const newSession = cashSessionRepo.create();
      newSession.pointOfSaleId = pointOfSale.id;
      newSession.openedById = user.id;
      newSession.openingAmount = openingAmount;
      newSession.openedAt = openedAt;
      newSession.status = CashSessionStatus.OPEN;

      const savedSession = await cashSessionRepo.save(newSession);

      return { savedSession } as const;
    });

    if (result === undefined) {
      return NextResponse.json(
        { success: false, message: 'Error transaccional al crear la sesión.' },
        { status: 500 },
      );
    }

    if ('conflict' in result) {
      return NextResponse.json(
        { success: false, message: 'El punto de venta ya tiene una sesión abierta.' },
        { status: 409 },
      );
    }

    const { savedSession } = result;

    const cashSessionPayload = {
      id: savedSession.id,
      pointOfSaleId: savedSession.pointOfSaleId,
      openedById: savedSession.openedById,
      status: savedSession.status,
      openingAmount: Number(savedSession.openingAmount),
      openedAt: savedSession.openedAt,
      createdAt: savedSession.createdAt,
      updatedAt: savedSession.updatedAt,
      expectedAmount: savedSession.expectedAmount ?? null,
    };

    return NextResponse.json(
      {
        success: true,
        cashSession: cashSessionPayload,
        suggestedOpeningAmount: openingAmount,
        pointOfSale: {
          id: pointOfSale.id,
          name: pointOfSale.name,
          deviceId: pointOfSale.deviceId ?? null,
          branchId: pointOfSale.branchId ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[cash-sessions] Error processing request', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
