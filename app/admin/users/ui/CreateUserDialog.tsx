'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import Select from '@/app/baseComponents/Select/Select';
import { Button } from '@/app/baseComponents/Button/Button';
import Alert from '@/app/baseComponents/Alert/Alert';
import { useAlert } from '@/app/state/hooks/useAlert';
import { createUserWithPerson } from '@/app/actions/users';
import { UserRole } from '@/data/entities/User';

interface CreateUserDialogProps {
    open: boolean;
    onClose: () => void;
    'data-test-id'?: string;
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ 
    open, 
    onClose,
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
        password: '',
        phone: '',
        rol: 'OPERATOR',
        personName: '',
        personDni: ''
    });

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
        
        // Validaciones básicas
        const validationErrors: string[] = [];
        if (!formData.userName.trim()) validationErrors.push('El nombre de usuario es requerido');
        if (!formData.mail.trim()) validationErrors.push('El correo es requerido');
        if (!formData.password.trim()) validationErrors.push('La contraseña es requerida');
        if (!formData.personName.trim()) validationErrors.push('El nombre completo es requerido');
        if (!formData.personDni.trim()) validationErrors.push('El RUT es requerido');
        
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors([]);

        try {
            const result = await createUserWithPerson({
                userName: formData.userName,
                mail: formData.mail,
                phone: formData.phone || undefined,
                rol: formData.rol === 'ADMIN' ? UserRole.ADMIN : UserRole.OPERATOR,
                password: formData.password,
                personName: formData.personName,
                personDni: formData.personDni,
            }, currentUserId);

            if (result.success) {
                success('Usuario creado correctamente');
                setFormData({
                    userName: '',
                    mail: '',
                    password: '',
                    phone: '',
                    rol: 'OPERATOR',
                    personName: '',
                    personDni: ''
                });

                setTimeout(() => {
                    onClose();
                    router.refresh();
                    setIsSubmitting(false);
                }, 300);
            } else {
                setErrors([result.error || 'Error al crear el usuario']);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            setErrors([err?.message || 'Error al crear el usuario']);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            userName: '',
            mail: '',
            password: '',
            phone: '',
            rol: 'OPERATOR',
            personName: '',
            personDni: ''
        });
        setErrors([]);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            title="Crear Usuario"
            data-test-id={dataTestId}
        >
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
                        data-test-id="create-user-username"
                    />
                    
                    <TextField
                        label="Correo"
                        type="email"
                        value={formData.mail}
                        onChange={(e) => handleChange('mail', e.target.value)}
                        required
                        data-test-id="create-user-email"
                    />
                    
                    <TextField
                        label="Contraseña"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        required
                        data-test-id="create-user-password"
                    />
                    
                    <TextField
                        label="Teléfono"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        data-test-id="create-user-phone"
                    />
                    
                    <Select
                        label="Rol"
                        options={rolOptions}
                        value={formData.rol}
                        onChange={(val) => handleChange('rol', val)}
                        data-test-id="create-user-rol"
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
                        data-test-id="create-user-person-name"
                    />
                    
                    <TextField
                        label="RUT"
                        value={formData.personDni}
                        onChange={(e) => handleChange('personDni', e.target.value)}
                        required
                        placeholder="12.345.678-9"
                        data-test-id="create-user-person-dni"
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
                        {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};

export default CreateUserDialog;
