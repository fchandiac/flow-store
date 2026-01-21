import { NextResponse } from 'next/server';
import { getDataSource } from '../../../../src/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { Branch } from '@/data/entities/Branch';
import { User } from '@/data/entities/User';
import { Transaction, TransactionType } from '@/data/entities/Transaction';
import { persistCashSessionOpeningTransaction } from '../../../../src/services/cashSessionService';
import { buildLedger } from '@/data/services/AccountingEngine';

interface CreateOpeningTransactionRequest {
  cashSessionId?: string;
  userName?: string;
  openingAmount?: number;
}

const CASH_ACCOUNT_CODE = '1.1.01';

export async function POST(request: Request) {
  try {
    const body: CreateOpeningTransactionRequest = await request.json();
    const cashSessionId = body.cashSessionId?.trim();
    const userName = body.userName?.trim();
    const openingAmount =
      typeof body.openingAmount === 'number' && !Number.isNaN(body.openingAmount)
        ? body.openingAmount
        : 0;
    const sanitizedOpeningAmount = Number.isFinite(openingAmount)
      ? Number(openingAmount.toFixed(2))
      : 0;

    if (!cashSessionId) {
      return NextResponse.json(
        { success: false, message: 'cashSessionId es obligatorio.' },
        { status: 400 },
      );
    }

    if (!userName) {
      return NextResponse.json(
        { success: false, message: 'userName es obligatorio.' },
        { status: 400 },
      );
    }

    const dataSource = await getDataSource();

    const result = await dataSource.transaction(async (manager) => {
      const cashSessionRepo = manager.getRepository(CashSession);
      const session = await cashSessionRepo.findOne({ where: { id: cashSessionId } });

      if (!session) {
        return { notFound: 'cashSession' } as const;
      }

      if (session.status !== CashSessionStatus.OPEN) {
        return { invalidStatus: session.status } as const;
      }

      const pointOfSaleRepo = manager.getRepository(PointOfSale);
      const pointOfSale = session.pointOfSaleId
        ? await pointOfSaleRepo.findOne({ where: { id: session.pointOfSaleId }, relations: ['branch'] })
        : null;

      if (!pointOfSale) {
        return { missingPointOfSale: true } as const;
      }

      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { userName } });

      if (!user) {
        return { notFound: 'user' } as const;
      }

      if (session.openedById && session.openedById !== user.id) {
        return { userMismatch: true } as const;
      }

      const transactionRepo = manager.getRepository(Transaction);
      const existingTransaction = await transactionRepo.findOne({
        where: {
          cashSessionId: session.id,
          transactionType: TransactionType.CASH_SESSION_OPENING,
        },
      });

      if (existingTransaction) {
        return { conflict: true, existingTransaction } as const;
      }

      let companyId = pointOfSale.branch?.companyId ?? null;
      if (!companyId && pointOfSale.branchId) {
        const branchRepo = manager.getRepository(Branch);
        const branch = await branchRepo.findOne({ where: { id: pointOfSale.branchId } });
        companyId = branch?.companyId ?? null;
      }

      if (!companyId) {
        return { missingCompany: true } as const;
      }

      const dataSource = await getDataSource();
      const ledger = await buildLedger(dataSource as any, { companyId });
      const cashAccount = ledger.accounts.find((account) => account.code === CASH_ACCOUNT_CODE);
      const rawAvailableCash = cashAccount ? ledger.balanceByAccount[cashAccount.id] ?? 0 : 0;
      const availableCash = Number.isFinite(rawAvailableCash)
        ? Number(Number(rawAvailableCash).toFixed(2))
        : 0;

      if (availableCash <= 0) {
        return { noCashAvailable: true, availableCash } as const;
      }

      if (sanitizedOpeningAmount > availableCash) {
        return { insufficientCash: true, availableCash } as const;
      }

      const savedTransaction = await persistCashSessionOpeningTransaction(manager, {
        cashSession: session,
        pointOfSale,
        user,
        openingAmount: sanitizedOpeningAmount,
      });

      return { session, savedTransaction } as const;
    });

    if ('notFound' in result) {
      const resource = result.notFound === 'cashSession' ? 'sesión de caja' : 'usuario';
      return NextResponse.json(
        { success: false, message: `No se encontró la ${resource} solicitada.` },
        { status: 404 },
      );
    }

    if ('invalidStatus' in result) {
      return NextResponse.json(
        {
          success: false,
          message: `La sesión de caja debe estar en estado OPEN para registrar la apertura (estado actual: ${result.invalidStatus}).`,
        },
        { status: 409 },
      );
    }

    if ('missingPointOfSale' in result) {
      return NextResponse.json(
        {
          success: false,
          message: 'La sesión de caja no tiene un punto de venta asociado.',
        },
        { status: 409 },
      );
    }

    if ('userMismatch' in result) {
      return NextResponse.json(
        {
          success: false,
          message: 'El usuario enviado no coincide con quien abrió la sesión de caja.',
        },
        { status: 409 },
      );
    }

    if ('conflict' in result && result.conflict) {
      return NextResponse.json(
        {
          success: false,
          message: 'La sesión ya tiene una transacción de apertura registrada.',
        },
        { status: 409 },
      );
    }

    if ('missingCompany' in result) {
      return NextResponse.json(
        {
          success: false,
          message: 'El punto de venta no tiene una sucursal asociada a una empresa para validar el saldo de caja.',
        },
        { status: 409 },
      );
    }

    if ('noCashAvailable' in result) {
      const formattedAvailable = result.availableCash!.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
      });
      return NextResponse.json(
        {
          success: false,
          message: `No hay saldo disponible en la cuenta de caja (${CASH_ACCOUNT_CODE}) para abrir la caja del punto de venta (saldo actual: ${formattedAvailable}).`,
        },
        { status: 409 },
      );
    }

    if ('insufficientCash' in result) {
      const formattedAvailable = result.availableCash!.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
      });
      return NextResponse.json(
        {
          success: false,
          message: `El monto de apertura supera el saldo disponible en la cuenta de caja (${CASH_ACCOUNT_CODE}). Saldo disponible: ${formattedAvailable}.`,
        },
        { status: 409 },
      );
    }

    const { session, savedTransaction } = result;

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
      {
        success: true,
        transaction: transactionPayload,
        cashSession: {
          id: session.id,
          openedById: session.openedById,
          pointOfSaleId: session.pointOfSaleId,
          status: session.status,
          openingAmount: Number(session.openingAmount),
          openedAt: session.openedAt,
          expectedAmount:
            session.expectedAmount !== undefined && session.expectedAmount !== null
              ? Number(session.expectedAmount)
              : null,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          closingAmount:
            session.closingAmount !== undefined && session.closingAmount !== null
              ? Number(session.closingAmount)
              : null,
          closedAt: session.closedAt ?? null,
          difference:
            session.difference !== undefined && session.difference !== null
              ? Number(session.difference)
              : null,
          notes: session.notes ?? null,
          closingDetails: session.closingDetails ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[cash-sessions/opening-transaction] Error processing request', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
