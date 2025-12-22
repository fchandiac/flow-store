'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { updateCompany } from '@/app/actions/companies';

export interface CompanyType {
    id: string;
    name: string;
    defaultCurrency: string;
    fiscalYearStart?: string;
    isActive: boolean;
    settings?: Record<string, any>;
}

interface CompanyFormProps {
    company: CompanyType;
    'data-test-id'?: string;
}

const currencyOptions = [
    { id: 'CLP', label: 'Peso Chileno (CLP)' },
    { id: 'USD', label: 'Dólar (USD)' },
    { id: 'EUR', label: 'Euro (EUR)' },
];

const CompanyForm: React.FC<CompanyFormProps> = ({ 
    company,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: company.name || '',
        defaultCurrency: company.defaultCurrency || 'CLP',
        fiscalYearStart: company.fiscalYearStart || '',
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validaciones básicas
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
            } else {
                setErrors([result.error || 'Error al actualizar la empresa']);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al actualizar la empresa']);
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

    return (
        <div 
            className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6"
            data-test-id={dataTestId}
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-neutral-800">
                    Información de la Empresa
                </h2>
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
                {/* Errores */}
                {errors.length > 0 && (
                    <Alert variant="error">
                        <ul className="list-disc list-inside">
                            {errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TextField
                        label="Nombre de la Empresa"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        disabled={!isEditing}
                        data-test-id="company-name-input"
                    />
                    
                    <Select
                        label="Moneda por Defecto"
                        options={currencyOptions}
                        value={formData.defaultCurrency}
                        onChange={(val) => handleChange('defaultCurrency', val)}
                        disabled={!isEditing}
                        data-test-id="company-currency-select"
                    />
                    
                    <TextField
                        label="Inicio Año Fiscal"
                        type="date"
                        value={formData.fiscalYearStart}
                        onChange={(e) => handleChange('fiscalYearStart', e.target.value)}
                        disabled={!isEditing}
                        data-test-id="company-fiscal-year-input"
                    />
                </div>

                {/* Botones de acción */}
                {isEditing && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                        <Button
                            variant="outlined"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            data-test-id="company-cancel-button"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            data-test-id="company-save-button"
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CompanyForm;
