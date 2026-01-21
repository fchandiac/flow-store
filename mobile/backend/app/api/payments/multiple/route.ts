import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../data/db';
import { EntityManager } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus, PaymentMethod } from '../../../../../../data/entities/Transaction';
import { TransactionLine } from '../../../../../../data/entities/TransactionLine';
import { CashSession } from '../../../../../../data/entities/CashSession';
import { PointOfSale } from '../../../../../../data/entities/PointOfSale';
import { User } from '../../../../../../data/entities/User';
import { Customer } from '../../../../../../data/entities/Customer';
import { buildLedger, recordPayment } from '../../../../../../data/services/AccountingEngine';

type CreateMultiplePaymentsInput = {
  saleTransactionId: string;
  payments: Array<{
    paymentMethod: PaymentMethod;
    amount: number;
    bankAccountId?: string;
    subPayments?: Array<{
      amount: number;
      dueDate: string;
    }>;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body: CreateMultiplePaymentsInput = await request.json();
    const { saleTransactionId, payments } = body;

    const dataSource = await getDb();

    return await dataSource.transaction(async (manager: EntityManager) => {
      // Verificar que la venta existe
      const saleTransaction = await manager.findOne(Transaction, {
        where: { id: saleTransactionId, transactionType: TransactionType.SALE },
      }) as Transaction | null;

      if (!saleTransaction) {
        throw new Error('Venta no encontrada');
      }

      // Obtener datos relacionados
      const cashSession = saleTransaction.cashSessionId ? await manager.findOne(CashSession, {
        where: { id: saleTransaction.cashSessionId },
      }) : null;

      const pointOfSale = saleTransaction.pointOfSaleId ? await manager.findOne(PointOfSale, {
        where: { id: saleTransaction.pointOfSaleId },
      }) : null;

      const user = await manager.findOne(User, {
        where: { id: saleTransaction.userId },
      });

      if (!cashSession || !pointOfSale || !user) {
        throw new Error('Datos de venta incompletos');
      }

      const paymentTransactions: any[] = [];
      let totalPaid = 0;

      // Procesar cada pago
      for (const payment of payments) {
        const paymentTransaction = await createPaymentTransaction(
          manager,
          {
            saleTransaction,
            payment,
            cashSession,
            pointOfSale,
            user,
          }
        ) as { id: string; [key: string]: any };

        paymentTransactions.push({
          id: paymentTransaction.id,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          transactionId: paymentTransaction.id,
        });

        totalPaid += payment.amount;

        // Registrar movimientos contables
        await recordPayment(
          manager,
          paymentTransaction as Transaction,
          payment.bankAccountId
        );
      }

      // Calcular vuelto (solo efectivo)
      const cashPayments = payments
        .filter(p => p.paymentMethod === PaymentMethod.CASH)
        .reduce((sum, p) => sum + p.amount, 0);

      const nonCashTotal = totalPaid - cashPayments;
      const remainingAfterNonCash = Math.max(0, saleTransaction.total - nonCashTotal);
      const change = Math.max(0, cashPayments - remainingAfterNonCash);

      // Si hay vuelto, crear transacción de vuelto
      if (change > 0) {
        await createChangeTransaction(
          manager,
          {
            amount: change,
            saleTransaction,
            cashSession,
            pointOfSale,
            user,
          }
        );
      }

      return NextResponse.json({
        success: true,
        payments: paymentTransactions,
        totalPaid,
        change,
      });
    });

  } catch (error) {
    console.error('Error creating multiple payments:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al procesar pagos'
      },
      { status: 500 }
    );
  }
}

async function createPaymentTransaction(
  manager: EntityManager,
  params: {
    saleTransaction: Transaction;
    payment: CreateMultiplePaymentsInput['payments'][0];
    cashSession: CashSession;
    pointOfSale: PointOfSale;
    user: User;
  }
) {
  const { saleTransaction, payment, cashSession, pointOfSale, user } = params;

  const transaction = manager.create(Transaction) as Transaction;
  transaction.documentNumber = generatePaymentDocumentNumber(saleTransaction.documentNumber);
  transaction.transactionType = TransactionType.PAYMENT_IN;
  transaction.status = TransactionStatus.CONFIRMED;
  transaction.branchId = pointOfSale.branchId;
  transaction.pointOfSaleId = pointOfSale.id;
  transaction.cashSessionId = cashSession.id;
  transaction.customerId = saleTransaction.customerId;
  transaction.userId = user.id;
  transaction.subtotal = payment.amount;
  transaction.taxAmount = 0;
  transaction.discountAmount = 0;
  transaction.total = payment.amount;
  transaction.paymentMethod = payment.paymentMethod;
  transaction.metadata = {
    saleTransactionId: saleTransaction.id,
    bankAccountId: payment.bankAccountId,
    subPayments: payment.subPayments,
  };

  return await manager.save(Transaction, transaction);
}

async function createChangeTransaction(
  manager: EntityManager,
  params: {
    amount: number;
    saleTransaction: Transaction;
    cashSession: CashSession;
    pointOfSale: PointOfSale;
    user: User;
  }
) {
  const { amount, saleTransaction, cashSession, pointOfSale, user } = params;

  const transaction = manager.create(Transaction) as Transaction;
  transaction.documentNumber = generateChangeDocumentNumber(saleTransaction.documentNumber);
  transaction.transactionType = TransactionType.PAYMENT_OUT;
  transaction.status = TransactionStatus.CONFIRMED;
  transaction.branchId = pointOfSale.branchId;
  transaction.pointOfSaleId = pointOfSale.id;
  transaction.cashSessionId = cashSession.id;
  transaction.customerId = saleTransaction.customerId;
  transaction.userId = user.id;
  transaction.subtotal = amount;
  transaction.taxAmount = 0;
  transaction.discountAmount = 0;
  transaction.total = amount;
  transaction.paymentMethod = PaymentMethod.CASH;
  transaction.metadata = {
    saleTransactionId: saleTransaction.id,
    type: 'change',
  };

  return await manager.save(Transaction, transaction);
}

function generatePaymentDocumentNumber(saleDocumentNumber: string): string {
  const timestamp = Date.now();
  return `PAY-${saleDocumentNumber}-${timestamp}`;
}

function generateChangeDocumentNumber(saleDocumentNumber: string): string {
  const timestamp = Date.now();
  return `CHG-${saleDocumentNumber}-${timestamp}`;
}