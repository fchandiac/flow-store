'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select, { Option } from '@/app/baseComponents/Select/Select';
import Switch from '@/app/baseComponents/Switch/Switch';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { updateVariant } from '@/app/actions/productVariants';
import { getAttributes } from '@/app/actions/attributes';
import { getActiveUnits } from '@/app/actions/units';
import { getPriceLists } from '@/app/actions/priceLists';
import { getTaxes } from '@/app/actions/taxes';
import { getGoldPrices } from '@/app/actions/goldPrices';
import { computePriceWithTaxes } from '@/lib/pricing/priceCalculations';
import { VariantType } from './VariantCard';

interface AttributeType {
    id: string;
    name: string;
    options: string[];
    isActive: boolean;
}

interface UpdateVariantDialogProps {
    open: boolean;
    onClose: () => void;
    variant: VariantType;
    onUpdated?: () => void;
    'data-test-id'?: string;
}

const weightUnitOptions = [
    { id: 'kg', label: 'Kilogramo (kg)' },
    { id: 'g', label: 'Gramo (g)' },
];

interface AttributeChipProps {
    attributeName: string;
    value: string;
    onRemove: () => void;
}

const AttributeChip: React.FC<AttributeChipProps> = ({ attributeName, value, onRemove }) => (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
            <span className="text-xs text-blue-600 block">{attributeName}</span>
            <span className="font-medium text-blue-800">{value}</span>
        </div>
        <button
            type="button"
            onClick={onRemove}
            className="p-1 hover:bg-blue-100 rounded-full transition-colors"
        >
            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: '1rem' }}>
                close
            </span>
        </button>
    </div>
);

interface UnitOption {
    id: string;
    name: string;
    symbol: string;
    dimension: string;
    conversionFactor: number;
    isBase: boolean;
    baseUnitId: string;
}

interface AddAttributeDialogProps {
    open: boolean;
    onClose: () => void;
    attributes: AttributeType[];
    selectedAttributeIds: string[];
    onAdd: (attributeId: string, value: string) => void;
}

const AddAttributeDialog: React.FC<AddAttributeDialogProps> = ({
    open,
    onClose,
    attributes,
    selectedAttributeIds,
    onAdd,
}) => {
    const [selectedAttribute, setSelectedAttribute] = useState<string>('');
    const [selectedValue, setSelectedValue] = useState<string>('');

    const availableAttributes = attributes.filter((attr) => !selectedAttributeIds.includes(attr.id));
    const currentAttribute = attributes.find((attr) => attr.id === selectedAttribute);

    const handleAdd = () => {
        if (selectedAttribute && selectedValue) {
            onAdd(selectedAttribute, selectedValue);
            setSelectedAttribute('');
            setSelectedValue('');
            onClose();
        }
    };

    const handleClose = () => {
        setSelectedAttribute('');
        setSelectedValue('');
        onClose();
    };

    useEffect(() => {
        setSelectedValue('');
    }, [selectedAttribute]);

    return (
        <Dialog open={open} onClose={handleClose} title="Agregar Atributo" size="sm">
            <div className="space-y-4">
                {availableAttributes.length === 0 ? (
                    <Alert variant="info">Ya has agregado todos los atributos disponibles.</Alert>
                ) : (
                    <>
                        <Select
                            label="Atributo"
                            value={selectedAttribute}
                            onChange={(id) => setSelectedAttribute(id?.toString() || '')}
                            options={availableAttributes.map((attr) => ({ id: attr.id, label: attr.name }))}
                            placeholder="Seleccionar atributo"
                        />

                        {currentAttribute && (
                            <Select
                                label={`Valor de ${currentAttribute.name}`}
                                value={selectedValue}
                                onChange={(id) => setSelectedValue(id?.toString() || '')}
                                options={currentAttribute.options.map((option) => ({ id: option, label: option }))}
                                placeholder={`Seleccionar ${currentAttribute.name.toLowerCase()}`}
                            />
                        )}
                    </>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                    <Button variant="outlined" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleAdd} disabled={!selectedAttribute || !selectedValue}>
                        Agregar
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

interface PriceListOption extends Option {
    id: string;
    label: string;
    currency: string;
    isDefault?: boolean;
}

interface TaxOption {
    id: string;
    name: string;
    code: string;
    rate: number;
    isDefault?: boolean;
}

interface PriceEntryState {
    id: string;
    priceListId: string;
    netPrice: string;
    grossPrice: string;
    taxIds: string[];
    lastEdited: 'net' | 'gross' | null;
    priceListName?: string;
    currencyCode?: string;
}

const parseCurrencyInput = (value: string | number, useDecimalComma: boolean): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    let normalized = value.trim();

    if (useDecimalComma) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = normalized.replace(/,/g, '');
    }

    const sanitized = normalized.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(sanitized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatCurrencyByCode = (currency: string, value: number) => {
    const normalized = Number.isFinite(value) ? value : 0;
    const currencyCode = currency || 'CLP';

    try {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currencyCode,
        }).format(normalized);
    } catch {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
        }).format(normalized);
    }
};

const getCurrencySymbol = (currency: string) => {
    const currencyCode = currency || 'CLP';
    try {
        const parts = new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currencyCode,
        }).formatToParts(1);
        const symbolPart = parts.find((part) => part.type === 'currency');
        return symbolPart?.value || '$';
    } catch {
        return '$';
    }
};

const UpdateVariantDialog: React.FC<UpdateVariantDialogProps> = ({
    open,
    onClose,
    variant,
    onUpdated,
    'data-test-id': dataTestId,
}) => {
    const router = useRouter();
    const { success } = useAlert();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [attributes, setAttributes] = useState<AttributeType[]>([]);
    const [units, setUnits] = useState<UnitOption[]>([]);
    const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);
    const [taxes, setTaxes] = useState<TaxOption[]>([]);
    const [priceEntries, setPriceEntries] = useState<PriceEntryState[]>([]);
    const [latestGoldPrice, setLatestGoldPrice] = useState<number | null>(null);
    const [calculatorConfig, setCalculatorConfig] = useState<{ open: boolean; entryId: string | null }>({
        open: false,
        entryId: null
    });
    const [initializedPrices, setInitializedPrices] = useState(false);
    const [showAddAttributeDialog, setShowAddAttributeDialog] = useState(false);

    const [formData, setFormData] = useState({
        sku: '',
        barcode: '',
        unitId: '',
        isActive: true,
        weight: '',
        weightUnit: 'g',
    });

    const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});

    const defaultTaxIds = useMemo(
        () => taxes.filter((tax) => tax.isDefault).map((tax) => tax.id),
        [taxes]
    );

    const usedPriceListIds = useMemo(() => {
        const ids = new Set<string>();
        priceEntries.forEach((entry) => {
            if (entry.priceListId) {
                ids.add(entry.priceListId);
            }
        });
        return ids;
    }, [priceEntries]);

    const duplicatedPriceListIds = useMemo(() => {
        const counts = new Map<string, number>();
        priceEntries.forEach((entry) => {
            if (!entry.priceListId) {
                return;
            }
            const nextCount = (counts.get(entry.priceListId) || 0) + 1;
            counts.set(entry.priceListId, nextCount);
        });
        return new Set(
            Array.from(counts.entries())
                .filter(([, count]) => count > 1)
                .map(([priceListId]) => priceListId)
        );
    }, [priceEntries]);

    const selectedUnit = useMemo(
        () => units.find((unit) => unit.id === formData.unitId) ?? null,
        [units, formData.unitId]
    );

    const priceListMap = useMemo(() => {
        const map = new Map<string, PriceListOption>();
        priceLists.forEach((list) => {
            map.set(list.id, list);
        });
        return map;
    }, [priceLists]);

    const usesDecimalCommaForList = useCallback(
        (priceListId: string, fallbackCurrency?: string): boolean => {
            const priceList = priceListId ? priceListMap.get(priceListId) : undefined;
            if (priceList) {
                return priceList.currency !== 'CLP';
            }

            if (fallbackCurrency) {
                return fallbackCurrency !== 'CLP';
            }

            return false;
        },
        [priceListMap]
    );

    const formatAmountForInput = useCallback(
        (value: number, priceListId: string, fallbackCurrency?: string): string => {
            if (!Number.isFinite(value)) {
                return '';
            }

            if (usesDecimalCommaForList(priceListId, fallbackCurrency)) {
                return value.toFixed(2).replace('.', ',');
            }

            return Math.round(value).toString();
        },
        [usesDecimalCommaForList]
    );

    const parseAmountFromInput = useCallback(
        (rawValue: string, useDecimalComma: boolean): number | undefined => {
            if (typeof rawValue !== 'string') {
                return undefined;
            }

            const trimmed = rawValue.trim();
            if (!trimmed) {
                return undefined;
            }

            const parsed = parseCurrencyInput(trimmed, useDecimalComma);
            if (!Number.isFinite(parsed)) {
                return undefined;
            }

            if (useDecimalComma) {
                return Math.round(parsed * 100) / 100;
            }

            return Math.round(parsed);
        },
        []
    );

    const createPriceEntry = useCallback(
        (overrides?: Partial<PriceEntryState>): PriceEntryState => ({
            id:
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : Math.random().toString(36).slice(2),
            priceListId: '',
            netPrice: '',
            grossPrice: '',
            taxIds: [...defaultTaxIds],
            lastEdited: null,
            ...overrides,
        }),
        [defaultTaxIds]
    );

    const PriceCalculatorDialog: React.FC<{
        open: boolean;
        onClose: () => void;
        weight: number;
        goldPrice: number;
        onCalculate: (netPrice: number) => void;
    }> = ({
        open,
        onClose,
        weight,
        goldPrice,
        onCalculate,
    }) => {
        const [manufacture, setManufacture] = useState('0');
        const [currentWeight, setCurrentWeight] = useState(weight.toString());

        const result = useMemo(() => {
            const w = parseFloat(currentWeight) || 0;
            const h = parseFloat(manufacture) || 0;
            // Formula updated per request: (((Peso * Oro) * 2) * 0.1) + hechura
            const goldCost = w * goldPrice;
            const total = (goldCost * 2 * 0.1) + h;
            return total;
        }, [currentWeight, goldPrice, manufacture]);

        const handleApply = () => {
            onCalculate(result);
            onClose();
        };

        return (
            <Dialog open={open} onClose={onClose} title="Calculadora de Precio" size="sm">
                <div className="space-y-4">
                    <Alert variant="info">
                        Precio del Oro actual: <strong>{formatCurrencyByCode('CLP', goldPrice)}</strong>
                    </Alert>
                    <TextField
                        label="Peso (gramos)"
                        type="number"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                        placeholder="Peso"
                    />
                    <TextField
                        label="Hechura / Mano de obra"
                        type="currency"
                        value={manufacture}
                        onChange={(e) => setManufacture(e.target.value)}
                    />
                    <div className="p-4 bg-neutral-100 rounded-lg">
                        <p className="text-sm text-neutral-600">Precio Neto Calculado:</p>
                        <p className="text-2xl font-bold text-primary">
                            {formatCurrencyByCode('CLP', result)}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-1 italic">
                            Fórmula: (((Peso × Oro) × 2) × 0.1) + Hechura
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleApply}>Aplicar al precio</Button>
                    </div>
                </div>
            </Dialog>
        );
    };

    const loadDialogData = async () => {
        try {
            const [attrData, unitsData, listsData, taxesData, goldPricesData] = await Promise.all([
                getAttributes(),
                getActiveUnits(),
                getPriceLists(),
                getTaxes(),
                getGoldPrices(),
            ]);

            setAttributes(attrData);
            setPriceLists(listsData.map((list: any) => ({
                id: list.id,
                label: list.name,
                currency: list.currency,
                isDefault: list.isDefault
            })) as PriceListOption[]);
            setUnits(unitsData as UnitOption[]);
            setTaxes(taxesData as TaxOption[]);

            if (goldPricesData && goldPricesData.length > 0) {
                setLatestGoldPrice(Number(goldPricesData[0].valueCLP));
            }
        } catch (error) {
            console.error('Error loading variant dialog metadata', error);
        }
    };

    useEffect(() => {
        if (open) {
            loadDialogData();
        }
    }, [open, loadDialogData]);

    useEffect(() => {
        if (open && variant) {
            setFormData({
                sku: variant.sku,
                barcode: variant.barcode || '',
                unitId: variant.unitId || '',
                isActive: variant.isActive,
                weight: variant.weight?.toString() || '',
                weightUnit: variant.weightUnit || 'g',
            });
            setAttributeValues(variant.attributeValues || {});
            setErrors([]);
        }
    }, [open, variant]);

    useEffect(() => {
        if (!open) {
            setPriceEntries([]);
            setInitializedPrices(false);
            return;
        }
        if (formData.unitId) {
            return;
        }
        if (units.length === 0) {
            return;
        }

        const preferredUnit =
            units.find((unit) => unit.isBase && unit.dimension === 'count') ??
            units.find((unit) => unit.isBase) ??
            units[0];

        if (!preferredUnit) {
            return;
        }

        setFormData((prev) => ({
            ...prev,
            unitId: preferredUnit.id,
        }));
    }, [open, units, formData.unitId]);

    useEffect(() => {
        if (!open || initializedPrices) {
            return;
        }

        if (!variant) {
            return;
        }

        const hasExistingPrices = Array.isArray(variant.priceListItems) && variant.priceListItems.length > 0;

        if (hasExistingPrices) {
            setPriceEntries(
                variant.priceListItems!.map((item) =>
                    createPriceEntry({
                        priceListId: item.priceListId || '',
                        netPrice: formatAmountForInput(item.netPrice, item.priceListId || '', item.currency),
                        grossPrice: formatAmountForInput(item.grossPrice, item.priceListId || '', item.currency),
                        taxIds: Array.isArray(item.taxIds) ? [...item.taxIds] : [],
                        lastEdited: null,
                        priceListName: item.priceListName,
                        currencyCode: item.currency,
                    })
                )
            );
            setInitializedPrices(true);
            return;
        }

        if (priceLists.length === 0) {
            return;
        }

        const defaultList = priceLists.find((list) => list.isDefault) ?? priceLists[0];
        const baseNetPrice = typeof variant.basePrice === 'number' && Number.isFinite(variant.basePrice)
            ? variant.basePrice
            : undefined;

        setPriceEntries([
            createPriceEntry({
                priceListId: defaultList?.id ?? '',
                currencyCode: defaultList?.currency,
                netPrice:
                    baseNetPrice !== undefined
                        ? formatAmountForInput(baseNetPrice, defaultList?.id ?? '', defaultList?.currency)
                        : '',
                grossPrice:
                    baseNetPrice !== undefined
                        ? formatAmountForInput(baseNetPrice, defaultList?.id ?? '', defaultList?.currency)
                        : '',
            }),
        ]);
        setInitializedPrices(true);
    }, [open, variant, priceLists, createPriceEntry, initializedPrices, formatAmountForInput]);

    useEffect(() => {
        if (!open) {
            return;
        }
        if (defaultTaxIds.length === 0) {
            return;
        }

        setPriceEntries((prev) => {
            let changed = false;
            const next = prev.map((entry) => {
                if (entry.taxIds.length === 0 && !entry.priceListName) {
                    changed = true;
                    return {
                        ...entry,
                        taxIds: [...defaultTaxIds],
                    };
                }
                return entry;
            });
            return changed ? next : prev;
        });
    }, [open, defaultTaxIds]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAddAttribute = (attributeId: string, value: string) => {
        setAttributeValues((prev) => ({
            ...prev,
            [attributeId]: value,
        }));
    };

    const handleRemoveAttribute = (attributeId: string) => {
        setAttributeValues((prev) => {
            const next = { ...prev };
            delete next[attributeId];
            return next;
        });
    };

    const handleAddPriceEntry = () => {
        const usedIds = new Set(priceEntries.map((entry) => entry.priceListId).filter(Boolean));
        const availableList = priceLists.find((list) => !usedIds.has(list.id));
        const nextListId = availableList?.id ?? '';
        const nextList = nextListId ? priceListMap.get(nextListId) : undefined;

        setPriceEntries((prev) => [
            ...prev,
            createPriceEntry({
                priceListId: nextListId,
                currencyCode: nextList?.currency,
            }),
        ]);
    };

    const handleRemovePriceEntry = (entryId: string) => {
        setPriceEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    };

    const resolveTaxRates = (taxIds: string[]) =>
        taxIds.map((taxId) => {
            const tax = taxes.find((item) => item.id === taxId);
            return tax ? Number(tax.rate) || 0 : 0;
        });

    const handleUpdatePriceEntry = (entryId: string, updates: Partial<PriceEntryState>) => {
        setPriceEntries((prev) =>
            prev.map((entry) => {
                if (entry.id !== entryId) {
                    return entry;
                }

                const next: PriceEntryState = {
                    ...entry,
                    ...updates,
                };

                if (Object.prototype.hasOwnProperty.call(updates, 'priceListId')) {
                    const nextListId = updates.priceListId ?? '';
                    const nextList = nextListId ? priceListMap.get(nextListId) : undefined;
                    next.currencyCode = nextList?.currency;
                }

                return next;
            })
        );
    };

    const handleNetPriceChange = (entryId: string, rawValue: string) => {
        setPriceEntries((prev) =>
            prev.map((entry) => {
                if (entry.id !== entryId) {
                    return entry;
                }

                const trimmed = rawValue.trim();
                if (!trimmed) {
                    return {
                        ...entry,
                        netPrice: '',
                        grossPrice: '',
                        lastEdited: null,
                    };
                }

                const useDecimalComma = usesDecimalCommaForList(entry.priceListId, entry.currencyCode);
                const netValue = parseAmountFromInput(rawValue, useDecimalComma);
                if (netValue === undefined) {
                    return {
                        ...entry,
                        netPrice: rawValue,
                        lastEdited: 'net',
                    };
                }

                try {
                    const computed = computePriceWithTaxes({
                        netPrice: netValue,
                        taxRates: resolveTaxRates(entry.taxIds),
                    });

                    return {
                        ...entry,
                        netPrice: formatAmountForInput(computed.netPrice, entry.priceListId, entry.currencyCode),
                        grossPrice: formatAmountForInput(computed.grossPrice, entry.priceListId, entry.currencyCode),
                        lastEdited: 'net',
                    };
                } catch (err) {
                    console.error('Error computing price from net value', err);
                    return {
                        ...entry,
                        netPrice: rawValue,
                        lastEdited: 'net',
                    };
                }
            })
        );
    };

    const handleGrossPriceChange = (entryId: string, rawValue: string) => {
        setPriceEntries((prev) =>
            prev.map((entry) => {
                if (entry.id !== entryId) {
                    return entry;
                }

                const trimmed = rawValue.trim();
                if (!trimmed) {
                    return {
                        ...entry,
                        netPrice: '',
                        grossPrice: '',
                        lastEdited: null,
                    };
                }

                const useDecimalComma = usesDecimalCommaForList(entry.priceListId, entry.currencyCode);
                const grossValue = parseAmountFromInput(rawValue, useDecimalComma);
                if (grossValue === undefined) {
                    return {
                        ...entry,
                        grossPrice: rawValue,
                        lastEdited: 'gross',
                    };
                }

                try {
                    const computed = computePriceWithTaxes({
                        grossPrice: grossValue,
                        taxRates: resolveTaxRates(entry.taxIds),
                    });

                    return {
                        ...entry,
                        netPrice: formatAmountForInput(computed.netPrice, entry.priceListId, entry.currencyCode),
                        grossPrice: formatAmountForInput(computed.grossPrice, entry.priceListId, entry.currencyCode),
                        lastEdited: 'gross',
                    };
                } catch (err) {
                    console.error('Error computing price from gross value', err);
                    return {
                        ...entry,
                        grossPrice: rawValue,
                        lastEdited: 'gross',
                    };
                }
            })
        );
    };

    const handleTogglePriceEntryTax = (entryId: string, taxId: string, checked: boolean) => {
        setPriceEntries((prev) =>
            prev.map((entry) => {
                if (entry.id !== entryId) {
                    return entry;
                }
                const nextTaxIds = checked
                    ? Array.from(new Set([...entry.taxIds, taxId]))
                    : entry.taxIds.filter((id) => id !== taxId);
                const baseSource = entry.lastEdited ?? (entry.netPrice.trim() ? 'net' : entry.grossPrice.trim() ? 'gross' : null);
                if (!baseSource) {
                    return {
                        ...entry,
                        taxIds: nextTaxIds,
                    };
                }

                const useDecimalComma = usesDecimalCommaForList(entry.priceListId, entry.currencyCode);
                const baseValue = baseSource === 'net'
                    ? parseAmountFromInput(entry.netPrice, useDecimalComma)
                    : parseAmountFromInput(entry.grossPrice, useDecimalComma);

                if (baseValue === undefined) {
                    return {
                        ...entry,
                        taxIds: nextTaxIds,
                    };
                }

                try {
                    const computed = computePriceWithTaxes({
                        netPrice: baseSource === 'net' ? baseValue : undefined,
                        grossPrice: baseSource === 'gross' ? baseValue : undefined,
                        taxRates: resolveTaxRates(nextTaxIds),
                    });

                    return {
                        ...entry,
                        taxIds: nextTaxIds,
                        netPrice: formatAmountForInput(computed.netPrice, entry.priceListId, entry.currencyCode),
                        grossPrice: formatAmountForInput(computed.grossPrice, entry.priceListId, entry.currencyCode),
                    };
                } catch (err) {
                    console.error('Error recomputing price after tax change', err);
                    return {
                        ...entry,
                        taxIds: nextTaxIds,
                    };
                }
            })
        );
    };

    const handleApplyCalculation = (netPrice: number) => {
        if (calculatorConfig.entryId) {
            handleNetPriceChange(calculatorConfig.entryId, netPrice.toString());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors: string[] = [];
        if (!formData.sku.trim()) {
            validationErrors.push('El SKU es requerido');
        }
        if (!formData.unitId) {
            validationErrors.push('Debe seleccionar una unidad de medida');
        }
        if (priceEntries.length === 0) {
            validationErrors.push('Debe definir al menos un precio de venta');
        }

        const priceListPayload = priceEntries.map((entry) => {
            const useDecimalComma = usesDecimalCommaForList(entry.priceListId, entry.currencyCode);
            const netValue = parseAmountFromInput(entry.netPrice, useDecimalComma);
            const grossValue = parseAmountFromInput(entry.grossPrice, useDecimalComma);

            if (netValue === undefined && grossValue === undefined) {
                validationErrors.push('Cada precio debe incluir un valor neto o con impuestos.');
                return null;
            }

            try {
                const taxIds = Array.from(new Set(entry.taxIds ?? []));
                const computed = computePriceWithTaxes({
                    netPrice: netValue,
                    grossPrice: grossValue,
                    taxRates: resolveTaxRates(taxIds),
                });

                return {
                    priceListId: entry.priceListId,
                    netPrice: computed.netPrice,
                    grossPrice: computed.grossPrice,
                    taxIds,
                };
            } catch (err) {
                console.error('Error computing price during submit', err);
                validationErrors.push('No se pudo calcular el precio para una de las listas de precios.');
                return null;
            }
        });

        const sanitizedPayload = priceListPayload.filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        const uniquePriceListIds = new Set<string>();
        let hasDuplicatedList = false;

        sanitizedPayload.forEach(({ priceListId, netPrice, grossPrice }) => {
            if (!priceListId) {
                validationErrors.push('Cada precio debe asociarse a una lista de precios.');
            } else if (uniquePriceListIds.has(priceListId)) {
                hasDuplicatedList = true;
            } else {
                uniquePriceListIds.add(priceListId);
            }

            if (!Number.isFinite(netPrice) || netPrice <= 0 || !Number.isFinite(grossPrice) || grossPrice <= 0) {
                validationErrors.push('Todos los precios deben ser mayores a 0.');
            }
        });

        if (hasDuplicatedList) {
            validationErrors.push('No puede haber precios duplicados para la misma lista de precios.');
        }

        let weightValue: number | undefined;
        if (formData.weight.trim()) {
            const normalizedWeight = formData.weight.replace(',', '.');
            const parsedWeight = Number(normalizedWeight);
            if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
                validationErrors.push('El peso debe ser un número mayor o igual a 0.');
            } else {
                weightValue = Number(parsedWeight.toFixed(3));
            }
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        const firstPriceEntry = sanitizedPayload[0];
        const baseNetPrice = firstPriceEntry.netPrice;

        try {
            const result = await updateVariant(variant.id, {
                sku: formData.sku.trim(),
                barcode: formData.barcode.trim() || undefined,
                basePrice: baseNetPrice,
                unitId: formData.unitId,
                weight: weightValue,
                weightUnit: formData.weightUnit,
                attributeValues: Object.keys(attributeValues).length > 0 ? attributeValues : undefined,
                isActive: formData.isActive,
                priceListItems: sanitizedPayload.map(({ priceListId, grossPrice, taxIds }) => ({
                    priceListId,
                    grossPrice,
                    taxIds,
                })),
            });

            if (result.success) {
                success('Variante actualizada correctamente');
                setTimeout(() => {
                    onClose();
                    onUpdated?.();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al actualizar la variante']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar la variante']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors([]);
        setPriceEntries([]);
        setInitializedPrices(false);
        setShowAddAttributeDialog(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} title="Actualizar Variante" size="lg" data-test-id={dataTestId}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField
                        label="SKU"
                        value={formData.sku}
                        onChange={(e) => handleChange('sku', e.target.value)}
                        required
                    />
                    <TextField
                        label="Código de Barras"
                        value={formData.barcode}
                        onChange={(e) => handleChange('barcode', e.target.value)}
                        placeholder="Opcional"
                    />
                    <Select
                        label="Unidad de Medida"
                        value={formData.unitId}
                        onChange={(id) => handleChange('unitId', id?.toString() || '')}
                        options={units.map((unit) => ({ id: unit.id, label: unit.name }))}
                        placeholder="Seleccionar unidad"
                        required
                    />
                    <TextField
                        label="Peso"
                        type="number"
                        value={formData.weight}
                        onChange={(event) => handleChange('weight', event.target.value)}
                        placeholder="Peso"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                    />
                    <Select
                        label="Unidad de peso"
                        value={formData.weightUnit}
                        onChange={(value) => handleChange('weightUnit', value?.toString() || 'kg')}
                        options={weightUnitOptions}
                    />
                    <div className="flex items-center gap-4">
                        <span className="whitespace-nowrap">Activo</span>
                        <Switch
                            checked={formData.isActive}
                            onChange={(checked) => handleChange('isActive', checked)}
                            aria-label="Estado de la variante"
                        />
                    </div>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Atributos</h3>
                        <Button
                            variant="outlined"
                            onClick={() => setShowAddAttributeDialog(true)}
                            disabled={attributes.length === 0}
                        >
                            Agregar Atributo
                        </Button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(attributeValues).map(([attrId, value]) => {
                            const attribute = attributes.find((attr) => attr.id === attrId);
                            if (!attribute) {
                                return null;
                            }
                            return (
                                <AttributeChip
                                    key={attrId}
                                    attributeName={attribute.name}
                                    value={value}
                                    onRemove={() => handleRemoveAttribute(attrId)}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                    <h3 className="text-lg font-semibold">Precios</h3>

                    {priceEntries.length === 0 && (
                        <Alert variant="info" className="mt-2">
                            No se han definido precios para esta variante. Agrega un precio usando el botón "Agregar Precio".
                        </Alert>
                    )}

                    {priceEntries.map((entry, index) => {
                        const isFirst = index === 0;
                        const isLast = index === priceEntries.length - 1;
                        const showDivider = !isFirst;

                        return (
                            <div key={entry.id} className="py-4">
                                {showDivider && <div className="border-t border-neutral-200 mb-4" />}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select
                                        label="Lista de Precios"
                                        value={entry.priceListId}
                                        onChange={(id) => handleUpdatePriceEntry(entry.id, { priceListId: id?.toString() })}
                                        options={priceLists.map((list) => ({ id: list.id, label: list.label }))}
                                        placeholder="Seleccionar lista de precios"
                                        required
                                    />
                                    <div className="relative">
                                        <TextField
                                            label="Precio Neto"
                                            value={entry.netPrice}
                                            onChange={(e) => handleNetPriceChange(entry.id, e.target.value)}
                                            type="currency"
                                            required
                                        />
                                        {latestGoldPrice && (
                                            <div className="absolute bottom-0 right-0 pb-1.5 pr-1.5">
                                                <IconButton
                                                    icon="calculate"
                                                    variant="basicSecondary"
                                                    size="sm"
                                                    onClick={() => setCalculatorConfig({ open: true, entryId: entry.id })}
                                                    title="Calcular basado en oro"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <TextField
                                        label="Precio Bruto"
                                        value={entry.grossPrice}
                                        onChange={(e) => handleGrossPriceChange(entry.id, e.target.value)}
                                        type="currency"
                                        required
                                    />
                                </div>

                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Impuestos</p>
                                    <div className="flex flex-wrap gap-3">
                                        {taxes.map((tax) => (
                                            <Switch
                                                key={`${entry.id}-${tax.id}`}
                                                checked={entry.taxIds.includes(tax.id)}
                                                onChange={(checked) => handleTogglePriceEntryTax(entry.id, tax.id, checked)}
                                                label={`${tax.name} (${Number(tax.rate) || 0}%)`}
                                                labelPosition="right"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outlined"
                            onClick={handleAddPriceEntry}
                            disabled={priceLists.length === 0}
                        >
                            Agregar Precio
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button variant="outlined" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                        {isSubmitting ? 'Actualizando...' : 'Actualizar Variante'}
                    </Button>
                </div>
            </form>

            <AddAttributeDialog
                open={showAddAttributeDialog}
                onClose={() => setShowAddAttributeDialog(false)}
                attributes={attributes}
                selectedAttributeIds={Object.keys(attributeValues)}
                onAdd={handleAddAttribute}
            />

            <PriceCalculatorDialog
                open={calculatorConfig.open}
                onClose={() => setCalculatorConfig({ ...calculatorConfig, open: false })}
                weight={parseFloat(formData.weight) || 0}
                goldPrice={latestGoldPrice || 0}
                onCalculate={handleApplyCalculation}
            />
        </Dialog>
    );
};

export default UpdateVariantDialog;
