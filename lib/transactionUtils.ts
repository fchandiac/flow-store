// Utility functions for transaction types
export function translateTransactionType(type: string): string {
  const translations: Record<string, string> = {
    TRAY_ADJUSTMENT: 'Ajuste de Bandejas',
    TRAY_IN_FROM_PRODUCER: 'Entrada desde Productor - Recepción',
    TRAY_OUT_TO_PRODUCER: 'Salida a Productor - Recepción',
    TRAY_OUT_TO_CLIENT: 'Salida a Cliente',
    TRAY_IN_FROM_CLIENT: 'Entrada desde Cliente',
    TRAY_RECEPTION_FROM_PRODUCER: 'Recepción desde Productor',
    TRAY_RECEPTION_FROM_CLIENT: 'Recepción desde Cliente',
    TRAY_DELIVERY_TO_PRODUCER: 'Entrega a Productor',
    TRAY_DELIVERY_TO_CLIENT: 'Entrega a Cliente',
    RECEPTION: 'Recepción',
    PALLET_TRAY_ASSIGNMENT: 'Asignación Bandeja-Pallet',
    PALLET_TRAY_RELEASE: 'Liberación Bandeja-Pallet',
    ADVANCE: 'Anticipo',
    SETTLEMENT: 'Liquidación',
    DISPATCH: 'Despacho',
  };

  return translations[type] || type;
}

/**
 * Action translations for audit descriptions
 */
const ACTION_TRANSLATIONS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
};

/**
 * Generates a Spanish description for a transaction audit
 * @param action - The audit action (CREATE, UPDATE, DELETE)
 * @param transactionType - The type of transaction
 * @param entityId - The transaction ID
 */
export function generateTransactionAuditDescription(
  action: string,
  transactionType: string,
  entityId: string
): string {
  const translatedAction = ACTION_TRANSLATIONS[action] || action;
  const translatedType = translateTransactionType(transactionType);

  return `${translatedAction} de transacción de ${translatedType.toLowerCase()} (ID: ${entityId})`;
}