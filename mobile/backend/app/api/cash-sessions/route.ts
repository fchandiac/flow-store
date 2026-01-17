import { NextResponse } from 'next/server';
import { getDataSource } from '../../../src/db';
import { CashSession, CashSessionStatus } from '../../../../../data/entities/CashSession';
import { PointOfSale } from '../../../../../data/entities/PointOfSale';
import { User } from '../../../../../data/entities/User';
import { persistCashSessionOpeningTransaction } from '../../../src/services/cashSessionService';

interface CreateCashSessionRequest {
  userName?: string;
  pointOfSaleId?: string;
  openingAmount?: number;
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

      const newSession = cashSessionRepo.create({
        pointOfSaleId: pointOfSale.id,
        openedById: user.id,
        openingAmount,
        openedAt,
        status: CashSessionStatus.OPEN,
      });

      const savedSession = await cashSessionRepo.save(newSession);
      const savedTransaction = await persistCashSessionOpeningTransaction(manager, {
        cashSession: savedSession,
        pointOfSale,
        user,
        openingAmount,
      });

      return { savedSession, savedTransaction } as const;
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

    const { savedSession, savedTransaction } = result;

    const cashSessionPayload = {
      id: savedSession.id,
      pointOfSaleId: savedSession.pointOfSaleId,
      openedById: savedSession.openedById,
      status: savedSession.status,
      openingAmount: Number(savedSession.openingAmount),
      openedAt: savedSession.openedAt,
      createdAt: savedSession.createdAt,
      updatedAt: savedSession.updatedAt,
    };

    const transactionPayload = {
      id: savedTransaction.id,
      documentNumber: savedTransaction.documentNumber,
      transactionType: savedTransaction.transactionType,
      status: savedTransaction.status,
      branchId: savedTransaction.branchId,
      pointOfSaleId: savedTransaction.pointOfSaleId,
      cashSessionId: savedTransaction.cashSessionId,
      userId: savedTransaction.userId,
      subtotal: Number(savedTransaction.subtotal),
      taxAmount: Number(savedTransaction.taxAmount),
      discountAmount: Number(savedTransaction.discountAmount),
      total: Number(savedTransaction.total),
      paymentMethod: savedTransaction.paymentMethod,
      metadata: savedTransaction.metadata ?? null,
      createdAt: savedTransaction.createdAt,
    };

    return NextResponse.json(
      { success: true, cashSession: cashSessionPayload, transaction: transactionPayload },
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
