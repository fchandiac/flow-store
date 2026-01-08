interface PriceComputationInput {
    netPrice?: number | string | null;
    grossPrice?: number | string | null;
    taxRates: Array<number | string | null | undefined>;
}

export interface ComputedPrice {
    netPrice: number;
    grossPrice: number;
    totalTaxRate: number; // porcentaje acumulado, ej: 19 => 19%
}

/**
 * Calcula precio neto/bruto a partir de los valores entregados y la lista de tasas.
 * Siempre devuelve precios con dos decimales.
 */
export function computePriceWithTaxes({ netPrice, grossPrice, taxRates }: PriceComputationInput): ComputedPrice {
    const sanitizedRates = taxRates
        .map((rate) => (rate === null || rate === undefined ? 0 : Number(rate)))
        .filter((rate) => !Number.isNaN(rate));

    const totalTaxRate = sanitizedRates.reduce((acc, rate) => acc + rate, 0);
    const multiplier = 1 + totalTaxRate / 100;

    const normalizedNet = normalizeCurrency(netPrice);
    const normalizedGross = normalizeCurrency(grossPrice);

    if (normalizedNet === undefined && normalizedGross === undefined) {
        throw new Error('Debe proporcionar netPrice o grossPrice para calcular el precio.');
    }

    let resolvedNet: number;
    let resolvedGross: number;

    if (normalizedNet !== undefined) {
        resolvedNet = normalizedNet;
        resolvedGross = multiplier === 0 ? normalizedNet : normalizedNet * multiplier;
    } else {
        // multiplier = 0 significa sin impuestos (lista vacía o tasas 0)
        if (multiplier === 0) {
            resolvedNet = normalizedGross ?? 0;
        } else {
            resolvedNet = (normalizedGross ?? 0) / multiplier;
        }
        resolvedGross = normalizedGross ?? resolvedNet;
    }

    return {
        netPrice: roundCurrency(resolvedNet),
        grossPrice: roundCurrency(resolvedGross),
        totalTaxRate: roundCurrency(totalTaxRate),
    };
}

function normalizeCurrency(value?: number | string | null): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const numeric = Number(value);
    return Number.isNaN(numeric) ? undefined : numeric;
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}
