import { NextResponse } from 'next/server';
import { getDataSource } from '../../../../src/db';
import { CashSession, CashSessionStatus } from '@/data/entities/CashSession';
import { PointOfSale } from '@/data/entities/PointOfSale';
import { User } from '@/data/entities/User';
import {
  PaymentMethod,
} from '@/data/entities/Transaction';
import {
  createSaleTransaction,
  SaleCreationError,
  SaleLineInput,
} from '../../../../src/services/saleService';

interface SaleLineRequest {
  productVariantId?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxId?: string;
  taxRate?: number;
  taxAmount?: number;
  notes?: string;
  unitCost?: number;
}

interface CreateSaleRequest {
  userName?: string;
  pointOfSaleId?: string;
  cashSessionId?: string;
  paymentMethod?: string;
  customerId?: string;
  documentNumber?: string;
  externalReference?: string;
  notes?: string;
  metadata?: Record<string, any> | null;
  amountPaid?: number;
  changeAmount?: number;
  bankAccountKey?: string | null;
  storageId?: string;
  lines?: SaleLineRequest[];
}

type TransactionResult =
  | { kind: 'NOT_FOUND'; resource: NotFoundResource }
  | { kind: 'SESSION_MISMATCH' }
  | { kind: 'SESSION_STATUS'; status: CashSessionStatus }
  | { kind: 'SUCCESS'; payload: Awaited<ReturnType<typeof createSaleTransaction>> };

type NotFoundResource = 'user' | 'pointOfSale' | 'cashSession';

export async function POST(request: Request) {
  try {
    const body: CreateSaleRequest = await request.json();

    const userName = body.userName?.trim();
    const pointOfSaleId = body.pointOfSaleId?.trim();
    const cashSessionId = body.cashSessionId?.trim();
    const paymentMethod = parsePaymentMethod(body.paymentMethod);

    if (!userName || !pointOfSaleId || !cashSessionId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message:
            'userName, pointOfSaleId, cashSessionId y paymentMethod son obligatorios y deben ser válidos.',
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Debes enviar al menos una línea de venta.' },
        { status: 400 },
      );
    }

    const sanitizedLines: SaleLineInput[] = [];
    for (let index = 0; index < body.lines.length; index += 1) {
      const rawLine = body.lines[index];
      const trimmedVariantId = rawLine?.productVariantId?.trim();
      const quantity = typeof rawLine?.quantity === 'number' ? rawLine.quantity : Number(rawLine?.quantity);
      const unitPrice =
        typeof rawLine?.unitPrice === 'number' ? rawLine.unitPrice : Number(rawLine?.unitPrice);

      if (!trimmedVariantId || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
        return NextResponse.json(
          {
            success: false,
            message: `La línea ${index + 1} debe incluir productVariantId, quantity y unitPrice válidos.`,
          },
          { status: 400 },
        );
      }

      sanitizedLines.push({
        productVariantId: trimmedVariantId,
        quantity,
        unitPrice,
        discountAmount: sanitizeNumberNullable(rawLine?.discountAmount),
        taxId: rawLine?.taxId?.trim() || undefined,
        taxRate: sanitizeNumberNullable(rawLine?.taxRate),
        taxAmount: sanitizeNumberNullable(rawLine?.taxAmount),
        notes: rawLine?.notes?.trim() || undefined,
        unitCost: sanitizeNumberNullable(rawLine?.unitCost),
      });
    }

    const amountPaid = sanitizeNumberNullable(body.amountPaid);
    const changeAmount = sanitizeNumberNullable(body.changeAmount);
    const customerId = normalizeString(body.customerId);
    const documentNumber = normalizeString(body.documentNumber);
    const externalReference = normalizeString(body.externalReference);
    const notes = normalizeString(body.notes);
    const storageId = normalizeString(body.storageId);
    const bankAccountKey = normalizeString(body.bankAccountKey);
    const metadata = isPlainRecord(body.metadata) ? body.metadata : undefined;

    const dataSource = await getDataSource();

    const result = await dataSource.transaction(async (manager): Promise<TransactionResult> => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { userName } });
      if (!user) {
        return { kind: 'NOT_FOUND', resource: 'user' };
      }

      const pointOfSaleRepo = manager.getRepository(PointOfSale);
      const pointOfSale = await pointOfSaleRepo.findOne({ where: { id: pointOfSaleId } });
      if (!pointOfSale) {
        return { kind: 'NOT_FOUND', resource: 'pointOfSale' };
      }

      const cashSessionRepo = manager.getRepository(CashSession);
      const cashSession = await cashSessionRepo.findOne({ where: { id: cashSessionId } });
      if (!cashSession) {
        return { kind: 'NOT_FOUND', resource: 'cashSession' };
      }

      if (cashSession.status !== CashSessionStatus.OPEN) {
        return { kind: 'SESSION_STATUS', status: cashSession.status };
      }

      if (cashSession.pointOfSaleId && cashSession.pointOfSaleId !== pointOfSale.id) {
        return { kind: 'SESSION_MISMATCH' };
      }

      const payload = await createSaleTransaction(manager, {
        pointOfSale,
        cashSession,
        user,
        paymentMethod,
        lines: sanitizedLines,
        customerId,
        documentNumber,
        externalReference,
        notes,
        metadata: metadata ?? null,
        amountPaid: amountPaid ?? undefined,
        changeAmount: changeAmount ?? undefined,
        bankAccountKey: bankAccountKey ?? null,
        storageId,
      });

      return { kind: 'SUCCESS', payload };
    });

    if (result.kind === 'NOT_FOUND') {
      const resourceName = translateResource(result.resource);
      return NextResponse.json(
        { success: false, message: `No se encontró ${resourceName} solicitado.` },
        { status: 404 },
      );
    }

    if (result.kind === 'SESSION_STATUS') {
      return NextResponse.json(
        {
          success: false,
          message: `La sesión de caja debe estar abierta para registrar ventas (estado actual: ${result.status}).`,
        },
        { status: 409 },
      );
    }

    if (result.kind === 'SESSION_MISMATCH') {
      return NextResponse.json(
        {
          success: false,
          message: 'La sesión de caja indicada no pertenece al punto de venta recibido.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        transaction: result.payload.transaction,
        lines: result.payload.lines,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SaleCreationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error('[cash-sessions/sales] Error processing request', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

function parsePaymentMethod(raw: string | undefined): PaymentMethod | null {
  if (!raw) {
    return null;
  }
  const upper = raw.trim().toUpperCase();
  const allowed = Object.values(PaymentMethod) as string[];
  return allowed.includes(upper) ? (upper as PaymentMethod) : null;
}

function sanitizeNumberNullable(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return numeric;
}

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

function isPlainRecord(value: unknown): Record<string, any> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, any>;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
