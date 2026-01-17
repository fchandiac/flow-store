const fallbackFormatter = (value: number): string => {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  const absolute = Math.abs(rounded);
  const formatted = absolute.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const signPrefix = rounded < 0 ? '-$' : '$';
  return `${signPrefix}${formatted}`;
};

let cachedIntlFormatter: Intl.NumberFormat | null = null;

const getIntlFormatter = (): Intl.NumberFormat | null => {
  if (cachedIntlFormatter) {
    return cachedIntlFormatter;
  }

  try {
    cachedIntlFormatter = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return cachedIntlFormatter;
  } catch (error) {
    cachedIntlFormatter = null;
    return null;
  }
};

export const formatCurrency = (value: number): string => {
  const formatter = getIntlFormatter();
  if (formatter) {
    try {
      return formatter.format(value);
    } catch (error) {
      return fallbackFormatter(value);
    }
  }

  return fallbackFormatter(value);
};
