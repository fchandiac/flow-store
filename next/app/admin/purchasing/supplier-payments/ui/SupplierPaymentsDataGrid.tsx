'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import Badge, { type BadgeVariant } from '@/baseComponents/Badge/Badge';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Dialog from '@/baseComponents/Dialog/Dialog';
import Select from '@/baseComponents/Select/Select';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import Alert from '@/baseComponents/Alert/Alert';
import {
    getSupplierPayments,
    getSupplierPaymentContext,
    completeSupplierPayment,
    type SupplierPaymentListItem,
    type SupplierPaymentContext,
} from '@/actions/supplierPayments';
import { useAlert } from '@/globalstate/alert/useAlert';
import { PaymentMethod, TransactionStatus } from '@/data/entities/Transaction';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const paymentStatusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: 'Pendiente', variant: 'warning' },
    PARTIAL: { label: 'Parcial', variant: 'info' },
    PAID: { label: 'Pagada', variant: 'success' },
    CANCELLED: { label: 'Cancelada', variant: 'secondary' },
    FAILED: { label: 'Fallida', variant: 'error' },
};

const originLabels: Record<string, { label: string; variant: BadgeVariant }> = {
    PURCHASE_RECEPTION: { label: 'Recepción OC', variant: 'info-outlined' },
    DIRECT_RECEPTION: { label: 'Recepción directa', variant: 'secondary-outlined' },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CREDIT_CARD]: 'Tarjeta crédito',
    [PaymentMethod.DEBIT_CARD]: 'Tarjeta débito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.CHECK]: 'Cheque',
    [PaymentMethod.CREDIT]: 'Crédito',
    [PaymentMethod.INTERNAL_CREDIT]: 'Crédito interno',
    [PaymentMethod.MIXED]: 'Mixto',
};

const normalizePaymentStatus = (status?: string | null) => {
    if (!status) return 'PENDING';
    return status.toUpperCase();
};

const paymentDialogMethodOptions = [
    { id: PaymentMethod.CASH, label: 'Efectivo' },
    { id: PaymentMethod.TRANSFER, label: 'Transferencia' },
];

interface PaymentFormState {
    paymentMethod: PaymentMethod;
    supplierAccountIndex: string | null;
    companyAccountIndex: string | null;
    note: string;
}

const createInitialFormState = (): PaymentFormState => ({
    paymentMethod: PaymentMethod.CASH,
    supplierAccountIndex: null,
    companyAccountIndex: null,
    note: '',
});

// Show due date context with badge that highlights urgency.
const buildDueDateDisplay = (payment: SupplierPaymentListItem) => {
    const dueDateRaw = payment.paymentDueDate;

    if (!dueDateRaw) {
        return (
            <Badge variant='secondary-outlined' className='mt-1 w-fit'>
                Sin vencimiento
            </Badge>
        );
    }

    const dueDate = moment(dueDateRaw, moment.ISO_8601, true).isValid()
        ? moment(dueDateRaw)
        : moment(dueDateRaw, 'YYYY-MM-DD');

    const today = moment().startOf('day');
    const dueAtStart = dueDate.clone().startOf('day');
    const diffDays = dueAtStart.diff(today, 'days');

    let variant: BadgeVariant;
    let label: string;

    if (diffDays < 0) {
        variant = 'error';
        label = `Atrasado ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`;
    } else if (diffDays === 0) {
        variant = 'warning';
        label = 'Vence hoy';
    } else if (diffDays <= 3) {
        variant = 'warning';
        label = `Vence en ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    } else {
        variant = 'info';
        label = `Vence en ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    }

    return (
        <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-900'>
                {dueDate.format('DD-MM-YYYY')}
            </span>
            <Badge variant={variant} className='mt-1 w-fit'>
                {label}
            </Badge>
        </div>
    );
};

const SupplierPaymentsDataGrid = () => {
    const { success: showSuccess, error: showError } = useAlert();
    const [rows, setRows] = useState<SupplierPaymentListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [dialogLoading, setDialogLoading] = useState(false);
    const [dialogSubmitting, setDialogSubmitting] = useState(false);
    const [dialogErrors, setDialogErrors] = useState<string[]>([]);
    const [selectedPayment, setSelectedPayment] = useState<SupplierPaymentListItem | null>(null);
    const [paymentContext, setPaymentContext] = useState<SupplierPaymentContext | null>(null);
    const [formState, setFormState] = useState<PaymentFormState>(() => createInitialFormState());

    const loadPayments = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getSupplierPayments({ limit: 100 });
            setRows(result);
        } catch (error) {
            console.error('Error cargando pagos a proveedores:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPayments();
    }, [loadPayments]);

    const supplierAccountOptions = useMemo(() => {
        if (!paymentContext) {
            return [];
        }

        return paymentContext.supplierAccounts.map((account, index) => {
            const suffix = account.isPrimary ? ' · Principal' : '';
            return {
                id: index.toString(),
                label: `${account.bankName} · ${account.accountNumber} (${account.accountType})${suffix}`,
            };
        });
    }, [paymentContext]);

    const companyAccountOptions = useMemo(() => {
        if (!paymentContext) {
            return [];
        }

        return paymentContext.companyAccounts
            .map((account, index) => {
                if (!account.accountKey) {
                    return null;
                }

                const suffix = account.isPrimary ? ' · Principal' : '';
                return {
                    id: index.toString(),
                    label: `${account.bankName} · ${account.accountNumber} (${account.accountType})${suffix}`,
                };
            })
            .filter((option): option is { id: string; label: string } => option !== null);
    }, [paymentContext]);

    const handleCloseDialog = useCallback(() => {
        setPayDialogOpen(false);
        setDialogErrors([]);
        setDialogLoading(false);
        setDialogSubmitting(false);
        setSelectedPayment(null);
        setPaymentContext(null);
        setFormState(createInitialFormState());
    }, []);

    const handleOpenPaymentDialog = useCallback(async (payment: SupplierPaymentListItem) => {
        setSelectedPayment(payment);
        setDialogErrors([]);
        setPaymentContext(null);
        setFormState(createInitialFormState());
        setPayDialogOpen(true);
        setDialogLoading(true);

        try {
            const response = await getSupplierPaymentContext(payment.id);

            if (!response.success) {
                setPayDialogOpen(false);
                showError(response.error);
                return;
            }

            const { data } = response;

            if (data.payment.pendingAmount <= 0) {
                setPayDialogOpen(false);
                showError('El pago ya fue registrado.');
                return;
            }

            const initialState = createInitialFormState();
            const hasCompanyAccounts = data.companyAccounts.some((account) => Boolean(account.accountKey));
            const hasTransferSetup = data.supplierAccounts.length > 0 && hasCompanyAccounts;

            if (data.payment.paymentMethod === PaymentMethod.TRANSFER && hasTransferSetup) {
                initialState.paymentMethod = PaymentMethod.TRANSFER;
            } else if (hasTransferSetup) {
                initialState.paymentMethod = PaymentMethod.TRANSFER;
            }

            const supplierPrimaryIndex = data.supplierAccounts.findIndex((account) => account.isPrimary);
            if (supplierPrimaryIndex >= 0) {
                initialState.supplierAccountIndex = supplierPrimaryIndex.toString();
            } else if (data.supplierAccounts.length > 0) {
                initialState.supplierAccountIndex = '0';
            }

            const companyPrimaryIndex = data.companyAccounts.findIndex(
                (account) => account.isPrimary && Boolean(account.accountKey),
            );
            if (companyPrimaryIndex >= 0) {
                initialState.companyAccountIndex = companyPrimaryIndex.toString();
            } else {
                const firstWithKey = data.companyAccounts.findIndex((account) => Boolean(account.accountKey));
                if (firstWithKey >= 0) {
                    initialState.companyAccountIndex = firstWithKey.toString();
                }
            }

            if (data.payment.notes) {
                initialState.note = data.payment.notes;
            }

            setFormState(initialState);
            setPaymentContext(data);
        } catch (error) {
            console.error('Error obteniendo contexto de pago:', error);
            setPayDialogOpen(false);
            showError('No se pudo cargar la información del pago.');
        } finally {
            setDialogLoading(false);
        }
    }, [showError]);

    const handleSubmit = useCallback(async () => {
        if (!selectedPayment || !paymentContext) {
            showError('No se pudo encontrar el pago seleccionado.');
            return;
        }

        const validationErrors: string[] = [];

        if (!formState.paymentMethod) {
            validationErrors.push('Debes seleccionar el método de pago.');
        }

        if (formState.paymentMethod === PaymentMethod.TRANSFER) {
            if (paymentContext.supplierAccounts.length === 0) {
                validationErrors.push('El proveedor no tiene cuentas bancarias registradas.');
            }
            if (paymentContext.companyAccounts.length === 0) {
                validationErrors.push('La compañía no tiene cuentas bancarias configuradas.');
            }
            if (formState.supplierAccountIndex === null) {
                validationErrors.push('Selecciona la cuenta bancaria del proveedor.');
            }
            if (formState.companyAccountIndex === null) {
                validationErrors.push('Selecciona la cuenta bancaria de la compañía.');
            }
        }

        if (validationErrors.length > 0) {
            setDialogErrors(validationErrors);
            return;
        }

        setDialogErrors([]);
        setDialogSubmitting(true);

        try {
            const trimmedNote = formState.note.trim();

            const requestData: Parameters<typeof completeSupplierPayment>[0] = {
                paymentId: selectedPayment.id,
                paymentMethod: formState.paymentMethod,
                note: trimmedNote.length > 0 ? trimmedNote : undefined,
            };

            if (formState.paymentMethod === PaymentMethod.TRANSFER) {
                const supplierIndex = formState.supplierAccountIndex === null
                    ? -1
                    : Number(formState.supplierAccountIndex);
                const companyIndex = formState.companyAccountIndex === null
                    ? -1
                    : Number(formState.companyAccountIndex);

                const supplierAccount = paymentContext.supplierAccounts[supplierIndex] ?? null;
                const companyAccount = paymentContext.companyAccounts[companyIndex] ?? null;

                if (!supplierAccount || !companyAccount) {
                    setDialogErrors(['Las cuentas bancarias seleccionadas no son válidas.']);
                    return;
                }

                if (!companyAccount.accountKey) {
                    setDialogErrors(['La cuenta bancaria seleccionada no tiene un identificador válido.']);
                    return;
                }

                requestData.supplierAccount = {
                    bankName: supplierAccount.bankName,
                    accountType: supplierAccount.accountType,
                    accountNumber: supplierAccount.accountNumber,
                    accountHolderName: supplierAccount.accountHolderName,
                };

                requestData.companyAccount = {
                    bankName: companyAccount.bankName,
                    accountType: companyAccount.accountType,
                    accountNumber: companyAccount.accountNumber,
                    accountHolderName: companyAccount.accountHolderName,
                };

                requestData.companyAccountKey = companyAccount.accountKey;
            }

            const result = await completeSupplierPayment(requestData);

            if (!result.success) {
                const message = result.error ?? 'No se pudo registrar el pago.';
                setDialogErrors([message]);
                showError(message);
                return;
            }

            showSuccess('Pago registrado correctamente.');
            handleCloseDialog();
            await loadPayments();
        } catch (error) {
            console.error('Error completando pago a proveedor:', error);
            const message = 'Ocurrió un error al registrar el pago.';
            setDialogErrors([message]);
            showError(message);
        } finally {
            setDialogSubmitting(false);
        }
    }, [formState, handleCloseDialog, loadPayments, paymentContext, selectedPayment, showError, showSuccess]);

    const columns: DataGridColumn[] = useMemo(() => [
        {
            field: 'documentNumber',
            headerName: 'Documento',
            flex: 0.9,
            renderCell: (params) => (
                <div className='flex flex-col'>
                    <span className='font-mono text-sm font-semibold text-gray-900'>
                        {(params.row as SupplierPaymentListItem).documentNumber}
                    </span>
                    {(params.row as SupplierPaymentListItem).externalReference && (
                        <span className='text-xs text-muted-foreground'>
                            Ref: {(params.row as SupplierPaymentListItem).externalReference}
                        </span>
                    )}
                </div>
            ),
        },
        {
            field: 'supplierName',
            headerName: 'Proveedor',
            flex: 1.4,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                return (
                    <div className='flex flex-col'>
                        <span className='text-sm font-medium text-gray-900'>
                            {row.supplierName ?? 'Sin proveedor'}
                        </span>
                        {row.supplierAlias && (
                            <span className='text-xs text-muted-foreground'>
                                Alias: {row.supplierAlias}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            field: 'total',
            headerName: 'Monto',
            flex: 0.8,
            align: 'right',
            renderCell: (params) => (
                <span className='text-sm font-semibold text-gray-900'>
                    {currencyFormatter.format((params.row as SupplierPaymentListItem).total)}
                </span>
            ),
        },
        {
            field: 'paymentStatus',
            headerName: 'Estado de pago',
            flex: 0.9,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const normalized = normalizePaymentStatus(row.paymentStatus);
                const config = paymentStatusConfig[normalized] ?? {
                    label: normalized,
                    variant: 'secondary' as BadgeVariant,
                };
                return <Badge variant={config.variant}>{config.label}</Badge>;
            },
        },
        {
            field: 'paymentDueDate',
            headerName: 'Vencimiento',
            flex: 1.1,
            renderCell: (params) => buildDueDateDisplay(params.row as SupplierPaymentListItem),
        },
        {
            field: 'createdAt',
            headerName: 'Creado',
            flex: 1,
            renderCell: (params) => (
                <span className='text-sm text-gray-600'>
                    {moment((params.row as SupplierPaymentListItem).createdAt).format('DD-MM-YYYY HH:mm')}
                </span>
            ),
        },
        {
            field: 'origin',
            headerName: 'Origen',
            flex: 1,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const origin = row.origin ? row.origin.toUpperCase() : null;
                const config = origin ? originLabels[origin] : null;
                return (
                    <div className='flex flex-col'>
                        {row.receptionDocumentNumber ? (
                            <span className='font-mono text-xs text-blue-600'>
                                {row.receptionDocumentNumber}
                            </span>
                        ) : (
                            <span className='text-xs text-muted-foreground'>Sin documento origen</span>
                        )}
                        {config ? (
                            <Badge variant={config.variant} className='mt-1 w-fit'>
                                {config.label}
                            </Badge>
                        ) : null}
                    </div>
                );
            },
        },
        {
            field: 'paymentMethod',
            headerName: 'Método',
            flex: 0.7,
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const method = row.paymentMethod;
                const label = method
                    ? (Object.prototype.hasOwnProperty.call(paymentMethodLabels, method)
                        ? paymentMethodLabels[method as PaymentMethod]
                        : method)
                    : 'No asignado';
                return <span className='text-sm text-gray-700'>{label}</span>;
            },
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            flex: 0.5,
            align: 'center',
            renderCell: (params) => {
                const row = params.row as SupplierPaymentListItem;
                const normalized = normalizePaymentStatus(row.paymentStatus);
                const disabled =
                    normalized === 'PAID'
                    || normalized === 'CANCELLED'
                    || row.status === TransactionStatus.CANCELLED;

                return (
                    <IconButton
                        icon='payments'
                        variant='ghost'
                        size='sm'
                        ariaLabel='Registrar pago'
                        disabled={disabled}
                        onClick={() => {
                            if (!disabled) {
                                void handleOpenPaymentDialog(row);
                            }
                        }}
                    />
                );
            },
        },
    ], [handleOpenPaymentDialog]);

    const headerActions = (
        <div className='flex items-center gap-2'>
            <IconButton
                icon='refresh'
                variant='ghost'
                size='sm'
                ariaLabel='Actualizar lista'
                onClick={loadPayments}
                isLoading={loading}
            />
        </div>
    );

    const supplierAccountsAvailable = supplierAccountOptions.length > 0;
    const companyAccountsAvailable = companyAccountOptions.length > 0;

    return (
        <>
            <DataGrid
                columns={columns}
                rows={rows}
                title='Pagos a proveedores'
                totalRows={rows.length}
                headerActions={headerActions}
            />

            <Dialog
                open={payDialogOpen}
                onClose={handleCloseDialog}
                title='Registrar pago a proveedor'
                size='md'
            >
                {dialogLoading ? (
                    <div className='py-8 text-center text-sm text-muted-foreground'>
                        Cargando información del pago...
                    </div>
                ) : paymentContext ? (
                    <form
                        className='flex flex-col gap-6'
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSubmit();
                        }}
                    >
                        <div className='space-y-2 rounded-md bg-neutral-50 p-4 text-sm text-neutral-700'>
                            <div className='flex justify-between'>
                                <span className='font-medium text-neutral-800'>Documento</span>
                                <span className='font-mono text-sm text-neutral-900'>
                                    {paymentContext.payment.documentNumber}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-neutral-600'>Proveedor</span>
                                <span className='text-neutral-900'>
                                    {paymentContext.payment.supplierName ?? 'Sin proveedor'}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-neutral-600'>Monto total</span>
                                <span className='font-semibold text-neutral-900'>
                                    {currencyFormatter.format(paymentContext.payment.total)}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-neutral-600'>Pendiente</span>
                                <span className='font-semibold text-primary-600'>
                                    {currencyFormatter.format(paymentContext.payment.pendingAmount)}
                                </span>
                            </div>
                        </div>

                        {dialogErrors.length > 0 && (
                            <Alert variant='error'>
                                <ul className='list-inside list-disc space-y-1 text-sm'>
                                    {dialogErrors.map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                            </Alert>
                        )}

                        <Select
                            label='Método de pago'
                            options={paymentDialogMethodOptions}
                            value={formState.paymentMethod}
                            onChange={(value) => {
                                if (typeof value === 'string') {
                                    const nextMethod = value as PaymentMethod;
                                    setFormState((prev) => ({
                                        ...prev,
                                        paymentMethod: nextMethod,
                                        supplierAccountIndex: nextMethod === PaymentMethod.TRANSFER ? prev.supplierAccountIndex : null,
                                        companyAccountIndex: nextMethod === PaymentMethod.TRANSFER ? prev.companyAccountIndex : null,
                                    }));
                                }
                            }}
                            required
                        />

                        {formState.paymentMethod === PaymentMethod.TRANSFER && (
                            <div className='space-y-4'>
                                {(!supplierAccountsAvailable || !companyAccountsAvailable) && (
                                    <Alert variant='warning'>
                                        <div className='flex flex-col gap-1 text-sm'>
                                            {!supplierAccountsAvailable && (
                                                <span>El proveedor no tiene cuentas bancarias registradas.</span>
                                            )}
                                            {!companyAccountsAvailable && (
                                                <span>La compañía no tiene cuentas bancarias configuradas.</span>
                                            )}
                                        </div>
                                    </Alert>
                                )}

                                <Select
                                    label='Cuenta bancaria del proveedor'
                                    options={supplierAccountOptions}
                                    value={supplierAccountsAvailable ? formState.supplierAccountIndex : null}
                                    onChange={(value) => {
                                        if (typeof value === 'string') {
                                            setFormState((prev) => ({
                                                ...prev,
                                                supplierAccountIndex: value,
                                            }));
                                        } else if (value === null) {
                                            setFormState((prev) => ({
                                                ...prev,
                                                supplierAccountIndex: null,
                                            }));
                                        }
                                    }}
                                    required={supplierAccountsAvailable}
                                    disabled={!supplierAccountsAvailable}
                                />

                                <Select
                                    label='Cuenta bancaria de la compañía'
                                    options={companyAccountOptions}
                                    value={companyAccountsAvailable ? formState.companyAccountIndex : null}
                                    onChange={(value) => {
                                        if (typeof value === 'string') {
                                            setFormState((prev) => ({
                                                ...prev,
                                                companyAccountIndex: value,
                                            }));
                                        } else if (value === null) {
                                            setFormState((prev) => ({
                                                ...prev,
                                                companyAccountIndex: null,
                                            }));
                                        }
                                    }}
                                    required={companyAccountsAvailable}
                                    disabled={!companyAccountsAvailable}
                                />
                            </div>
                        )}

                        <TextField
                            label='Notas'
                            value={formState.note}
                            onChange={(event) => {
                                const value = event.target.value;
                                setFormState((prev) => ({ ...prev, note: value }));
                            }}
                            type='textarea'
                            rows={3}
                            placeholder='Información adicional sobre el pago (opcional)'
                        />

                        <div className='flex justify-end gap-3'>
                            <Button
                                type='button'
                                variant='text'
                                onClick={() => {
                                    if (!dialogSubmitting) {
                                        handleCloseDialog();
                                    }
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type='submit'
                                loading={dialogSubmitting}
                                disabled={dialogSubmitting}
                            >
                                Confirmar pago
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className='py-8 text-center text-sm text-muted-foreground'>
                        No se pudo cargar la información del pago.
                    </div>
                )}
            </Dialog>
        </>
    );
};

export default SupplierPaymentsDataGrid;
