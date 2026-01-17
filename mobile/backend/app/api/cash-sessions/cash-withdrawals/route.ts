import { NextResponse } from 'next/server';
import { getDataSource } from '../../../../src/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { User } from '@/data/entities/User';
import {
  CashSessionMovementError,
  persistCashSessionWithdrawalTransaction,
} from '../../../../src/services/cashSessionService';

interface CashWithdrawalRequest {
  userName?: string;
  pointOfSaleId?: string;
  cashSessionId?: string;
  amount?: number;
  reason?: string;
}

export async function POST(request: Request) {
  try {
    const body: CashWithdrawalRequest = await request.json();
    const userName = body.userName?.trim();
    const pointOfSaleId = body.pointOfSaleId?.trim();
    const cashSessionId = body.cashSessionId?.trim();
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
    const reason = body.reason?.trim();

    if (!userName || !pointOfSaleId || !cashSessionId || !Number.isFinite(amount)) {
      return NextResponse.json(
        {
          success: false,
          message: 'userName, pointOfSaleId, cashSessionId y amount son obligatorios.',
        },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'El monto debe ser mayor a 0.' },
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

      if (cashSession.status !== CashSessionStatus.OPEN) {
        return { kind: 'SESSION_STATUS', status: cashSession.status } as const;
      }

      if (cashSession.pointOfSaleId && cashSession.pointOfSaleId !== pointOfSale.id) {
        return { kind: 'SESSION_MISMATCH' } as const;
      }

      const withdrawal = await persistCashSessionWithdrawalTransaction(manager, {
        cashSession,
        pointOfSale,
        user,
        amount,
        reason,
      });

      return { kind: 'SUCCESS', withdrawal } as const;
    });

    if (result.kind === 'NOT_FOUND') {
      const resource = translateResource(result.resource);
      return NextResponse.json(
        { success: false, message: `No se encontró ${resource} solicitado.` },
        { status: 404 },
      );
    }

    if (result.kind === 'SESSION_STATUS') {
      return NextResponse.json(
        {
          success: false,
          message: `La sesión de caja debe estar abierta (estado actual: ${result.status}).`,
        },
        { status: 409 },
      );
    }

    if (result.kind === 'SESSION_MISMATCH') {
      return NextResponse.json(
        {
          success: false,
          message: 'La sesión de caja no corresponde al punto de venta indicado.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        transaction: result.withdrawal.transaction,
        expectedAmount: result.withdrawal.expectedAmount,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CashSessionMovementError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error('[cash-sessions/cash-withdrawals] Error processing request', error);
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
