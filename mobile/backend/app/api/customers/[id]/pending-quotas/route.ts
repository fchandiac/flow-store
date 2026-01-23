import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/src/db';
import { Transaction, TransactionType, PaymentMethod, TransactionStatus } from '@/data/entities/Transaction';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const ds = await getDataSource();
    const repo = ds.getRepository(Transaction);

    // 1. Buscar todas las transacciones de crédito interno del cliente (Legacy)
    const creditTransactions = await repo.find({
      where: {
        customerId,
        transactionType: TransactionType.PAYMENT_IN,
        paymentMethod: PaymentMethod.INTERNAL_CREDIT,
        status: TransactionStatus.CONFIRMED,
      },
      order: { createdAt: 'DESC' }
    });

    // 2. Buscar ventas con crédito interno en metadata (Nuevo)
    const salesWithCredit = await repo.find({
      where: {
        customerId,
        transactionType: TransactionType.SALE,
        status: TransactionStatus.CONFIRMED,
      },
      order: { createdAt: 'DESC' }
    });

    // 3. Buscar todos los pagos que referencian a estas transacciones
    const payments = await repo.find({
      where: {
        customerId,
        transactionType: TransactionType.PAYMENT_IN,
        status: TransactionStatus.CONFIRMED,
      }
    });

    // Crear un mapa de cuotas pagadas
    const paidQuotaIds = new Set<string>();
    payments.forEach(p => {
      // @ts-ignore - metadata is any
      if (p.metadata?.paidQuotaId) {
        // @ts-ignore
        paidQuotaIds.add(p.metadata.paidQuotaId);
      }
    });

    const pendingQuotas: any[] = [];

    // Procesar cuotas de transacciones PAYMENT_IN (Legacy)
    for (const tx of creditTransactions) {
      // @ts-ignore
      const subPayments = (tx.metadata?.subPayments as any[]) || [];
      
      subPayments.forEach((sp: any, index: number) => {
        const quotaId = sp.id || `${tx.id}-${index + 1}`;
        if (!paidQuotaIds.has(quotaId)) {
          pendingQuotas.push({
            id: quotaId,
            transactionId: tx.id,
            documentNumber: tx.documentNumber,
            amount: Number(sp.amount),
            dueDate: sp.dueDate,
            createdAt: tx.createdAt,
          });
        }
      });
    }

    // Procesar cuotas de transacciones SALE (Nuevo)
    for (const tx of salesWithCredit) {
      // @ts-ignore
      const subPayments = (tx.metadata?.internalCreditQuotas as any[]) || [];
      
      subPayments.forEach((sp: any, index: number) => {
        const quotaId = sp.id || `${tx.id}-${index + 1}`;
        if (!paidQuotaIds.has(quotaId)) {
          pendingQuotas.push({
            id: quotaId,
            transactionId: tx.id,
            documentNumber: tx.documentNumber,
            amount: Number(sp.amount),
            dueDate: sp.dueDate,
            createdAt: tx.createdAt,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      quotas: pendingQuotas,
    });

  } catch (error) {
    console.error('Error fetching pending quotas:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener cuotas pendientes' },
      { status: 500 }
    );
  }
}
