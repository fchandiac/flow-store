import { NextResponse } from 'next/server';
import { getDataSource } from '../../../../src/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { Branch } from '@/data/entities/Branch';
import { User } from '@/data/entities/User';
import {
  CashSessionMovementError,
  persistCashSessionDepositTransaction,
} from '../../../../src/services/cashSessionService';
import { buildLedger } from '@/data/services/AccountingEngine';

interface CashDepositRequest {
  userName?: string;
  pointOfSaleId?: string;
  cashSessionId?: string;
  amount?: number;
  reason?: string;
}

const CASH_ACCOUNT_CODE = '1.1.01';

export async function POST(request: Request) {
  try {
    const body: CashDepositRequest = await request.json();
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

    const sanitizedAmount = Number.isFinite(amount) ? Number(Number(amount).toFixed(2)) : 0;

    if (sanitizedAmount <= 0) {
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
      const pointOfSale = await pointOfSaleRepo.findOne({ where: { id: pointOfSaleId }, relations: ['branch'] });
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

      let companyId = pointOfSale.branch?.companyId ?? null;
      if (!companyId && pointOfSale.branchId) {
        const branchRepo = manager.getRepository(Branch);
        const branch = await branchRepo.findOne({ where: { id: pointOfSale.branchId } });
        companyId = branch?.companyId ?? null;
      }

      if (!companyId) {
        return { kind: 'MISSING_COMPANY' } as const;
      }

      const dataSource = await getDataSource() as any;
      const ledger = await buildLedger(dataSource, { companyId });
      const cashAccount = ledger.accounts.find((account) => account.code === CASH_ACCOUNT_CODE);
      const rawAvailableCash = cashAccount ? ledger.balanceByAccount[cashAccount.id] ?? 0 : 0;
      const availableCash = Number.isFinite(rawAvailableCash)
        ? Number(Number(rawAvailableCash).toFixed(2))
        : 0;

      if (availableCash <= 0) {
        return { kind: 'NO_CASH_AVAILABLE', availableCash } as const;
      }

      if (sanitizedAmount > availableCash) {
        return { kind: 'INSUFFICIENT_CASH', availableCash } as const;
      }

      const deposit = await persistCashSessionDepositTransaction(manager, {
        cashSession,
        pointOfSale,
        user,
        amount: sanitizedAmount,
        reason,
      });

      return { kind: 'SUCCESS', deposit } as const;
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

    if (result.kind === 'MISSING_COMPANY') {
      return NextResponse.json(
        {
          success: false,
          message: 'No se pudo determinar la compañía asociada al punto de venta para validar el saldo de caja.',
        },
        { status: 409 },
      );
    }

    if (result.kind === 'NO_CASH_AVAILABLE') {
      const formattedAvailable = result.availableCash.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
      });
      return NextResponse.json(
        {
          success: false,
          message: `No hay saldo disponible en la cuenta de caja (${CASH_ACCOUNT_CODE}) para registrar el ingreso. Saldo actual: ${formattedAvailable}.`,
        },
        { status: 409 },
      );
    }

    if (result.kind === 'INSUFFICIENT_CASH') {
      const formattedAvailable = result.availableCash.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
      });
      return NextResponse.json(
        {
          success: false,
          message: `El monto del ingreso excede el saldo disponible en la cuenta de caja (${CASH_ACCOUNT_CODE}). Saldo disponible: ${formattedAvailable}.`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        transaction: result.deposit.transaction,
        expectedAmount: result.deposit.expectedAmount,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CashSessionMovementError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error('[cash-sessions/cash-deposits] Error processing request', error);
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
