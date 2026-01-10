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
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateVariant } from '@/app/actions/productVariants';
import { getAttributes } from '@/app/actions/attributes';
import { getActiveUnits } from '@/app/actions/units';
import { getPriceLists } from '@/app/actions/priceLists';
import { getTaxes } from '@/app/actions/taxes';
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
    'data-test-id'?: string;
}

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
    const [initializedPrices, setInitializedPrices] = useState(false);
    const [showAddAttributeDialog, setShowAddAttributeDialog] = useState(false);

    const [formData, setFormData] = useState({
        sku: '',
        barcode: '',
        unitId: '',
        isActive: true,
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

    const loadDialogData = useCallback(async () => {
        const [attrs, unitsResult, lists, taxesResult] = await Promise.all([
            getAttributes(),
            getActiveUnits(),
            getPriceLists(true),
            getTaxes(),
        ]);

        setAttributes(attrs);
        setUnits(
            unitsResult.map((unit) => ({
                id: unit.id,
                name: unit.name,
                symbol: unit.symbol,
                dimension: unit.dimension,
                conversionFactor: Number(unit.conversionFactor),
                isBase: unit.isBase,
                baseUnitId: unit.baseUnitId,
            }))
        );
        setPriceLists(
            lists.map((list) => ({
                id: list.id,
                label: list.name,
                currency: list.currency,
                isDefault: Boolean(list.isDefault),
            }))
        );
        setTaxes(
            taxesResult.map((tax) => ({
                id: tax.id,
                name: tax.name,
                code: tax.code,
                rate: Number(tax.rate) || 0,
                isDefault: Boolean(tax.isDefault),
            }))
        );
    }, []);

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
            validationErrors.push('No puede repetir la misma lista de precios más de una vez.');
        }

        if (sanitizedPayload.length === 0 || sanitizedPayload.length !== priceEntries.length) {
            validationErrors.push('Debe definir al menos un precio de venta válido.');
        }

        if (validationErrors.length > 0) {
            setErrors(Array.from(new Set(validationErrors)));
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

    const selectedAttributeIds = Object.keys(attributeValues);
    const remainingAttributes = attributes.filter((attr) => !selectedAttributeIds.includes(attr.id));
    const canAddAnotherPriceEntry = priceLists.length > 0 && priceEntries.length < priceLists.length;

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                title="Editar Variante"
                size="lg"
                data-test-id={dataTestId}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-neutral-700">Atributos de la Variante</h4>
                        {attributes.length > 0 && (
                            <Button
                                type="button"
                                variant="outlined"
                                size="sm"
                                onClick={() => setShowAddAttributeDialog(true)}
                                disabled={remainingAttributes.length === 0}
                            >
                                <span className="material-symbols-outlined mr-1" style={{ fontSize: '1.25rem' }}>
                                    add
                                </span>
                                Agregar atributo
                            </Button>
                        )}
                    </div>

                    {attributes.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                            <p className="font-medium mb-1">No hay atributos definidos</p>
                            <p>Debe crear atributos (Color, Talla, etc.) en Configuración → Atributos.</p>
                        </div>
                    ) : selectedAttributeIds.length === 0 ? (
                        <div className="p-4 bg-neutral-50 border border-neutral-200 border-dashed rounded-lg text-center">
                            <span className="material-symbols-outlined text-neutral-400 mb-2" style={{ fontSize: '2rem' }}>
                                label
                            </span>
                            <p className="text-neutral-500 text-sm">No hay atributos agregados</p>
                            <p className="text-neutral-400 text-xs mt-1">
                                Usa el botón "Agregar atributo" para definir las características de esta variante
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {selectedAttributeIds.map((attrId) => {
                                const attr = attributes.find((item) => item.id === attrId);
                                const attributeName = attr?.name ?? attrId;
                                const rawValue = attributeValues[attrId];
                                const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
                                if (!value.trim()) {
                                    return null;
                                }
                                return (
                                    <AttributeChip
                                        key={attrId}
                                        attributeName={attributeName}
                                        value={value}
                                        onRemove={() => handleRemoveAttribute(attrId)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h4 className="font-medium text-neutral-700">Identificación</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="SKU"
                            value={formData.sku}
                            onChange={(e) => handleChange('sku', e.target.value)}
                            required
                            data-test-id="update-variant-sku"
                        />
                        <TextField
                            label="Código de Barras"
                            value={formData.barcode}
                            onChange={(e) => handleChange('barcode', e.target.value)}
                            data-test-id="update-variant-barcode"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h4 className="font-medium text-neutral-700">Precio de Venta</h4>
                        <Button
                            type="button"
                            variant="outlined"
                            size="sm"
                            onClick={handleAddPriceEntry}
                            disabled={!canAddAnotherPriceEntry || isSubmitting}
                        >
                            <span className="material-symbols-outlined mr-1" style={{ fontSize: '1.25rem' }}>
                                add
                            </span>
                            Agregar precio
                        </Button>
                    </div>

                    {!priceLists.length ? (
                        <Alert variant="warning">
                            Debes crear al menos una lista de precios en Configuración → Listas de precios antes de definir precios.
                        </Alert>
                    ) : priceEntries.length === 0 ? (
                        <div className="p-4 bg-neutral-50 border border-neutral-200 border-dashed rounded-lg text-center text-sm text-neutral-500">
                            <span className="material-symbols-outlined text-neutral-400 mb-2" style={{ fontSize: '2rem' }}>
                                sell
                            </span>
                            <p>Agrega un precio seleccionando una lista y definiendo el monto neto o el valor con impuestos para esta variante.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {priceEntries.map((entry, index) => {
                                const selectedList = priceLists.find((list) => list.id === entry.priceListId);
                                const currencyCode = selectedList?.currency || entry.currencyCode || 'CLP';
                                const useDecimalComma = usesDecimalCommaForList(entry.priceListId, currencyCode);
                                const netValue = parseAmountFromInput(entry.netPrice, useDecimalComma);
                                const grossValue = parseAmountFromInput(entry.grossPrice, useDecimalComma);
                                const taxRates = resolveTaxRates(entry.taxIds);
                                let computedPrice: ReturnType<typeof computePriceWithTaxes> | null = null;

                                if (netValue !== undefined || grossValue !== undefined) {
                                    try {
                                        computedPrice = computePriceWithTaxes({
                                            netPrice: netValue,
                                            grossPrice: grossValue,
                                            taxRates,
                                        });
                                    } catch (err) {
                                        console.error('Error computing price for display', err);
                                        computedPrice = null;
                                    }
                                }

                                const appliedTaxes = taxes.filter((tax) => entry.taxIds.includes(tax.id));
                                const formattedNetDisplay = computedPrice
                                    ? formatCurrencyByCode(currencyCode, computedPrice.netPrice)
                                    : '—';
                                const formattedGrossDisplay = computedPrice
                                    ? formatCurrencyByCode(currencyCode, computedPrice.grossPrice)
                                    : '—';

                                const isDuplicatedList = Boolean(
                                    entry.priceListId && duplicatedPriceListIds.has(entry.priceListId)
                                );

                                const baseOptions = priceLists.map((list) => {
                                    const isUsedByOther = usedPriceListIds.has(list.id) && list.id !== entry.priceListId;
                                    const usageSuffix = isUsedByOther ? ' (en uso)' : '';
                                    return {
                                        id: list.id,
                                        label: `${list.label} (${list.currency})${usageSuffix}`,
                                    };
                                });

                                if (
                                    entry.priceListId &&
                                    !baseOptions.some((option) => option.id === entry.priceListId)
                                ) {
                                    baseOptions.push({
                                        id: entry.priceListId,
                                        label: `${entry.priceListName || 'Lista no disponible'} (inactiva)`,
                                    });
                                }

                                return (
                                    <div
                                        key={entry.id}
                                        className={`rounded-lg p-4 space-y-4 border ${
                                            isDuplicatedList ? 'border-amber-400 bg-amber-50' : 'border-border bg-neutral-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-neutral-800">
                                                    {selectedList?.label || entry.priceListName || `Precio ${index + 1}`}
                                                </p>
                                                <p className="text-xs text-neutral-500">
                                                    {selectedList ? `Moneda: ${selectedList.currency}` : `Moneda: ${entry.currencyCode || 'CLP'}`}
                                                </p>
                                                {isDuplicatedList && (
                                                    <p className="text-xs text-amber-700 mt-1">
                                                        Esta lista está asignada en más de un precio. Ajusta antes de guardar.
                                                    </p>
                                                )}
                                            </div>
                                            <IconButton
                                                icon="delete"
                                                variant="text"
                                                size="sm"
                                                onClick={() => handleRemovePriceEntry(entry.id)}
                                                title="Eliminar precio"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Select
                                                label="Lista de precios"
                                                value={entry.priceListId || null}
                                                onChange={(id) => handleUpdatePriceEntry(entry.id, { priceListId: id ? id.toString() : '' })}
                                                options={baseOptions}
                                                placeholder="Selecciona una lista"
                                                required
                                            />
                                            <TextField
                                                label="Precio neto (sin impuestos)"
                                                type="currency"
                                                value={entry.netPrice}
                                                onChange={(event) => handleNetPriceChange(entry.id, event.target.value)}
                                                currencySymbol={getCurrencySymbol(currencyCode)}
                                                allowDecimalComma={useDecimalComma}
                                                data-test-id={`update-variant-price-entry-${index}-net`}
                                                disabled={isSubmitting}
                                            />
                                            <TextField
                                                label="Precio con impuestos"
                                                type="currency"
                                                value={entry.grossPrice}
                                                onChange={(event) => handleGrossPriceChange(entry.id, event.target.value)}
                                                currencySymbol={getCurrencySymbol(currencyCode)}
                                                allowDecimalComma={useDecimalComma}
                                                data-test-id={`update-variant-price-entry-${index}-gross`}
                                                disabled={isSubmitting}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Impuestos</p>
                                            {taxes.length === 0 ? (
                                                <p className="text-sm text-neutral-500">No hay impuestos configurados.</p>
                                            ) : (
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
                                            )}
                                        </div>

                                        {appliedTaxes.length > 0 && (
                                            <div className="text-xs text-neutral-500 space-y-1">
                                                <p>Precio neto estimado: {formattedNetDisplay}</p>
                                                <p>Precio con impuestos: {formattedGrossDisplay}</p>
                                                <p>
                                                    Impuestos aplicados:{' '}
                                                    {appliedTaxes
                                                        .map((tax) => `${tax.code || tax.name} (${Number(tax.rate) || 0}%)`)
                                                        .join(', ')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {duplicatedPriceListIds.size > 0 && (
                        <p className="text-xs text-amber-700">
                            Existen listas de precios repetidas. Ajusta la selección antes de continuar.
                        </p>
                    )}

                    {priceLists.length > 0 && priceEntries.length >= priceLists.length && (
                        <p className="text-xs text-neutral-500">
                            Ya utilizaste todas las listas de precios disponibles para esta variante.
                        </p>
                    )}
                </div>

                <div className="space-y-4">
                    <h4 className="font-medium text-neutral-700">Unidad de Medida</h4>
                    <div>
                        <Select
                            label="Unidad"
                            value={formData.unitId}
                            onChange={(id) => handleChange('unitId', id?.toString() || '')}
                            options={units.map((unit) => ({
                                id: unit.id,
                                label: `${unit.symbol} · ${unit.name}`,
                            }))}
                            placeholder="Seleccionar unidad"
                            data-test-id="update-variant-unit"
                            disabled={units.length === 0}
                        />
                        {selectedUnit && (
                            <p className="text-xs text-neutral-500 mt-1">
                                Dimensión: {selectedUnit.dimension} · Conversión a base: {selectedUnit.conversionFactor}
                            </p>
                        )}
                        {units.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                                No hay unidades activas disponibles. Configúralas en Ajustes → Unidades.
                            </p>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-neutral-200">
                    <Switch
                        label="Variante activa"
                        checked={formData.isActive}
                        onChange={(checked) => handleChange('isActive', checked)}
                        data-test-id="update-variant-active"
                    />
                </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                        <Button variant="outlined" onClick={handleClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !priceEntries.length}>
                            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </Dialog>

            <AddAttributeDialog
                open={showAddAttributeDialog}
                onClose={() => setShowAddAttributeDialog(false)}
                attributes={attributes}
                selectedAttributeIds={selectedAttributeIds}
                onAdd={handleAddAttribute}
            />
        </>
    );
};

export default UpdateVariantDialog;
