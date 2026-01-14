'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { Button } from '@/baseComponents/Button/Button';
import Select from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import Badge from '@/baseComponents/Badge/Badge';
import NumberStepper from '@/baseComponents/NumberStepper/NumberStepper';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Switch from '@/baseComponents/Switch/Switch';
import { PaymentMethod } from '@/data/entities/Transaction';
import { usePointOfSale } from '../context/PointOfSaleContext';
import { searchCustomersForPOS, type POSCustomerSummary } from '@/actions/pointOfSale';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const paymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CREDIT_CARD]: 'Tarjeta crédito',
    [PaymentMethod.DEBIT_CARD]: 'Tarjeta débito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.CREDIT]: 'Crédito',
    [PaymentMethod.MIXED]: 'Mixto',
};

const methodOptions = Object.values(PaymentMethod).map((method) => ({
    id: method,
    label: paymentMethodLabels[method as PaymentMethod] ?? method,
}));

const formatCurrency = (value: number) => currencyFormatter.format(value);

const buildCustomerSubtitle = (customer: POSCustomerSummary | null) => {
    if (!customer) {
        return 'Venta sin cliente asignado';
    }
    const parts: string[] = [];
    if (customer.documentNumber) {
        parts.push(`RUT ${customer.documentNumber}`);
    }
    if (customer.phone) {
        parts.push(`Tel. ${customer.phone}`);
    }
    if (customer.email) {
        parts.push(customer.email);
    }
    return parts.join(' · ') || 'Sin datos de contacto';
};

export default function PaymentDialog() {
    const {
        isPaymentDialogOpen,
        closePaymentDialog,
        paymentAllocations,
        addPaymentAllocation,
        updatePaymentAllocation,
        removePaymentAllocation,
        paymentSummary,
        totals,
        selectedCustomer,
        setSelectedCustomer,
    } = usePointOfSale();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [customerResults, setCustomerResults] = useState<POSCustomerSummary[]>([]);
    const [isSearching, startTransition] = useTransition();
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showCustomerList, setShowCustomerList] = useState(false);

    useEffect(() => {
        if (!isPaymentDialogOpen) {
            return;
        }
        setSearchTerm('');
        setDebouncedTerm('');
        setCustomerResults([]);
        setSearchError(null);
        setShowCustomerList(false);
    }, [isPaymentDialogOpen]);

    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedTerm(searchTerm.trim());
        }, 250);
        return () => clearTimeout(handle);
    }, [searchTerm]);

    useEffect(() => {
        if (!isPaymentDialogOpen) {
            return;
        }
        startTransition(async () => {
            try {
                const results = await searchCustomersForPOS({
                    search: debouncedTerm || undefined,
                    limit: 12,
                });
                setCustomerResults(results);
                setSearchError(null);
            } catch (error) {
                console.error('Error buscando clientes para POS', error);
                setSearchError('No fue posible obtener clientes. Intenta nuevamente.');
                setCustomerResults([]);
            }
        });
    }, [debouncedTerm, isPaymentDialogOpen]);

    const toggleCustomerList = () => setShowCustomerList((prev) => !prev);

    const handleSelectCustomer = (customer: POSCustomerSummary) => {
        setSelectedCustomer(customer);
        setShowCustomerList(false);
    };

    const paymentCanBeConfirmed = paymentSummary.due === 0
        ? paymentAllocations.length > 0
        : paymentSummary.remaining <= 0;

    return (
        <Dialog
            open={isPaymentDialogOpen}
            onClose={closePaymentDialog}
            title="Cobrar venta"
            size="xl"
            maxHeight="90vh"
            hideActions
        >
            <div className="flex flex-col gap-6">
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border/60 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase text-muted-foreground">Total venta</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(paymentSummary.due)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase text-muted-foreground">Pagado</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(paymentSummary.paid)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase text-muted-foreground">Saldo restante</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(paymentSummary.remaining)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase text-muted-foreground">Vuelto</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(paymentSummary.change)}</p>
                    </div>
                </section>

                <section className="rounded-xl border border-border/60 bg-white shadow-sm">
                    <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Cliente</h3>
                            <p className="text-sm text-muted-foreground">Selecciona un cliente o continúa sin asignar.</p>
                        </div>
                        <Switch
                            label="Venta sin cliente"
                            labelPosition="right"
                            checked={!selectedCustomer}
                            onChange={(checked) => {
                                if (checked) {
                                    setSelectedCustomer(null);
                                }
                            }}
                        />
                    </header>
                    <div className="flex flex-col gap-4 px-5 py-4">
                        {selectedCustomer ? (
                            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-gray-50 px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{selectedCustomer.displayName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {buildCustomerSubtitle(selectedCustomer)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="text"
                                        size="sm"
                                        onClick={() => setSelectedCustomer(null)}
                                    >
                                        Quitar cliente
                                    </Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary-outlined">
                                        Crédito: {formatCurrency(selectedCustomer.creditLimit)}
                                    </Badge>
                                    <Badge variant="secondary-outlined">
                                        Saldo: {formatCurrency(selectedCustomer.currentBalance)}
                                    </Badge>
                                    <Badge variant="success-outlined">
                                        Disponible: {formatCurrency(selectedCustomer.availableCredit)}
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-2">
                                    <TextField
                                        label="Buscar cliente"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Nombre, RUT o correo"
                                        startIcon="person_search"
                                    />
                                    <div className="flex items-center justify-between">
                                        <Button
                                            variant="outlined"
                                            size="sm"
                                            onClick={toggleCustomerList}
                                        >
                                            {showCustomerList ? 'Ocultar sugerencias' : 'Ver sugerencias'}
                                        </Button>
                                        {isSearching && (
                                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                                Buscando clientes…
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {(showCustomerList || debouncedTerm.length > 0) && (
                                    <div className="flex flex-col gap-2">
                                        {searchError && (
                                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                                                {searchError}
                                            </div>
                                        )}
                                        {!searchError && customerResults.length === 0 && debouncedTerm.length > 0 && !isSearching && (
                                            <div className="rounded-lg border border-dashed border-border/60 bg-gray-50 px-4 py-3 text-xs text-muted-foreground">
                                                No encontramos clientes que coincidan con tu búsqueda.
                                            </div>
                                        )}
                                        <div className="grid gap-2">
                                            {customerResults.map((customer) => (
                                                <button
                                                    key={customer.id}
                                                    type="button"
                                                    className="flex flex-col gap-1 rounded-lg border border-border/60 bg-white px-4 py-3 text-left transition hover:border-primary/60"
                                                    onClick={() => handleSelectCustomer(customer)}
                                                >
                                                    <span className="text-sm font-medium text-gray-900">{customer.displayName}</span>
                                                    <span className="text-xs text-muted-foreground">{buildCustomerSubtitle(customer)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-border/60 bg-white shadow-sm">
                    <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Métodos de pago</h3>
                            <p className="text-sm text-muted-foreground">Divide el cobro en múltiples métodos si lo necesitas.</p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => addPaymentAllocation()}
                            className="flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Agregar método
                        </Button>
                    </header>
                    <div className="flex flex-col gap-4 px-5 py-4">
                        {paymentAllocations.length === 0 && (
                            <div className="rounded-lg border border-dashed border-border/60 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
                                Agrega al menos un método de pago para registrar el cobro.
                            </div>
                        )}
                        {paymentAllocations.map((entry, index) => (
                            <div
                                key={entry.id}
                                className="flex flex-col gap-4 rounded-lg border border-border/60 bg-white px-4 py-3 shadow-sm"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <Select
                                        label="Método"
                                        options={methodOptions}
                                        value={entry.method}
                                        onChange={(value) => {
                                            if (typeof value === 'string') {
                                                updatePaymentAllocation(entry.id, {
                                                    method: value as PaymentMethod,
                                                });
                                            }
                                        }}
                                        data-test-id={`pos-payment-method-${index}`}
                                    />
                                    <IconButton
                                        icon="delete"
                                        variant="text"
                                        size="sm"
                                        ariaLabel="Eliminar método"
                                        onClick={() => removePaymentAllocation(entry.id)}
                                        disabled={paymentAllocations.length <= 1}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-medium uppercase text-muted-foreground">Monto</span>
                                        <NumberStepper
                                            value={entry.amount}
                                            min={0}
                                            step={1000}
                                            allowFloat={false}
                                            onChange={(value) => updatePaymentAllocation(entry.id, { amount: value })}
                                            data-test-id={`pos-payment-amount-${index}`}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {entry.method === PaymentMethod.CREDIT
                                                ? 'El monto cargará a la cuenta del cliente.'
                                                : 'Monto recibido para este método.'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <TextField
                                            label="Referencia opcional"
                                            value={entry.reference ?? ''}
                                            onChange={(event) => updatePaymentAllocation(entry.id, { reference: event.target.value })}
                                            placeholder="Ej: n° de boleta, últimos 4 dígitos"
                                        />
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="secondary-outlined">{paymentMethodLabels[entry.method]}</Badge>
                                            {index === 0 && paymentSummary.remaining > 0 && (
                                                <Badge variant="warning-outlined">
                                                    Restan {formatCurrency(paymentSummary.remaining)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="flex flex-col gap-4 border-t border-border/50 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">Total a cobrar</span>
                            <span className="text-2xl font-semibold text-gray-900">{formatCurrency(totals.total)}</span>
                        </div>
                        {paymentSummary.remaining > 0 && (
                            <Badge variant="warning">
                                Faltan {formatCurrency(paymentSummary.remaining)} por asignar.
                            </Badge>
                        )}
                        {paymentSummary.change > 0 && (
                            <Badge variant="success">
                                Vuelto {formatCurrency(paymentSummary.change)}
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                        <Button variant="outlined" size="md" onClick={closePaymentDialog}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            size="md"
                            disabled={!paymentCanBeConfirmed}
                        >
                            Confirmar cobro
                        </Button>
                    </div>
                </footer>
            </div>
        </Dialog>
    );
}
