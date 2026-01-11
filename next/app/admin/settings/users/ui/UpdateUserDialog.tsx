'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { updateUserWithPerson } from '@/app/actions/users';
import { UserRole } from '@/data/entities/User';

interface User {
    id: string;
    userName: string;
    mail: string;
    rol: string;
    person?: {
        name?: string;
        dni?: string;
        phone?: string;
    };
}

interface UpdateUserDialogProps {
    open: boolean;
    onClose: () => void;
    user: User | null;
    onSuccess?: () => void;
    'data-test-id'?: string;
}

const UpdateUserDialog: React.FC<UpdateUserDialogProps> = ({ 
    open, 
    onClose, 
    user, 
    onSuccess,
    'data-test-id': dataTestId 
}) => {
    const router = useRouter();
    const { success, error: showError } = useAlert();
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id;
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        userName: '',
        mail: '',
        phone: '',
        rol: 'OPERATOR',
        personName: '',
        personDni: ''
    });

    // Cargar datos del usuario cuando cambia
    useEffect(() => {
        if (user) {
            setFormData({
                userName: user.userName || '',
                mail: user.mail || '',
                phone: user.person?.phone || '',
                rol: user.rol || 'OPERATOR',
                personName: user.person?.name || '',
                personDni: user.person?.dni || ''
            });
        }
    }, [user]);

    const rolOptions = [
        { id: 'OPERATOR', label: 'Operador' },
        { id: 'ADMIN', label: 'Administrador' }
    ];

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user?.id) {
            showError('Usuario no identificado');
            return;
        }

        // Validaciones básicas
        const validationErrors: string[] = [];
        if (!formData.userName.trim()) validationErrors.push('El nombre de usuario es requerido');
        if (!formData.mail.trim()) validationErrors.push('El correo es requerido');
        if (!formData.personName.trim()) validationErrors.push('El nombre completo es requerido');
        if (!formData.personDni.trim()) validationErrors.push('El RUT es requerido');
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await updateUserWithPerson({
                id: String(user.id),
                userName: formData.userName,
                mail: formData.mail,
                phone: formData.phone || undefined,
                rol: formData.rol === 'ADMIN' ? UserRole.ADMIN : UserRole.OPERATOR,
                personName: formData.personName,
                personDni: formData.personDni,
            }, currentUserId);

            if (result.success) {
                success('Usuario actualizado exitosamente');
                
                setTimeout(() => {
                    onClose();
                    onSuccess?.();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                const errorMessage = result.error || 'Error al actualizar el usuario';
                showError(errorMessage);
                setErrors([errorMessage]);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            const errorMessage = err?.message || 'Error desconocido';
            showError(errorMessage);
            setErrors([errorMessage]);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Editar Usuario"
            data-test-id={dataTestId}
        >
            {user ? (
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

                    {/* Sección: Información del Usuario */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">
                            Información del Usuario
                        </h3>
                        
                        <TextField
                            label="Nombre de usuario"
                            value={formData.userName}
                            onChange={(e) => handleChange('userName', e.target.value)}
                            required
                            data-test-id="update-user-username"
                        />
                        
                        <TextField
                            label="Correo"
                            type="email"
                            value={formData.mail}
                            onChange={(e) => handleChange('mail', e.target.value)}
                            required
                            data-test-id="update-user-email"
                        />
                        
                        <TextField
                            label="Teléfono"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            data-test-id="update-user-phone"
                        />
                        
                        <Select
                            label="Rol"
                            options={rolOptions}
                            value={formData.rol}
                            onChange={(val) => handleChange('rol', val)}
                            data-test-id="update-user-rol"
                        />
                    </div>

                    {/* Sección: Información de la Persona */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-700 border-b pb-2">
                            Información de la Persona
                        </h3>
                        
                        <TextField
                            label="Nombre completo"
                            value={formData.personName}
                            onChange={(e) => handleChange('personName', e.target.value)}
                            required
                            data-test-id="update-user-person-name"
                        />
                        
                        <TextField
                            label="RUT"
                            value={formData.personDni}
                            onChange={(e) => handleChange('personDni', e.target.value)}
                            required
                            placeholder="12.345.678-9"
                            data-test-id="update-user-person-dni"
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Actualizando...' : 'Actualizar Usuario'}
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    No hay datos de usuario para mostrar
                </div>
            )}
        </Dialog>
    );
};

export default UpdateUserDialog;
