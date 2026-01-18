import { NextResponse } from 'next/server';
import { getDataSource } from '../../../../src/db';
import { CashSession } from '@/data/entities/CashSession';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { User } from '@/data/entities/User';
import {
  CashSessionClosingError,
  persistCashSessionClosing,
} from '../../../../src/services/cashSessionService';

interface CashClosingRequest {
  userName?: string;
  pointOfSaleId?: string;
  cashSessionId?: string;
  actualCash?: number | string;
  voucherDebitAmount?: number | string;
  voucherCreditAmount?: number | string;
  transferAmount?: number | string;
  checkAmount?: number | string;
  otherAmount?: number | string;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const body: CashClosingRequest = await request.json();
    const userName = body.userName?.trim();
    const pointOfSaleId = body.pointOfSaleId?.trim();
    const cashSessionId = body.cashSessionId?.trim();

    const actualCash = parseAmount(body.actualCash);
    const voucherDebitAmount = parseAmount(body.voucherDebitAmount ?? 0) ?? 0;
    const voucherCreditAmount = parseAmount(body.voucherCreditAmount ?? 0) ?? 0;
    const transferAmount = parseAmount(body.transferAmount ?? 0) ?? 0;
    const checkAmount = parseAmount(body.checkAmount ?? 0) ?? 0;
    const otherAmount = parseAmount(body.otherAmount ?? 0) ?? 0;
    const notes = body.notes?.trim();

    if (!userName || !pointOfSaleId || !cashSessionId || actualCash === null) {
      return NextResponse.json(
        {
          success: false,
          message: 'userName, pointOfSaleId, cashSessionId y actualCash son obligatorios.',
        },
        { status: 400 },
      );
    }

    if (
      actualCash < 0 ||
      voucherDebitAmount < 0 ||
      voucherCreditAmount < 0 ||
      transferAmount < 0 ||
      checkAmount < 0 ||
      otherAmount < 0
    ) {
      return NextResponse.json(
        { success: false, message: 'Los montos no pueden ser negativos.' },
        { status: 400 },
      );
    }

    const dataSource = await getDataSource();

    const result = await dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { userName } });
      if (!user) {
        return { kind: 'NOT_FOUND', resource: 'user' } as const;
      }

      const pointOfSaleRepo = manager.getRepository(PointOfSale);
      const pointOfSale = await pointOfSaleRepo.findOne({ where: { id: pointOfSaleId } });
      if (!pointOfSale) {
        return { kind: 'NOT_FOUND', resource: 'pointOfSale' } as const;
      }

      const cashSessionRepo = manager.getRepository(CashSession);
      const cashSession = await cashSessionRepo.findOne({ where: { id: cashSessionId } });
      if (!cashSession) {
        return { kind: 'NOT_FOUND', resource: 'cashSession' } as const;
      }

      const closing = await persistCashSessionClosing(manager, {
        cashSession,
        pointOfSale,
        user,
        actualCash,
        voucherDebitAmount,
        voucherCreditAmount,
        transferAmount,
        checkAmount,
        otherAmount,
        notes,
      });

      return { kind: 'SUCCESS', closing } as const;
    });

    if (result.kind === 'NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          message: `No se encontró ${translateResource(result.resource)} solicitado.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        session: serializeCashSession(result.closing.cashSession),
        closing: {
          actual: result.closing.actual,
          expected: result.closing.expected,
          difference: result.closing.difference,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof CashSessionClosingError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }

    console.error('[cash-sessions/close] Error processing request', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

type NotFoundResource = 'user' | 'pointOfSale' | 'cashSession';

function translateResource(resource: NotFoundResource): string {
  switch (resource) {
    case 'user':
      return 'el usuario';
    case 'pointOfSale':
      return 'el punto de venta';
    case 'cashSession':
      return 'la sesión de caja';
    default:
      return 'el recurso';
  }
}

function serializeCashSession(session: CashSession) {
  return {
    id: session.id,
    status: session.status,
    pointOfSaleId: session.pointOfSaleId ?? null,
    openedById: session.openedById ?? null,
    openedAt: session.openedAt ? session.openedAt.toISOString() : null,
    openingAmount: Number(session.openingAmount) || 0,
    expectedAmount:
      session.expectedAmount !== undefined && session.expectedAmount !== null
        ? Number(session.expectedAmount)
        : null,
    closingAmount:
      session.closingAmount !== undefined && session.closingAmount !== null
        ? Number(session.closingAmount)
        : null,
    difference:
      session.difference !== undefined && session.difference !== null
        ? Number(session.difference)
        : null,
    closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    createdAt: session.createdAt ? session.createdAt.toISOString() : null,
    updatedAt: session.updatedAt ? session.updatedAt.toISOString() : null,
    closingDetails: session.closingDetails ?? null,
    notes: session.notes ?? null,
  };
}

function parseAmount(value: number | string | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(String(value));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Number(parsed.toFixed(2));
}
