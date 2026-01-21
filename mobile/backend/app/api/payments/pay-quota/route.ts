import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '../../../../src/db';
import { EntityManager } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus, PaymentMethod } from '@/data/entities/Transaction';
import { CashSession } from '@/data/entities/CashSession';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { User } from '@/data/entities/User';
import { recordPayment } from '@/data/services/AccountingEngine';

type PayQuotaInput = {
  quotaId: string;
  originalTransactionId: string;
  cashSessionId: string;
  payments: Array<{
    paymentMethod: PaymentMethod;
    amount: number;
    bankAccountId?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body: PayQuotaInput = await request.json();
    const { quotaId, originalTransactionId, cashSessionId, payments } = body;

    // Validar que no haya crédito interno en los pagos
    if (payments.some(p => p.paymentMethod === PaymentMethod.INTERNAL_CREDIT)) {
      throw new Error('No se puede pagar una cuota con crédito interno');
    }

    const dataSource = await getDataSource();

    return await dataSource.transaction(async (manager: EntityManager) => {
      // 1. Obtener la transacción original
      const originalTx = await manager.findOne(Transaction, {
        where: { id: originalTransactionId }
      }) as Transaction | null;

      if (!originalTx) {
        throw new Error('Transacción original no encontrada');
      }

      // 2. Obtener sesión de caja
      const cashSession = await manager.findOne(CashSession, {
        where: { id: cashSessionId }
      });

      if (!cashSession) {
        throw new Error('Sesión de caja no encontrada');
      }

      const pointOfSale = await manager.findOne(PointOfSale, {
        where: { id: cashSession.pointOfSaleId }
      });

      const user = await manager.findOne(User, {
        where: { id: cashSession.userId }
      });

      if (!pointOfSale || !user) {
        throw new Error('Datos de sesión incompletos');
      }

      // 3. Crear transacciones de pago
      for (const p of payments) {
        const paymentTx = manager.create(Transaction) as Transaction;
        paymentTx.documentNumber = `QPY-${originalTx.documentNumber}-${Date.now()}`;
        paymentTx.transactionType = TransactionType.PAYMENT_IN;
        paymentTx.status = TransactionStatus.CONFIRMED;
        paymentTx.branchId = pointOfSale.branchId;
        paymentTx.pointOfSaleId = pointOfSale.id;
        paymentTx.cashSessionId = cashSession.id;
        paymentTx.customerId = originalTx.customerId;
        paymentTx.userId = user.id;
        paymentTx.subtotal = p.amount;
        paymentTx.taxAmount = 0;
        paymentTx.discountAmount = 0;
        paymentTx.total = p.amount;
        paymentTx.paymentMethod = p.paymentMethod;
        paymentTx.relatedTransactionId = originalTx.id;
        paymentTx.metadata = {
          paidQuotaId: quotaId,
          originalTransactionId,
          bankAccountId: p.bankAccountId,
        };

        await manager.save(Transaction, paymentTx);

        // Registrar en contabilidad
        await recordPayment(manager, paymentTx, p.bankAccountId);
      }

      return NextResponse.json({
        success: true,
        message: 'Pago de cuota registrado correctamente',
      });
    });

  } catch (error) {
    console.error('Error paying quota:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error al procesar pago de cuota' },
      { status: 500 }
    );
  }
}
