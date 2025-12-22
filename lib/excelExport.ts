import * as XLSX from 'xlsx';
import { formatAuditDate } from './dateTimeUtils';
import moment from 'moment-timezone';

export interface AuditExcelRow {
  id: string;
  entityName: string;
  action: string;
  description: string;
  userId: string | null;
  createdAt: string;
  oldValues: string;
  newValues: string;
}

export interface ExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  maxRows?: number;
}

/**
 * Formatea datos de auditoría para exportar a Excel
 */
export function formatAuditDataForExcel(auditData: any[]): AuditExcelRow[] {
  return auditData.map((audit) => ({
    id: audit.id,
    entityName: audit.entityName,
    action: audit.action,
    description: audit.description || '-',
    userId: audit.userId || '-',
    createdAt: typeof audit.createdAt === 'string' 
      ? formatAuditDate(audit.createdAt)
      : formatAuditDate(audit.createdAt),
    oldValues: audit.oldValues ? JSON.stringify(audit.oldValues, null, 2) : '-',
    newValues: audit.newValues ? JSON.stringify(audit.newValues, null, 2) : '-',
  }));
}

/**
 * Crea un workbook de Excel con estilos
 */
export function createAuditWorkbook(data: AuditExcelRow[], options: ExcelExportOptions = {}) {
  const {
    sheetName = 'Auditorías',
    maxRows = 10000,
  } = options;

  // Validar límite de filas
  if (data.length > maxRows) {
    console.warn(`Se limitaron los registros a ${maxRows} (total: ${data.length})`);
    data = data.slice(0, maxRows);
  }

  // Crear workbook
  const workbook = XLSX.utils.book_new();

  // Crear hoja de datos
  const dataSheet = XLSX.utils.json_to_sheet(data);

  // Aplicar estilos a los encabezados
  const headerStyle = {
    fill: { fgColor: { rgb: 'FF1F4E78' } }, // Azul oscuro
    font: { bold: true, color: { rgb: 'FFFFFFFF' } }, // Blanco
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  // Aplicar estilos a todas las celdas de encabezado
  const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!dataSheet[address]) continue;
    dataSheet[address].s = headerStyle;
  }

  // Establecer anchos de columna
  const colWidths = [
    { wch: 36 }, // id
    { wch: 15 }, // entityName
    { wch: 12 }, // action
    { wch: 30 }, // description
    { wch: 20 }, // userId
    { wch: 18 }, // createdAt
    { wch: 25 }, // oldValues
    { wch: 25 }, // newValues
  ];
  dataSheet['!cols'] = colWidths;

  // Agregar filtros automáticos
  dataSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName);

  // Crear hoja de resumen (opcional)
  const summaryData = [
    { Métrica: 'Total de Registros', Valor: data.length },
    { Métrica: 'CREATE', Valor: data.filter((d) => d.action === 'CREATE').length },
    { Métrica: 'UPDATE', Valor: data.filter((d) => d.action === 'UPDATE').length },
    { Métrica: 'DELETE', Valor: data.filter((d) => d.action === 'DELETE').length },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

/**
 * Genera un archivo Excel y lo descarga
 */
export function downloadExcelFile(workbook: XLSX.WorkBook, fileName: string) {
  try {
    XLSX.writeFile(workbook, fileName);
    return true;
  } catch (error) {
    console.error('Error descargando Excel:', error);
    return false;
  }
}

/**
 * Genera el nombre del archivo con timestamp
 */
export function generateExcelFileName(prefix = 'auditorias'): string {
  const timestamp = moment().format('DD-MM-YYYY_HHmmss');
  return `${prefix}_${timestamp}.xlsx`;
}

/**
 * Función principal para exportar auditoría a Excel
 */
export function exportAuditToExcel(
  auditData: any[],
  options: ExcelExportOptions = {}
) {
  try {
    // Formatear datos
    const formattedData = formatAuditDataForExcel(auditData);

    // Crear workbook
    const workbook = createAuditWorkbook(formattedData, options);

    // Generar nombre de archivo
    const fileName = options.fileName || generateExcelFileName('auditorias');

    // Descargar
    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ============================================================
 * FUNCIONES PARA EXPORTAR PALLETS A EXCEL
 * ============================================================
 */

export interface PalletExcelRow {
  id: number;
  storageName: string;
  trayName: string;
  traysQuantity: number;
  capacity: number;
  weight: number;
  dispatchWeight: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const PALLET_STATUS_LABEL_MAP: Record<string, string> = {
  AVAILABLE: 'Disponible',
  CLOSED: 'Cerrado',
  FULL: 'Completo',
  DISPATCHED: 'Despachado',
  Disponible: 'Disponible',
  Cerrado: 'Cerrado',
  Completo: 'Completo',
  Despachado: 'Despachado',
};

export function formatPalletsDataForExcel(palletsData: any[]): PalletExcelRow[] {
  return palletsData.map((pallet) => {
    const statusKey = typeof pallet.status === 'string' ? pallet.status : '';
    return {
      id: Number(pallet.id ?? 0),
      storageName: pallet.storageName || '-',
      trayName: pallet.trayName || '-',
      traysQuantity: Number(pallet.traysQuantity ?? 0),
      capacity: Number(pallet.capacity ?? 0),
      weight: Number(pallet.weight ?? 0),
      dispatchWeight: Number(pallet.dispatchWeight ?? 0),
      status: PALLET_STATUS_LABEL_MAP[statusKey] || statusKey || '-',
      createdAt: typeof pallet.createdAt === 'string'
        ? formatAuditDate(pallet.createdAt)
        : formatAuditDate(pallet.createdAt),
      updatedAt: typeof pallet.updatedAt === 'string'
        ? formatAuditDate(pallet.updatedAt)
        : formatAuditDate(pallet.updatedAt),
    };
  });
}

export function createPalletsWorkbook(data: PalletExcelRow[], options: ExcelExportOptions = {}) {
  const {
    sheetName = 'Pallets',
    maxRows = 10000,
  } = options;

  if (data.length > maxRows) {
    console.warn(`Se limitaron los registros a ${maxRows} (total: ${data.length})`);
    data = data.slice(0, maxRows);
  }

  const workbook = XLSX.utils.book_new();

  const dataWithHeaders = data.map(row => ({
    'ID': row.id,
    'Almacenamiento': row.storageName,
    'Bandeja': row.trayName,
    'Bandejas': row.traysQuantity,
    'Capacidad': row.capacity,
    'Peso inicial (kg)': row.weight,
    'Peso despacho (kg)': row.dispatchWeight,
    'Estado': row.status,
    'Creado': row.createdAt,
    'Actualizado': row.updatedAt,
  }));

  const dataSheet = XLSX.utils.json_to_sheet(dataWithHeaders);

  const headerStyle = {
    fill: { fgColor: { rgb: 'FF1F4E78' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!dataSheet[address]) continue;
    dataSheet[address].s = headerStyle;
  }

  const colWidths = [
    { wch: 36 }, // ID
    { wch: 28 }, // Almacenamiento
    { wch: 24 }, // Bandeja
    { wch: 12 }, // Bandejas
    { wch: 12 }, // Capacidad
    { wch: 16 }, // Peso inicial
    { wch: 16 }, // Peso despacho
    { wch: 16 }, // Estado
    { wch: 18 }, // Creado
    { wch: 18 }, // Actualizado
  ];
  dataSheet['!cols'] = colWidths;

  dataSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName);

  const summaryData = [
    { Métrica: 'Total de Registros', Valor: data.length },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

export function exportPalletsToExcel(
  palletsData: any[],
  options: ExcelExportOptions = {}
) {
  try {
    const formattedData = formatPalletsDataForExcel(palletsData);
    const workbook = createPalletsWorkbook(formattedData, options);
    const fileName = options.fileName || generateExcelFileName('pallets');
    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting pallets to Excel:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Interface for Producer Excel rows
 */
export interface ProducerExcelRow {
  id: string;
  name: string;
  dni: string;
  mail: string;
  phone: string;
  address: string;
  pendingAdvances: number;
  pendingReceptions: number;
  balance: number;
}

/**
 * Formatea datos de productores para exportar a Excel
 */
export function formatProducersDataForExcel(producersData: any[]): any[] {
  return producersData.map((producer) => ({
    'ID': producer.id,
    'Nombre': producer.name || '-',
    'DNI/RUT': producer.dni || '-',
    'Correo': producer.mail || '-',
    'Teléfono': producer.phone || '-',
    'Dirección': producer.address || '-',
    'Adelantos Pendientes': Number(producer.pendingAdvances || 0),
    'Recepciones Pendientes': Number(producer.pendingReceptions || 0),
    'Saldo': Number(producer.balance || 0),
  }));
}

/**
 * Crea un workbook de Excel para productores
 */
export function createProducersWorkbook(data: any[], options: ExcelExportOptions = {}) {
  const {
    sheetName = 'Productores',
  } = options;

  const workbook = XLSX.utils.book_new();
  
  // Crear hoja de datos
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Configurar anchos de columna
  worksheet['!cols'] = [
    { wch: 10 }, // id
    { wch: 30 }, // name
    { wch: 15 }, // dni
    { wch: 25 }, // mail
    { wch: 15 }, // phone
    { wch: 35 }, // address
    { wch: 18 }, // pendingAdvances
    { wch: 18 }, // pendingReceptions
    { wch: 15 }, // balance
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Hoja de resumen
  const totalProducers = data.length;
  const totalPendingAdvances = data.reduce((acc, row) => acc + row['Adelantos Pendientes'], 0);
  const totalPendingReceptions = data.reduce((acc, row) => acc + row['Recepciones Pendientes'], 0);
  const totalBalance = data.reduce((acc, row) => acc + row['Saldo'], 0);

  const summaryData = [
    { Métrica: 'Total de Productores', Valor: totalProducers },
    { Métrica: 'Total Adelantos Pendientes', Valor: totalPendingAdvances },
    { Métrica: 'Total Recepciones Pendientes', Valor: totalPendingReceptions },
    { Métrica: 'Balance Total', Valor: totalBalance },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

/**
 * Exporta productores a Excel
 */
export function exportProducersToExcel(
  producersData: any[],
  options: ExcelExportOptions = {}
) {
  try {
    const formattedData = formatProducersDataForExcel(producersData);
    const workbook = createProducersWorkbook(formattedData, options);
    const fileName = options.fileName || generateExcelFileName('productores');
    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting producers to Excel:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ============================================================
 * FUNCIONES PARA EXPORTAR RECEPCIONES A EXCEL
 * ============================================================
 */

export interface ReceptionExcelRow {
  id: string;
  producerName: string;
  guideNumber: string;
  varieties: string;
  totalTrays: number;
  grossWeightKg: number;
  netWeightKg: number;
  payableCLP: number;
  payableUSD: number;
  exchangeRate: number;
  totalCLP: number;
  createdAt: string;
}

export function formatReceptionsDataForExcel(receptionsData: any[]): ReceptionExcelRow[] {
  return receptionsData.map((reception) => {
    const varieties = Array.isArray(reception.varieties)
      ? reception.varieties.filter((value: unknown) => typeof value === 'string' && value.trim() !== '').join(', ')
      : '-';

    return {
      id: typeof reception.id === 'string' ? reception.id : String(reception.id ?? ''),
      producerName: reception.producerName || '-',
      guideNumber: reception.guideNumber || '-',
      varieties: varieties || '-',
      totalTrays: Number(reception.totalTrays ?? 0),
      grossWeightKg: Number(reception.grossWeightKg ?? 0),
      netWeightKg: Number(reception.netWeightKg ?? 0),
      payableCLP: Number(reception.payableCLP ?? 0),
      payableUSD: Number(reception.payableUSD ?? 0),
      exchangeRate: Number(reception.exchangeRate ?? 0),
      totalCLP: Number(reception.totalCLP ?? 0),
      createdAt: reception.createdAt
        ? formatAuditDate(reception.createdAt)
        : '-',
    };
  });
}

export function createReceptionsWorkbook(data: ReceptionExcelRow[], options: ExcelExportOptions = {}) {
  const {
    sheetName = 'Recepciones',
    maxRows = 10000,
  } = options;

  if (data.length > maxRows) {
    console.warn(`Se limitaron los registros a ${maxRows} (total: ${data.length})`);
    data = data.slice(0, maxRows);
  }

  const workbook = XLSX.utils.book_new();

  const dataWithHeaders = data.map(row => ({
    'ID': row.id,
    'Productor': row.producerName,
    'Guía': row.guideNumber,
    'Variedades': row.varieties,
    'Bandejas': row.totalTrays,
    'Peso bruto (kg)': row.grossWeightKg,
    'Peso neto (kg)': row.netWeightKg,
    'CLP': row.payableCLP,
    'USD': row.payableUSD,
    'Cambio': row.exchangeRate,
    'A Pagar (CLP)': row.totalCLP,
    'Creado': row.createdAt,
  }));

  const dataSheet = XLSX.utils.json_to_sheet(dataWithHeaders);

  const headerStyle = {
    fill: { fgColor: { rgb: 'FF1F4E78' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!dataSheet[address]) continue;
    dataSheet[address].s = headerStyle;
  }

  const colWidths = [
    { wch: 20 }, // ID
    { wch: 28 }, // Productor
    { wch: 18 }, // Guía
    { wch: 32 }, // Variedades
    { wch: 16 }, // Bandejas
    { wch: 18 }, // Peso bruto
    { wch: 18 }, // Peso neto
    { wch: 18 }, // CLP
    { wch: 18 }, // USD
    { wch: 14 }, // Cambio
    { wch: 20 }, // A Pagar
    { wch: 20 }, // Creado
  ];
  dataSheet['!cols'] = colWidths;

  dataSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName);

  const totalRows = data.length;
  const totalTrays = data.reduce((acc, row) => acc + Number(row.totalTrays || 0), 0);
  const totalNetWeight = data.reduce((acc, row) => acc + Number(row.netWeightKg || 0), 0);
  const totalPayableCLP = data.reduce((acc, row) => acc + Number(row.payableCLP || 0), 0);
  const totalPayableUSD = data.reduce((acc, row) => acc + Number(row.payableUSD || 0), 0);
  const totalToPayCLP = data.reduce((acc, row) => acc + Number(row.totalCLP || 0), 0);
  const averageExchangeRate = totalRows > 0
    ? Number((data.reduce((acc, row) => acc + Number(row.exchangeRate || 0), 0) / totalRows).toFixed(4))
    : 0;

  const summaryData = [
    { Métrica: 'Total de Registros', Valor: totalRows },
    { Métrica: 'Total Bandejas', Valor: totalTrays },
    { Métrica: 'Peso Neto Total (kg)', Valor: totalNetWeight },
    { Métrica: 'CLP (packs)', Valor: totalPayableCLP },
    { Métrica: 'USD (packs)', Valor: totalPayableUSD },
    { Métrica: 'Cambio promedio', Valor: averageExchangeRate },
    { Métrica: 'A Pagar (CLP)', Valor: totalToPayCLP },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

export function exportReceptionsToExcel(
  receptionsData: any[],
  options: ExcelExportOptions = {}
) {
  try {
    const formattedData = formatReceptionsDataForExcel(receptionsData);
    const workbook = createReceptionsWorkbook(formattedData, options);
    const fileName = options.fileName || generateExcelFileName('recepciones');
    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting receptions to Excel:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ============================================================
 * FUNCIONES PARA EXPORTAR ANTICIPOS A EXCEL
 * ============================================================
 */

export interface AdvanceExcelRow {
  id: string;
  transactionId: string;
  producerName: string;
  seasonName: string;
  paymentMethod: string;
  amount: number;
  appliedAmount: number;
  availableAmount: number;
  status: string;
  createdAt: string;
  notes: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
};

const ADVANCE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Pendiente',
  APPLIED: 'Liquidado',
  CANCELLED: 'Cancelado',
};

export function formatAdvancesDataForExcel(advancesData: any[]): AdvanceExcelRow[] {
  return advancesData.map((advance) => ({
    id: advance.id || '-',
    transactionId: advance.transactionId || '-',
    producerName: advance.producerName || '-',
    seasonName: advance.seasonName || '-',
    paymentMethod: PAYMENT_METHOD_LABELS[advance.paymentMethod] || advance.paymentMethod || '-',
    amount: Number(advance.amount || 0),
    appliedAmount: Number(advance.appliedAmount || 0),
    availableAmount: Number(advance.availableAmount || 0),
    status: ADVANCE_STATUS_LABELS[advance.status] || advance.status || '-',
    createdAt: advance.createdAt ? formatAuditDate(advance.createdAt) : '-',
    notes: advance.notes || '-',
  }));
}

export function createAdvancesWorkbook(data: AdvanceExcelRow[], options: ExcelExportOptions = {}) {
  const {
    sheetName = 'Anticipos',
    maxRows = 10000,
  } = options;

  if (data.length > maxRows) {
    console.warn(`Se limitaron los registros a ${maxRows} (total: ${data.length})`);
    data = data.slice(0, maxRows);
  }

  const workbook = XLSX.utils.book_new();

  const dataWithHeaders = data.map(row => ({
    'Folio': row.transactionId,
    'Productor': row.producerName,
    'Temporada': row.seasonName,
    'Método de Pago': row.paymentMethod,
    'Monto': row.amount,
    'Monto Aplicado': row.appliedAmount,
    'Monto Disponible': row.availableAmount,
    'Estado': row.status,
    'Fecha': row.createdAt,
    'Notas': row.notes,
  }));

  const dataSheet = XLSX.utils.json_to_sheet(dataWithHeaders);

  const headerStyle = {
    fill: { fgColor: { rgb: 'FF1F4E78' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!dataSheet[address]) continue;
    dataSheet[address].s = headerStyle;
  }

  const colWidths = [
    { wch: 16 }, // Folio
    { wch: 28 }, // Productor
    { wch: 18 }, // Temporada
    { wch: 16 }, // Método de Pago
    { wch: 16 }, // Monto
    { wch: 18 }, // Monto Aplicado
    { wch: 18 }, // Monto Disponible
    { wch: 14 }, // Estado
    { wch: 20 }, // Fecha
    { wch: 30 }, // Notas
  ];
  dataSheet['!cols'] = colWidths;

  dataSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName);

  const totalRows = data.length;
  const totalAmount = data.reduce((acc, row) => acc + Number(row.amount || 0), 0);
  const totalApplied = data.reduce((acc, row) => acc + Number(row.appliedAmount || 0), 0);
  const totalAvailable = data.reduce((acc, row) => acc + Number(row.availableAmount || 0), 0);
  const pendingCount = data.filter(row => row.status === 'Pendiente').length;
  const appliedCount = data.filter(row => row.status === 'Liquidado').length;

  const summaryData = [
    { Métrica: 'Total de Registros', Valor: totalRows },
    { Métrica: 'Total Monto', Valor: totalAmount },
    { Métrica: 'Total Aplicado', Valor: totalApplied },
    { Métrica: 'Total Disponible', Valor: totalAvailable },
    { Métrica: 'Anticipos Pendientes', Valor: pendingCount },
    { Métrica: 'Anticipos Liquidados', Valor: appliedCount },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

export function exportAdvancesToExcel(
  advancesData: any[],
  options: ExcelExportOptions = {}
) {
  try {
    const formattedData = formatAdvancesDataForExcel(advancesData);
    const workbook = createAdvancesWorkbook(formattedData, options);
    const fileName = options.fileName || generateExcelFileName('anticipos');
    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting advances to Excel:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * ============================================================
 * FUNCIONES PARA EXPORTAR LIQUIDACIONES A EXCEL
 * ============================================================
 */

export interface SettlementExcelRow {
  id: string;
  transactionId: string;
  producerName: string;
  seasonName: string;
  receptionsCount: number;
  advancesCount: number;
  amount: number;
  status: string;
  createdAt: string;
}

const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  COMPLETED: 'Completada',
};

export function formatSettlementsDataForExcel(settlementsData: any[]): SettlementExcelRow[] {
  return settlementsData.map((settlement) => ({
    id: settlement.id || '-',
    transactionId: settlement.transactionId || '-',
    producerName: settlement.producerName || '-',
    seasonName: settlement.seasonName || '-',
    receptionsCount: Number(settlement.receptionsCount || 0),
    advancesCount: Number(settlement.advancesCount || 0),
    amount: Number(settlement.amount || 0),
    status: SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status || '-',
    createdAt: settlement.createdAt ? formatAuditDate(settlement.createdAt) : '-',
  }));
}

export function createSettlementsWorkbook(data: SettlementExcelRow[], options: ExcelExportOptions = {}) {
  const {
    sheetName = 'Liquidaciones',
    maxRows = 10000,
  } = options;

  if (data.length > maxRows) {
    console.warn(`Se limitaron los registros a ${maxRows} (total: ${data.length})`);
    data = data.slice(0, maxRows);
  }

  const workbook = XLSX.utils.book_new();

  const dataWithHeaders = data.map(row => ({
    'Folio': row.transactionId,
    'Productor': row.producerName,
    'Temporada': row.seasonName,
    'Recepciones': row.receptionsCount,
    'Anticipos': row.advancesCount,
    'Monto Pago': row.amount,
    'Estado': row.status,
    'Fecha': row.createdAt,
  }));

  const dataSheet = XLSX.utils.json_to_sheet(dataWithHeaders);

  const headerStyle = {
    fill: { fgColor: { rgb: 'FF1F4E78' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!dataSheet[address]) continue;
    dataSheet[address].s = headerStyle;
  }

  const colWidths = [
    { wch: 16 }, // Folio
    { wch: 28 }, // Productor
    { wch: 18 }, // Temporada
    { wch: 14 }, // Recepciones
    { wch: 14 }, // Anticipos
    { wch: 18 }, // Monto Pago
    { wch: 14 }, // Estado
    { wch: 20 }, // Fecha
  ];
  dataSheet['!cols'] = colWidths;

  dataSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName);

  const totalRows = data.length;
  const totalAmount = data.reduce((acc, row) => acc + Number(row.amount || 0), 0);
  const totalReceptions = data.reduce((acc, row) => acc + Number(row.receptionsCount || 0), 0);
  const totalAdvances = data.reduce((acc, row) => acc + Number(row.advancesCount || 0), 0);
  const draftCount = data.filter(row => row.status === 'Borrador').length;
  const completedCount = data.filter(row => row.status === 'Completada').length;

  const summaryData = [
    { Métrica: 'Total de Registros', Valor: totalRows },
    { Métrica: 'Monto Total', Valor: totalAmount },
    { Métrica: 'Total Recepciones', Valor: totalReceptions },
    { Métrica: 'Total Anticipos', Valor: totalAdvances },
    { Métrica: 'Liquidaciones Borrador', Valor: draftCount },
    { Métrica: 'Liquidaciones Completadas', Valor: completedCount },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

export function exportSettlementsToExcel(
  settlementsData: any[],
  options: ExcelExportOptions = {}
) {
  try {
    const formattedData = formatSettlementsDataForExcel(settlementsData);
    const workbook = createSettlementsWorkbook(formattedData, options);
    const fileName = options.fileName || generateExcelFileName('liquidaciones');
    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting settlements to Excel:', error);
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// TRAY MOVEMENTS EXPORT
// =============================================================================

export interface TrayMovementExcelRow {
  id: string;
  createdAt: Date;
  type: string;
  direction: string;
  amount: number;
  trayName: string;
  counterpartyName: string;
  reason?: string;
  performedByName: string;
  stockBefore?: number;
  stockAfter?: number;
}

const DIRECTION_LABELS: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
};

/**
 * Formats tray movement data for Excel export
 */
function formatTrayMovementsDataForExcel(data: TrayMovementExcelRow[]): Record<string, unknown>[] {
  return data.map((row) => ({
    Folio: row.id,
    Fecha: formatAuditDate(row.createdAt),
    Tipo: row.type,
    Flujo: DIRECTION_LABELS[row.direction] || row.direction,
    Cantidad: row.amount,
    Bandeja: row.trayName,
    Contraparte: row.counterpartyName,
    'Stock Anterior': row.stockBefore ?? '',
    'Stock Nuevo': row.stockAfter ?? '',
    Motivo: row.reason || '',
    'Realizado por': row.performedByName,
  }));
}

/**
 * Creates an Excel workbook for tray movements with main data sheet and summary
 */
function createTrayMovementsWorkbook(formattedData: Record<string, unknown>[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Main data sheet
  const mainSheet = XLSX.utils.json_to_sheet(formattedData);

  // Column widths
  mainSheet['!cols'] = [
    { wch: 15 }, // Folio
    { wch: 18 }, // Fecha
    { wch: 25 }, // Tipo
    { wch: 10 }, // Flujo
    { wch: 10 }, // Cantidad
    { wch: 20 }, // Bandeja
    { wch: 25 }, // Contraparte
    { wch: 15 }, // Stock Anterior
    { wch: 15 }, // Stock Nuevo
    { wch: 30 }, // Motivo
    { wch: 20 }, // Realizado por
  ];

  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Movimientos');

  // Summary sheet
  const totalEntradas = formattedData.filter((row) => row.Flujo === 'Entrada').length;
  const totalSalidas = formattedData.filter((row) => row.Flujo === 'Salida').length;
  const cantidadEntradas = formattedData
    .filter((row) => row.Flujo === 'Entrada')
    .reduce((sum, row) => sum + (Number(row.Cantidad) || 0), 0);
  const cantidadSalidas = formattedData
    .filter((row) => row.Flujo === 'Salida')
    .reduce((sum, row) => sum + (Number(row.Cantidad) || 0), 0);

  const summaryData = [
    { Concepto: 'Total de Movimientos', Valor: formattedData.length },
    { Concepto: 'Movimientos de Entrada', Valor: totalEntradas },
    { Concepto: 'Movimientos de Salida', Valor: totalSalidas },
    { Concepto: 'Cantidad Total Entradas', Valor: cantidadEntradas },
    { Concepto: 'Cantidad Total Salidas', Valor: cantidadSalidas },
    { Concepto: 'Balance Neto', Valor: cantidadEntradas - cantidadSalidas },
    { Concepto: 'Fecha de Exportación', Valor: formatAuditDate(new Date()) },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

/**
 * Exports tray movements data to an Excel file
 */
export function exportTrayMovementsToExcel(
  data: TrayMovementExcelRow[],
  customFileName?: string
): { success: boolean; error?: string; fileName?: string; recordCount?: number } {
  try {
    if (!data || data.length === 0) {
      return { success: false, error: 'No hay datos para exportar' };
    }

    const formattedData = formatTrayMovementsDataForExcel(data);
    const workbook = createTrayMovementsWorkbook(formattedData);

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = customFileName || `movimientos_bandejas_${timestamp}.xlsx`;

    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting tray movements to Excel:', error);
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// CUSTOMERS EXPORT
// =============================================================================

export interface CustomerExcelRow {
  id: string;
  personId?: string | null;
  name: string;
  dni: string;
  phone?: string | null;
  mail?: string | null;
  address?: string | null;
}

/**
 * Formats customer data for Excel export
 */
function formatCustomersDataForExcel(data: CustomerExcelRow[]): Record<string, unknown>[] {
  return data.map((row) => ({
    ID: row.id,
    Nombre: row.name,
    RUT: row.dni,
    Teléfono: row.phone || '',
    Email: row.mail || '',
    Dirección: row.address || '',
  }));
}

/**
 * Creates an Excel workbook for customers with main data sheet and summary
 */
function createCustomersWorkbook(formattedData: Record<string, unknown>[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Main data sheet
  const mainSheet = XLSX.utils.json_to_sheet(formattedData);

  // Column widths
  mainSheet['!cols'] = [
    { wch: 12 }, // ID
    { wch: 30 }, // Nombre
    { wch: 15 }, // RUT
    { wch: 15 }, // Teléfono
    { wch: 30 }, // Email
    { wch: 40 }, // Dirección
  ];

  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Clientes');

  // Summary sheet
  const customersWithPhone = formattedData.filter((row) => row.Teléfono && row.Teléfono !== '').length;
  const customersWithEmail = formattedData.filter((row) => row.Email && row.Email !== '').length;
  const customersWithAddress = formattedData.filter((row) => row.Dirección && row.Dirección !== '').length;

  const summaryData = [
    { Concepto: 'Total de Clientes', Valor: formattedData.length },
    { Concepto: 'Con Teléfono', Valor: customersWithPhone },
    { Concepto: 'Con Email', Valor: customersWithEmail },
    { Concepto: 'Con Dirección', Valor: customersWithAddress },
    { Concepto: 'Fecha de Exportación', Valor: formatAuditDate(new Date()) },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  return workbook;
}

/**
 * Exports customers data to an Excel file
 */
export function exportCustomersToExcel(
  data: CustomerExcelRow[],
  customFileName?: string
): { success: boolean; error?: string; fileName?: string; recordCount?: number } {
  try {
    if (!data || data.length === 0) {
      return { success: false, error: 'No hay datos para exportar' };
    }

    const formattedData = formatCustomersDataForExcel(data);
    const workbook = createCustomersWorkbook(formattedData);

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = customFileName || `clientes_${timestamp}.xlsx`;

    downloadExcelFile(workbook, fileName);

    return { success: true, fileName, recordCount: formattedData.length };
  } catch (error) {
    console.error('Error exporting customers to Excel:', error);
    return { success: false, error: String(error) };
  }
}
