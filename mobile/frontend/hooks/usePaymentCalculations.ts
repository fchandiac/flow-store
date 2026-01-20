import { useMemo } from 'react';
import { PaymentCard } from '../store/usePosStore';

interface UsePaymentCalculationsProps {
  paymentCards: PaymentCard[];
  totalToPay: number;
}

interface PaymentCalculations {
  totalPaid: number;
  change: number;
  remaining: number;
  isValid: boolean;
  canFinalize: boolean;
}

export function usePaymentCalculations({
  paymentCards,
  totalToPay,
}: UsePaymentCalculationsProps): PaymentCalculations {
  return useMemo(() => {
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
    const remaining = Math.max(0, totalToPay - totalPaid + change);

    // Validaciones
    const hasExcessNonCash = paymentCards.some(card => {
      if (card.type === 'CASH') return false;
      if (card.type === 'INTERNAL_CREDIT' && card.subPayments) {
        return card.subPayments.some(sub => sub.amount > totalToPay);
      }
      return card.amount > totalToPay;
    });

    const isValid = !hasExcessNonCash && totalPaid >= totalToPay;
    const canFinalize = isValid && remaining === 0;

    return {
      totalPaid,
      change,
      remaining,
      isValid,
      canFinalize,
    };
  }, [paymentCards, totalToPay]);
}