const DEFAULT_SHORT_MESSAGE =
  'No hay saldo suficiente en la cuenta de caja general para realizar la operación.';

export function sanitizeCashAccountMessage(message: string | null | undefined): string {
  if (!message) {
    return DEFAULT_SHORT_MESSAGE;
  }

  if (!message.includes('1.1.01')) {
    return message;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes('apertura')) {
    if (normalized.includes('supera') || normalized.includes('excede')) {
      return 'El monto de apertura supera el saldo disponible en la cuenta de caja general.';
    }
    if (normalized.includes('no hay saldo disponible')) {
      return 'No hay saldo suficiente en la cuenta de caja general para abrir la caja.';
    }
  }

  if (normalized.includes('ingreso')) {
    if (normalized.includes('supera') || normalized.includes('excede')) {
      return 'El monto del ingreso supera el saldo disponible en la cuenta de caja general.';
    }
    if (normalized.includes('no hay saldo disponible')) {
      return 'No hay saldo suficiente en la cuenta de caja general para registrar el ingreso.';
    }
  }

  return DEFAULT_SHORT_MESSAGE;
}
