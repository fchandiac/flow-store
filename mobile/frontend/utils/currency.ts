/**
 * Formatea un monto con símbolo de peso chileno y separadores de miles
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea un monto sin símbolo de moneda, solo con separadores de miles
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parsea un string formateado de vuelta a número
 */
export function parseFormattedAmount(value: string): number {
  // Remover puntos (separadores de miles) y reemplazar coma por punto decimal
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Valida y formatea input de monto mientras se escribe
 */
export function formatAmountInput(value: string): string {
  // Remover caracteres no numéricos excepto coma y punto
  const cleaned = value.replace(/[^\d.,]/g, '');

  // Si está vacío, retornar vacío
  if (!cleaned) return '';

  // Parsear el número
  const num = parseFormattedAmount(cleaned);

  // Formatear sin símbolo de moneda
  return formatAmount(num);
}