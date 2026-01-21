import { useMemo } from 'react';
import { PaymentCard, PosCustomer } from '../store/usePosStore';

interface UsePaymentCalculationsProps {
  paymentCards: PaymentCard[];
  totalToPay: number;
  selectedCustomer?: PosCustomer | null;
}

interface PaymentCalculations {
  totalPaid: number;
  change: number;
  remaining: number;
  isValid: boolean;
  canFinalize: boolean;
  nonCashExceedsTotal: boolean;
  internalCreditExceedsBalance: boolean;
}

export function usePaymentCalculations({
  paymentCards,
  totalToPay,
  selectedCustomer,
}: UsePaymentCalculationsProps): PaymentCalculations {
  return useMemo(() => {
    // Calcular total de crédito interno
    const internalCreditTotal = paymentCards
      .filter(card => card.type === 'INTERNAL_CREDIT')
      .reduce((sum, card) => {
        if (card.subPayments) {
          return sum + card.subPayments.reduce((subSum, sub) => subSum + sub.amount, 0);
        }
        return sum + card.amount;
      }, 0);

    // Calcular total pagado (suma de todos los montos de las tarjetas)
    const totalPaid = paymentCards.reduce((sum, card) => {
      // Para crédito interno, sumar los sub-pagos
      if (card.type === 'INTERNAL_CREDIT' && card.subPayments) {
        return sum + card.subPayments.reduce((subSum, sub) => subSum + sub.amount, 0);
      }
      return sum + card.amount;
    }, 0);

    // Calcular vuelto (solo efectivo puede generar vuelto)
    const cashPayments = paymentCards
      .filter(card => card.type === 'CASH')
      .reduce((sum, card) => sum + card.amount, 0);

    const nonCashPayments = paymentCards
      .filter(card => card.type !== 'CASH')
      .reduce((sum, card) => {
        if (card.type === 'INTERNAL_CREDIT' && card.subPayments) {
          return sum + card.subPayments.reduce((subSum, sub) => subSum + sub.amount, 0);
        }
        return sum + card.amount;
      }, 0);

    // El vuelto solo se calcula si los pagos en efectivo exceden el saldo restante
    const remainingAfterNonCash = Math.max(0, totalToPay - nonCashPayments);
    const change = Math.max(0, cashPayments - remainingAfterNonCash);

    // Saldo restante (después de aplicar todos los pagos)
    // Usamos Math.max(0, ...) para evitar negativos ínfimos por precisión de punto flotante
    const remaining = Math.max(0, totalToPay - (totalPaid - change));

    // Validaciones
    // 1. No pueden haber montos negativos
    const hasNegativePayments = paymentCards.some(card => {
      if (card.type === 'INTERNAL_CREDIT' && card.subPayments) {
        return card.subPayments.some(sub => sub.amount < 0);
      }
      return card.amount < 0;
    });

    // 2. Los pagos que NO son efectivo NO pueden superar el total de la venta
    // Usamos un pequeño margen de 0.1 para evitar problemas con decimales
    const nonCashExceedsTotal = nonCashPayments > (totalToPay + 0.1);

    // 3. El total pagado debe cubrir el total de la venta (con una pequeña tolerancia para decimales)
    const coversTotal = (totalPaid - change) >= (totalToPay - 0.1);

    // 4. El crédito interno no puede superar el crédito disponible del cliente
    const availableCredit = selectedCustomer?.availableCredit ?? 0;
    const internalCreditExceedsBalance = internalCreditTotal > (availableCredit + 0.1);

    // 5. Si hay exceso, solo puede ser por pagos en efectivo (vuelto)
    const isValid = !hasNegativePayments && !nonCashExceedsTotal && !internalCreditExceedsBalance && coversTotal;
    
    // Se puede finalizar si es válido y el saldo restante es casi 0 (tolerancia de 0.1 por redondeos)
    const canFinalize = isValid && remaining <= 0.1;

    return {
      totalPaid,
      change,
      remaining,
      isValid,
      canFinalize,
      nonCashExceedsTotal,
      internalCreditExceedsBalance,
    };
  }, [paymentCards, totalToPay, selectedCustomer]);
}