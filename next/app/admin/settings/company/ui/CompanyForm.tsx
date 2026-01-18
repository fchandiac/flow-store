'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { updateCompany } from '@/app/actions/companies';
import type { ShareholderRecord } from '@/actions/shareholders';
import CompanyBankAccountDialog from './CompanyBankAccountDialog';
import CompanyShareholdersSection from './CompanyShareholdersSection';

export interface CompanyType {
    id: string;
    name: string;
    defaultCurrency: string;
    fiscalYearStart?: string;
    isActive: boolean;
    settings?: Record<string, any>;
    bankAccounts?: CompanyBankAccount[] | null;
}

export interface CompanyBankAccount {
    bankName: string;
    accountType: string;
    accountNumber: string;
    accountHolderName?: string;
    notes?: string;
    isPrimary?: boolean;
}

interface CompanyFormProps {
    company: CompanyType;
    shareholders: ShareholderRecord[];
    'data-test-id'?: string;
}

const currencyOptions = [
    { id: 'CLP', label: 'Peso Chileno (CLP)' },
    { id: 'USD', label: 'Dólar (USD)' },
    { id: 'EUR', label: 'Euro (EUR)' },
];

const CompanyForm: React.FC<CompanyFormProps> = ({ company, shareholders: initialShareholders, 'data-test-id': dataTestId }) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>(company.bankAccounts ?? []);
    const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
    const [shareholders, setShareholders] = useState<ShareholderRecord[]>(initialShareholders);

    const [formData, setFormData] = useState({
        name: company.name || '',
        defaultCurrency: company.defaultCurrency || 'CLP',
        fiscalYearStart: company.fiscalYearStart || '',
    });

    useEffect(() => {
        setBankAccounts(company.bankAccounts ?? []);
    }, [company.bankAccounts]);

    useEffect(() => {
        setShareholders(initialShareholders);
    }, [initialShareholders]);

    useEffect(() => {
        setFormData({
            name: company.name || '',
            defaultCurrency: company.defaultCurrency || 'CLP',
            fiscalYearStart: company.fiscalYearStart || '',
        });
    }, [company.name, company.defaultCurrency, company.fiscalYearStart]);

    const handleChange = (field: string, value: string | number | null) => {
        const normalizedValue = value === null ? '' : value.toString();

        setFormData((prev) => ({
            ...prev,
            [field]: normalizedValue,
        }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const validationErrors: string[] = [];
        if (!formData.name.trim()) validationErrors.push('El nombre de la empresa es requerido');

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await updateCompany({
                name: formData.name,
                defaultCurrency: formData.defaultCurrency,
                fiscalYearStart: formData.fiscalYearStart ? new Date(formData.fiscalYearStart) : undefined,
            });

            if (result.success) {
                success('Empresa actualizada correctamente');
                setIsEditing(false);
                router.refresh();
            } else if (result.error) {
                setErrors([result.error]);
                showError(result.error);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al actualizar la empresa';
            setErrors([message]);
            showError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: company.name || '',
            defaultCurrency: company.defaultCurrency || 'CLP',
            fiscalYearStart: company.fiscalYearStart || '',
        });
        setErrors([]);
        setIsEditing(false);
    };

    const handleBankAccountSuccess = (updatedCompany: CompanyType) => {
        setBankAccounts(updatedCompany.bankAccounts ?? []);
        setIsBankDialogOpen(false);
        success('Cuenta bancaria agregada correctamente');
        router.refresh();
    };

    const sortedAccounts = useMemo(() => {
        return [...bankAccounts].sort((a, b) => (b.isPrimary === true ? 1 : 0) - (a.isPrimary === true ? 1 : 0)).reverse();
    }, [bankAccounts]);

    const hasPrimaryAccount = useMemo(() => bankAccounts.some((account) => account.isPrimary), [bankAccounts]);

    const primaryBadge = useMemo(
        () => (
            <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                Principal
            </span>
        ),
        [],
    );

    return (
        <div className="space-y-8" data-test-id={dataTestId}>
            <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-neutral-800">Información de la Empresa</h2>
                    {!isEditing && (
                        <Button
                            variant="outlined"
                            onClick={() => setIsEditing(true)}
                            data-test-id="company-edit-button"
                        >
                            Editar
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {errors.length > 0 && (
                        <Alert variant="error">
                            <ul className="list-disc list-inside">
                                {errors.map((err) => (
                                    <li key={err}>{err}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <TextField
                            label="Nombre de la Empresa"
                            value={formData.name}
                            onChange={(event) => handleChange('name', event.target.value)}
                            required
                            disabled={!isEditing}
                            data-test-id="company-name-input"
                        />

                        <Select
                            label="Moneda por Defecto"
                            options={currencyOptions}
                            value={formData.defaultCurrency}
                            onChange={(value) => handleChange('defaultCurrency', value)}
                            disabled={!isEditing}
                            data-test-id="company-currency-select"
                        />

                        <TextField
                            label="Inicio Año Fiscal"
                            type="date"
                            value={formData.fiscalYearStart}
                            onChange={(event) => handleChange('fiscalYearStart', event.target.value)}
                            disabled={!isEditing}
                            data-test-id="company-fiscal-year-input"
                        />
                    </div>

                    {isEditing && (
                        <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
                            <Button
                                variant="outlined"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                data-test-id="company-cancel-button"
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} data-test-id="company-save-button">
                                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    )}
                </form>
            </div>

            <section className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-800">Cuentas bancarias</h3>
                        <p className="text-sm text-neutral-500">
                            Registra las cuentas utilizadas para operaciones administrativas de la empresa.
                        </p>
                    </div>
                    <Button onClick={() => setIsBankDialogOpen(true)} data-test-id="company-add-bank-account-button">
                        Agregar cuenta bancaria
                    </Button>
                </div>

                {sortedAccounts.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
                        Aún no se han agregado cuentas bancarias. Registra la primera para facilitar pagos y conciliaciones.
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {sortedAccounts.map((account, index) => (
                            <article
                                key={`${account.accountNumber}-${index}`}
                                className={`rounded-lg border p-4 shadow-sm transition-colors ${
                                    account.isPrimary ? 'border-primary/80 bg-primary/5' : 'border-neutral-200 bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="text-base font-semibold text-neutral-800">{account.bankName}</h4>
                                        <p className="text-sm text-neutral-500">{account.accountType}</p>
                                    </div>
                                    {account.isPrimary && primaryBadge}
                                </div>
                                <div className="mt-4 rounded-md bg-neutral-100 px-3 py-2 font-mono text-sm text-neutral-800">
                                    {account.accountNumber}
                                </div>
                                <dl className="mt-4 space-y-2 text-sm text-neutral-600">
                                    {account.accountHolderName && (
                                        <div>
                                            <dt className="font-medium text-neutral-500">Titular</dt>
                                            <dd>{account.accountHolderName}</dd>
                                        </div>
                                    )}
                                    {account.notes && (
                                        <div>
                                            <dt className="font-medium text-neutral-500">Notas</dt>
                                            <dd>{account.notes}</dd>
                                        </div>
                                    )}
                                </dl>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <CompanyShareholdersSection
                companyName={company.name}
                shareholders={shareholders}
                onShareholdersChange={setShareholders}
            />

            <CompanyBankAccountDialog
                open={isBankDialogOpen}
                onClose={() => setIsBankDialogOpen(false)}
                onSuccess={handleBankAccountSuccess}
                defaultHolderName={company.name}
                mustBePrimary={!hasPrimaryAccount}
            />
        </div>
    );
};

export default CompanyForm;
