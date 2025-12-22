export const ABILITY_VALUES = [
  // Dashboard
  'DASHBOARD_MENU',
  // Receptions
  'RECEPTIONS_MENU', 'RECEPTIONS_CREATE_MENU', 'RECEPTIONS_DELETE',
  'RECEPTIONS_UPDATE_IMPURITY', 'RECEPTIONS_UPDATE_PRICE', 'RECEPTIONS_UPDATE_DATE', 'RECEPTIONS_PRINT_DETAIL',
  // Producers
  'PRODUCERS_MENU', 'PRODUCERS_CREATE', 'PRODUCERS_UPDATE', 'PRODUCERS_DELETE',
  'PRODUCERS_PRINT_DETAIL', 'PRODUCERS_CREATE_BANK_ACCOUNT', 'PRODUCERS_UPDATE_BANK_ACCOUNT', 'PRODUCERS_DELETE_BANK_ACCOUNT',
  // Productive Units
  'PRODUCTIVE_UNITS_MENU', 'PRODUCTIVE_UNITS_CREATE', 'PRODUCTIVE_UNITS_UPDATE', 'PRODUCTIVE_UNITS_DELETE',
  // Seasons
  'SEASONS_MENU', 'SEASONS_CREATE', 'SEASONS_UPDATE', 'SEASONS_DELETE',
  // Advances
  'ADVANCES_MENU', 'ADVANCES_CREATE', 'ADVANCES_DELETE', 'ADVANCES_PRINT_RECEIPT', 'ADVANCES_DETAIL', 'ADVANCES_UPDATE_DATE',
  // Settlements
  'SETTLEMENTS_MENU', 'SETTLEMENTS_VIEW', 'SETTLEMENTS_CREATE', 'SETTLEMENTS_UPDATE', 'SETTLEMENTS_DELETE', 'SETTLEMENTS_PRINT_DETAIL', 'SETTLEMENTS_UPDATE_DATE',
  // Admin Bank Accounts
  'ADMIN_BANK_ACCOUNTS_MENU', 'ADMIN_BANK_ACCOUNTS_VIEW', 'ADMIN_BANK_ACCOUNTS_CREATE',
  'ADMIN_BANK_ACCOUNTS_UPDATE', 'ADMIN_BANK_ACCOUNTS_DELETE',
  // Customers
  'CUSTOMERS_MENU', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE', 'CUSTOMERS_DELETE',
  // Dispatches
  'DISPATCHES_MENU', 'DISPATCHES_CREATE', 'DISPATCHES_PRINT_DETAIL',
  'DISPATCHES_UPDATE_DATE', 'DISPATCHES_UPDATE_PRICE', 'DISPATCHES_UPDATE_PALLETS',
  // Varieties
  'VARIETIES_MENU', 'VARIETIES_CREATE', 'VARIETIES_UPDATE', 'VARIETIES_DELETE',
  // Formats
  'FORMATS_MENU', 'FORMATS_CREATE', 'FORMATS_UPDATE', 'FORMATS_DELETE',
  // Trays
  'TRAYS_MENU', 'TRAYS_CREATE', 'TRAYS_UPDATE', 'TRAYS_DELETE',
  'TRAYS_AJUST_STOCK', 'TRAYS_DELIVERY', 'TRAYS_RECEPTION',
  // Audit
  'AUDIT_MENU',
  // Users
  'USERS_MENU', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
] as const;

export type AbilityValue = typeof ABILITY_VALUES[number];

export type PermissionDefinition = {
  ability: AbilityValue;
  label: string;
  description: string;
};

const definitions: PermissionDefinition[] = [
  // Dashboard
  { ability: 'DASHBOARD_MENU', label: 'Menú dashboard', description: 'Permite acceder al menú del dashboard.' },
  
  // Receptions
  { ability: 'RECEPTIONS_MENU', label: 'Menú recepciones', description: 'Permite acceder al menú de recepciones.' },
  { ability: 'RECEPTIONS_CREATE_MENU', label: 'Crear recepción', description: 'Autoriza la creación de nuevas recepciones.' },
  { ability: 'RECEPTIONS_DELETE', label: 'Eliminar recepciones', description: 'Permite eliminar recepciones existentes.' },
  { ability: 'RECEPTIONS_UPDATE_IMPURITY', label: 'Actualizar impureza', description: 'Permite modificar el porcentaje de impureza de una recepción.' },
  { ability: 'RECEPTIONS_UPDATE_PRICE', label: 'Actualizar precio recepción', description: 'Permite modificar el precio de una recepción.' },
  { ability: 'RECEPTIONS_UPDATE_DATE', label: 'Actualizar fecha recepción', description: 'Permite modificar la fecha de una recepción.' },
  { ability: 'RECEPTIONS_PRINT_DETAIL', label: 'Imprimir detalle recepción', description: 'Permite imprimir el detalle de una recepción.' },
  
  // Producers
  { ability: 'PRODUCERS_MENU', label: 'Menú productores', description: 'Permite acceder al menú de productores.' },
  { ability: 'PRODUCERS_CREATE', label: 'Crear productores', description: 'Autoriza la creación de nuevos productores.' },
  { ability: 'PRODUCERS_UPDATE', label: 'Editar productores', description: 'Habilita la modificación de información de productores.' },
  { ability: 'PRODUCERS_DELETE', label: 'Eliminar productores', description: 'Permite desactivar o eliminar productores.' },
  { ability: 'PRODUCERS_PRINT_DETAIL', label: 'Imprimir detalle productor', description: 'Permite imprimir el detalle de un productor.' },
  { ability: 'PRODUCERS_CREATE_BANK_ACCOUNT', label: 'Crear cuenta bancaria productor', description: 'Permite agregar cuentas bancarias a productores.' },
  { ability: 'PRODUCERS_UPDATE_BANK_ACCOUNT', label: 'Editar cuenta bancaria productor', description: 'Permite modificar cuentas bancarias de productores.' },
  { ability: 'PRODUCERS_DELETE_BANK_ACCOUNT', label: 'Eliminar cuenta bancaria productor', description: 'Permite eliminar cuentas bancarias de productores.' },
  
  // Productive Units
  { ability: 'PRODUCTIVE_UNITS_MENU', label: 'Menú unidades productivas', description: 'Permite acceder al menú de unidades productivas.' },
  { ability: 'PRODUCTIVE_UNITS_CREATE', label: 'Crear unidades productivas', description: 'Autoriza la creación de nuevas unidades productivas.' },
  { ability: 'PRODUCTIVE_UNITS_UPDATE', label: 'Editar unidades productivas', description: 'Habilita la modificación de información de unidades productivas.' },
  { ability: 'PRODUCTIVE_UNITS_DELETE', label: 'Eliminar unidades productivas', description: 'Permite desactivar o eliminar unidades productivas.' },
  
  // Seasons
  { ability: 'SEASONS_MENU', label: 'Menú temporadas', description: 'Permite acceder al menú de temporadas.' },
  { ability: 'SEASONS_CREATE', label: 'Crear temporadas', description: 'Autoriza la creación de nuevas temporadas.' },
  { ability: 'SEASONS_UPDATE', label: 'Editar temporadas', description: 'Habilita la modificación de información de temporadas.' },
  { ability: 'SEASONS_DELETE', label: 'Eliminar temporadas', description: 'Permite desactivar o eliminar temporadas.' },
  
  // Advances
  { ability: 'ADVANCES_MENU', label: 'Menú anticipos', description: 'Permite acceder al menú de anticipos.' },
  { ability: 'ADVANCES_CREATE', label: 'Crear anticipos', description: 'Autoriza la creación de nuevos anticipos.' },
  { ability: 'ADVANCES_DELETE', label: 'Eliminar anticipos', description: 'Permite eliminar anticipos existentes.' },
  { ability: 'ADVANCES_PRINT_RECEIPT', label: 'Imprimir recibo anticipo', description: 'Permite imprimir el recibo de un anticipo.' },
  { ability: 'ADVANCES_DETAIL', label: 'Ver detalle anticipo', description: 'Permite ver el detalle completo de un anticipo.' },
  { ability: 'ADVANCES_UPDATE_DATE', label: 'Editar fecha anticipo', description: 'Permite modificar la fecha de registro de un anticipo.' },
  
  // Settlements
  { ability: 'SETTLEMENTS_MENU', label: 'Menú liquidaciones', description: 'Permite acceder al menú de liquidaciones.' },
  { ability: 'SETTLEMENTS_VIEW', label: 'Ver liquidaciones', description: 'Permite visualizar la lista y detalles de liquidaciones.' },
  { ability: 'SETTLEMENTS_CREATE', label: 'Crear liquidaciones', description: 'Autoriza la creación de nuevas liquidaciones.' },
  { ability: 'SETTLEMENTS_UPDATE', label: 'Editar liquidaciones', description: 'Habilita la modificación de liquidaciones en borrador.' },
  { ability: 'SETTLEMENTS_DELETE', label: 'Eliminar liquidaciones', description: 'Permite eliminar liquidaciones existentes.' },
  { ability: 'SETTLEMENTS_PRINT_DETAIL', label: 'Imprimir detalle liquidación', description: 'Permite imprimir el detalle de una liquidación.' },
  { ability: 'SETTLEMENTS_UPDATE_DATE', label: 'Editar fecha liquidación', description: 'Permite modificar la fecha de registro de una liquidación en borrador.' },
  
  // Admin Bank Accounts
  { ability: 'ADMIN_BANK_ACCOUNTS_MENU', label: 'Menú cuentas bancarias', description: 'Permite acceder al menú de cuentas bancarias administrativas.' },
  { ability: 'ADMIN_BANK_ACCOUNTS_VIEW', label: 'Ver cuentas bancarias', description: 'Permite visualizar las cuentas bancarias administrativas.' },
  { ability: 'ADMIN_BANK_ACCOUNTS_CREATE', label: 'Crear cuenta bancaria', description: 'Autoriza la creación de nuevas cuentas bancarias administrativas.' },
  { ability: 'ADMIN_BANK_ACCOUNTS_UPDATE', label: 'Editar cuenta bancaria', description: 'Habilita la modificación de cuentas bancarias administrativas.' },
  { ability: 'ADMIN_BANK_ACCOUNTS_DELETE', label: 'Eliminar cuenta bancaria', description: 'Permite eliminar cuentas bancarias administrativas.' },
  
  // Customers
  { ability: 'CUSTOMERS_MENU', label: 'Menú clientes', description: 'Permite acceder al menú de clientes.' },
  { ability: 'CUSTOMERS_CREATE', label: 'Crear clientes', description: 'Autoriza la creación de nuevos clientes.' },
  { ability: 'CUSTOMERS_UPDATE', label: 'Editar clientes', description: 'Habilita la modificación de información de clientes.' },
  { ability: 'CUSTOMERS_DELETE', label: 'Eliminar clientes', description: 'Permite desactivar o eliminar clientes.' },
  
  // Dispatches
  { ability: 'DISPATCHES_MENU', label: 'Menú despachos', description: 'Permite acceder al menú de despachos.' },
  { ability: 'DISPATCHES_CREATE', label: 'Crear despachos', description: 'Autoriza la creación de nuevos despachos.' },
  { ability: 'DISPATCHES_PRINT_DETAIL', label: 'Imprimir detalle despacho', description: 'Permite imprimir el detalle de un despacho.' },
  { ability: 'DISPATCHES_UPDATE_DATE', label: 'Actualizar fecha despacho', description: 'Permite modificar la fecha de un despacho.' },
  { ability: 'DISPATCHES_UPDATE_PRICE', label: 'Actualizar precio despacho', description: 'Permite modificar el precio de un despacho.' },
  { ability: 'DISPATCHES_UPDATE_PALLETS', label: 'Actualizar pallets despacho', description: 'Permite modificar los pallets de un despacho.' },
  
  // Varieties
  { ability: 'VARIETIES_MENU', label: 'Menú variedades', description: 'Permite acceder al menú de variedades.' },
  { ability: 'VARIETIES_CREATE', label: 'Crear variedades', description: 'Autoriza la creación de nuevas variedades.' },
  { ability: 'VARIETIES_UPDATE', label: 'Editar variedades', description: 'Habilita la modificación de información de variedades.' },
  { ability: 'VARIETIES_DELETE', label: 'Eliminar variedades', description: 'Permite desactivar o eliminar variedades.' },
  
  // Formats
  { ability: 'FORMATS_MENU', label: 'Menú formatos', description: 'Permite acceder al menú de formatos.' },
  { ability: 'FORMATS_CREATE', label: 'Crear formatos', description: 'Autoriza la creación de nuevos formatos.' },
  { ability: 'FORMATS_UPDATE', label: 'Editar formatos', description: 'Habilita la modificación de información de formatos.' },
  { ability: 'FORMATS_DELETE', label: 'Eliminar formatos', description: 'Permite desactivar o eliminar formatos.' },
  
  // Trays
  { ability: 'TRAYS_MENU', label: 'Menú bandejas', description: 'Permite acceder al menú de bandejas.' },
  { ability: 'TRAYS_CREATE', label: 'Crear bandejas', description: 'Autoriza la creación de nuevas bandejas.' },
  { ability: 'TRAYS_UPDATE', label: 'Editar bandejas', description: 'Habilita la modificación de información de bandejas.' },
  { ability: 'TRAYS_DELETE', label: 'Eliminar bandejas', description: 'Permite desactivar o eliminar bandejas.' },
  { ability: 'TRAYS_AJUST_STOCK', label: 'Ajustar stock bandejas', description: 'Permite realizar ajustes de inventario de bandejas.' },
  { ability: 'TRAYS_DELIVERY', label: 'Entregar bandejas', description: 'Permite registrar entregas de bandejas.' },
  { ability: 'TRAYS_RECEPTION', label: 'Recepcionar bandejas', description: 'Permite registrar recepciones de bandejas.' },
  
  // Audit
  { ability: 'AUDIT_MENU', label: 'Menú auditoría', description: 'Permite acceder al menú de auditoría.' },
  
  // Users
  { ability: 'USERS_MENU', label: 'Menú usuarios', description: 'Permite acceder al menú de usuarios.' },
  { ability: 'USERS_CREATE', label: 'Crear usuarios', description: 'Autoriza la creación de nuevas cuentas de usuario.' },
  { ability: 'USERS_UPDATE', label: 'Editar usuarios', description: 'Habilita la modificación de información de usuarios.' },
  { ability: 'USERS_DELETE', label: 'Eliminar usuarios', description: 'Permite desactivar o eliminar usuarios.' },
];

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = definitions;

export const validAbilities = new Set<AbilityValue>(definitions.map((definition) => definition.ability));

export function getPermissionDefinition(ability: AbilityValue): PermissionDefinition | undefined {
  return definitions.find((definition) => definition.ability === ability);
}
