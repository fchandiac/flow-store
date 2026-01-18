/**
 * Translations for Audit DataGrid content
 * Traducciones para el contenido del DataGrid de Auditoría
 */

// =============================================================================
// ENTITY NAME TRANSLATIONS
// =============================================================================

export const ENTITY_NAME_TRANSLATIONS: Record<string, string> = {
  // Core entities
  User: 'Usuario',
  Person: 'Persona',
  Auth: 'Autenticación',

  // Production entities
  Season: 'Temporada',
  Variety: 'Variedad',
  Format: 'Formato',
  Producer: 'Productor',
  Reception: 'Recepción',
  Pallet: 'Pallet',

  // Storage entities
  Storage: 'Almacenamiento',
  Tray: 'Bandeja',

  // Financial entities
  Advance: 'Anticipo',
  Settlement: 'Liquidación',
  Transaction: 'Transacción',

  // Dispatch entities
  Customer: 'Cliente',
  Dispatch: 'Despacho',
};

/**
 * Translates an entity name to Spanish
 */
export function translateEntityName(entityName: string): string {
  return ENTITY_NAME_TRANSLATIONS[entityName] || entityName;
}

// =============================================================================
// ACTION TRANSLATIONS
// =============================================================================

export const ACTION_TRANSLATIONS: Record<string, string> = {
  // CRUD actions
  CREATE: 'Crear',
  READ: 'Leer',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',

  // Auth actions
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGIN_FAILED: 'Inicio de sesión fallido',

  // Special actions
  UPDATE_PASSWORD: 'Cambio de contraseña',
  EXPORT: 'Exportación',

  // Custom actions (found in code)
  'Actualización de fecha de registro': 'Actualización de fecha de registro',
  'Actualización de precio por Kg': 'Actualización de precio por Kg',
};

/**
 * Translates an audit action to Spanish
 */
export function translateAction(action: string): string {
  return ACTION_TRANSLATIONS[action] || action;
}

// =============================================================================
// TRANSACTION TYPE TRANSLATIONS
// =============================================================================

export const TRANSACTION_TYPE_TRANSLATIONS: Record<string, string> = {
  // Tray operations
  TRAY_ADJUSTMENT: 'Ajuste de bandejas',
  TRAY_IN_FROM_PRODUCER: 'Entrada de bandejas desde productor',
  TRAY_OUT_TO_PRODUCER: 'Salida de bandejas hacia productor',
  TRAY_OUT_TO_CLIENT: 'Salida de bandejas hacia cliente',
  TRAY_IN_FROM_CLIENT: 'Entrada de bandejas desde cliente',
  TRAY_RECEPTION_FROM_PRODUCER: 'Recepción de bandejas desde productor',
  TRAY_RECEPTION_FROM_CLIENT: 'Recepción de bandejas desde cliente',
  TRAY_DELIVERY_TO_PRODUCER: 'Entrega de bandejas a productor',
  TRAY_DELIVERY_TO_CLIENT: 'Entrega de bandejas a cliente',

  // Core operations
  SALE: 'Venta',
  PURCHASE: 'Compra',
  PURCHASE_ORDER: 'Orden de compra',
  SALE_RETURN: 'Devolución de venta',
  PURCHASE_RETURN: 'Devolución de compra',
  ADJUSTMENT_IN: 'Ajuste de entrada',
  ADJUSTMENT_OUT: 'Ajuste de salida',
  TRANSFER_IN: 'Transferencia de entrada',
  TRANSFER_OUT: 'Transferencia de salida',
  RECEPTION: 'Recepción',
  PALLET_TRAY_ASSIGNMENT: 'Asignación de bandejas a pallet',
  PALLET_TRAY_RELEASE: 'Liberación de bandejas de pallet',

  // Financial operations
  ADVANCE: 'Anticipo',
  SETTLEMENT: 'Liquidación',
  PAYMENT_IN: 'Pago recibido',
  PAYMENT_OUT: 'Pago realizado',
  OPERATING_EXPENSE: 'Gasto operativo',

  // Dispatch operations
  DISPATCH: 'Despacho',
};

/**
 * Translates a transaction type to Spanish
 */
export function translateTransactionType(type: string): string {
  return TRANSACTION_TYPE_TRANSLATIONS[type] || type;
}

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
  const translatedType = TRANSACTION_TYPE_TRANSLATIONS[transactionType] || transactionType;

  switch (action) {
    case 'CREATE':
      return `Creación de transacción de ${translatedType.toLowerCase()} (ID: ${entityId})`;
    case 'UPDATE':
      return `Actualización de transacción de ${translatedType.toLowerCase()} (ID: ${entityId})`;
    case 'DELETE':
      return `Eliminación de transacción de ${translatedType.toLowerCase()} (ID: ${entityId})`;
    default:
      return `${translatedAction} transacción de ${translatedType.toLowerCase()} (ID: ${entityId})`;
  }
}

// =============================================================================
// FIELD NAME TRANSLATIONS (for changes/oldValues/newValues)
// =============================================================================

export const FIELD_NAME_TRANSLATIONS: Record<string, string> = {
  // Common fields
  id: 'ID',
  createdAt: 'Fecha de creación',
  updatedAt: 'Fecha de actualización',
  deletedAt: 'Fecha de eliminación',
  name: 'Nombre',
  description: 'Descripción',
  active: 'Activo',
  status: 'Estado',
  notes: 'Notas',

  // Person/User fields
  firstName: 'Nombre',
  lastName: 'Apellido',
  fullName: 'Nombre completo',
  email: 'Correo electrónico',
  mail: 'Correo electrónico',
  phone: 'Teléfono',
  address: 'Dirección',
  dni: 'RUT',
  userName: 'Nombre de usuario',
  password: 'Contraseña',
  role: 'Rol',
  permissions: 'Permisos',

  // Production fields
  seasonId: 'ID de temporada',
  varietyId: 'ID de variedad',
  formatId: 'ID de formato',
  producerId: 'ID de productor',
  receptionId: 'ID de recepción',
  palletId: 'ID de pallet',
  year: 'Año',
  startDate: 'Fecha de inicio',
  endDate: 'Fecha de fin',

  // Reception fields
  weight: 'Peso',
  grossWeight: 'Peso bruto',
  netWeight: 'Peso neto',
  tareWeight: 'Peso tara',
  quality: 'Calidad',
  humidity: 'Humedad',
  temperature: 'Temperatura',
  observations: 'Observaciones',

  // Pallet fields
  code: 'Código',
  quantity: 'Cantidad',
  location: 'Ubicación',
  storageId: 'ID de almacenamiento',

  // Storage/Tray fields
  capacity: 'Capacidad',
  currentStock: 'Stock actual',
  trayId: 'ID de bandeja',
  trayName: 'Nombre de bandeja',
  trayCode: 'Código de bandeja',

  // Financial fields
  amount: 'Monto',
  balance: 'Saldo',
  paymentMethod: 'Método de pago',
  paymentDate: 'Fecha de pago',
  dueDate: 'Fecha de vencimiento',
  advanceId: 'ID de anticipo',
  settlementId: 'ID de liquidación',
  transactionId: 'ID de transacción',
  appliedAmount: 'Monto aplicado',
  availableAmount: 'Monto disponible',
  pricePerKg: 'Precio por Kg',
  totalAmount: 'Monto total',

  // Customer/Dispatch fields
  customerId: 'ID de cliente',
  dispatchId: 'ID de despacho',
  dispatchDate: 'Fecha de despacho',
  deliveryAddress: 'Dirección de entrega',

  // Transaction fields
  type: 'Tipo',
  direction: 'Dirección',
  reason: 'Motivo',
  unit: 'Unidad',
  performedBy: 'Realizado por',
  stockBefore: 'Stock anterior',
  stockAfter: 'Stock posterior',

  // Boolean values
  isActive: 'Está activo',
  isDefault: 'Es predeterminado',
  isClosed: 'Está cerrado',
  isCompleted: 'Está completado',
};

/**
 * Translates a field name to Spanish
 */
export function translateFieldName(fieldName: string): string {
  return FIELD_NAME_TRANSLATIONS[fieldName] || fieldName;
}

// =============================================================================
// VALUE TRANSLATIONS (for common values)
// =============================================================================

export const VALUE_TRANSLATIONS: Record<string, string> = {
  // Boolean values
  true: 'Sí',
  false: 'No',

  // Status values
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  CLOSED: 'Cerrado',
  OPEN: 'Abierto',

  // Payment methods
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  CREDIT: 'Crédito',
  INTERNAL_CREDIT: 'Crédito interno',
  MIXED: 'Pago mixto',

  // Direction values
  IN: 'Entrada',
  OUT: 'Salida',

  // Unit values
  KG: 'Kilogramos',
  TRAY: 'Bandeja',
  PALLET: 'Pallet',
  CLP: 'Pesos chilenos',
  USD: 'Dólares',

  // Role values
  ADMIN: 'Administrador',
  USER: 'Usuario',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',

  // Null/undefined
  null: 'Sin valor',
  undefined: 'Sin valor',
  '': 'Vacío',
};

/**
 * Translates a common value to Spanish
 */
export function translateValue(value: unknown): string {
  if (value === null) return VALUE_TRANSLATIONS['null'];
  if (value === undefined) return VALUE_TRANSLATIONS['undefined'];
  if (value === '') return VALUE_TRANSLATIONS[''];

  const stringValue = String(value);
  return VALUE_TRANSLATIONS[stringValue] || stringValue;
}

// =============================================================================
// DESCRIPTION TRANSLATIONS
// =============================================================================

/**
 * Translations for entity names in descriptions (lowercase)
 */
const DESCRIPTION_ENTITY_TRANSLATIONS: Record<string, string> = {
  producer: 'productor',
  customer: 'cliente',
  variety: 'variedad',
  format: 'formato',
  season: 'temporada',
  tray: 'bandeja',
  storage: 'almacenamiento',
  pallet: 'pallet',
  advance: 'anticipo',
  person: 'persona',
  user: 'usuario',
  settlement: 'liquidación',
  reception: 'recepción',
  dispatch: 'despacho',
  transaction: 'transacción',
};

/**
 * Translates an audit description from English to Spanish
 * Handles formats like "CREATE variety 1005", "UPDATE format 1002", etc.
 */
export function translateDescription(description: string | undefined | null): string {
  if (!description) return '-';

  // Pattern: ACTION entity entityId
  // Examples: "CREATE variety 1005", "UPDATE format 1002", "DELETE producer abc-123"
  const pattern = /^(CREATE|UPDATE|DELETE)\s+(\w+)\s+(.+)$/i;
  const match = description.match(pattern);

  if (match) {
    const [, action, entity, entityId] = match;
    const actionUpper = action.toUpperCase();
    const entityLower = entity.toLowerCase();

    const translatedEntity = DESCRIPTION_ENTITY_TRANSLATIONS[entityLower] || entity;

    switch (actionUpper) {
      case 'CREATE':
        return `Creación de ${translatedEntity} ${entityId}`;
      case 'UPDATE':
        return `Actualización de ${translatedEntity} ${entityId}`;
      case 'DELETE':
        return `Eliminación de ${translatedEntity} ${entityId}`;
      default:
        return description;
    }
  }

  // If it doesn't match the pattern, return as-is (might already be in Spanish)
  return description;
}

// =============================================================================
// JSON TRANSLATIONS (for changes object)
// =============================================================================

/**
 * Recursively translates a changes object
 * Translates field names, actions, and common values
 */
export function translateChangesObject(
  changes: Record<string, unknown> | unknown
): Record<string, unknown> | unknown {
  if (changes === null || changes === undefined) {
    return changes;
  }

  if (Array.isArray(changes)) {
    return changes.map((item) => translateChangesObject(item));
  }

  if (typeof changes === 'object') {
    const translated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(changes as Record<string, unknown>)) {
      const translatedKey = translateFieldName(key);

      if (typeof value === 'object' && value !== null) {
        translated[translatedKey] = translateChangesObject(value);
      } else if (typeof value === 'boolean') {
        translated[translatedKey] = value ? 'Sí' : 'No';
      } else if (typeof value === 'string' && VALUE_TRANSLATIONS[value]) {
        translated[translatedKey] = VALUE_TRANSLATIONS[value];
      } else {
        translated[translatedKey] = value;
      }
    }

    return translated;
  }

  // For primitive values
  if (typeof changes === 'boolean') {
    return changes ? 'Sí' : 'No';
  }

  if (typeof changes === 'string' && VALUE_TRANSLATIONS[changes]) {
    return VALUE_TRANSLATIONS[changes];
  }

  return changes;
}

/**
 * Formats a changes object as a translated JSON string
 */
export function formatTranslatedChanges(changes: Record<string, unknown> | null | undefined): string {
  if (!changes) return '-';

  const translated = translateChangesObject(changes);
  return JSON.stringify(translated, null, 2);
}
