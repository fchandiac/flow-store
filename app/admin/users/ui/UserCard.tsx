'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteUserDialog from './DeleteUserDialog';
import UpdateUserDialog from './UpdateUserDialog';
import { usePermissions } from '@/app/state/hooks/usePermissions';

export interface UserCardProps {
    user: {
        id: string;
        userName: string;
        mail: string;
        rol?: string;
        person?: {
            name?: string;
            dni?: string;
            phone?: string;
        };
    };
    'data-test-id'?: string;
}

const UserCard: React.FC<UserCardProps> = ({ user, 'data-test-id': dataTestId }) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
    
    const fullName = user.person?.name || user.userName || user.mail;
    const isAdmin = user.userName === 'admin';
    const { has, permissions } = usePermissions();
    const canUpdate = has('USERS_UPDATE');
    const canDelete = has('USERS_DELETE');
    
    // Debug logs
    console.log('[UserCard] Usuario:', user.userName, '| isAdmin (target):', isAdmin);
    console.log('[UserCard] Permisos actuales:', permissions);
    console.log('[UserCard] canUpdate:', canUpdate, '| canDelete:', canDelete);

    const getRolBadgeVariant = (rol?: string): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'primary-outlined' | 'secondary-outlined' | 'success-outlined' | 'error-outlined' | 'warning-outlined' | 'info-outlined' => {
        switch (rol?.toUpperCase()) {
            case 'ADMIN':
                return 'info-outlined';
            case 'OPERATOR':
                return 'secondary-outlined';
            default:
                return 'secondary-outlined';
        }
    };

    const getRolLabel = (rol?: string): string => {
        switch (rol?.toUpperCase()) {
            case 'ADMIN':
                return 'Administrador';
            case 'OPERATOR':
                return 'Operador';
            default:
                return rol || 'Sin rol';
        }
    };

    return (
        <article 
            className="border border-neutral-200 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between min-w-[260px]" 
            data-test-id={dataTestId}
        >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 md:gap-4 items-stretch">
                {/* Columna del Avatar */}
                <div 
                    className="flex flex-col justify-center items-center h-full gap-2" 
                    data-test-id={`${dataTestId}-avatar`}
                >
                    <div className="relative flex-shrink-0 mx-auto">
                        <div className="h-16 w-16 rounded-full bg-neutral-100 border-4 border-secondary flex items-center justify-center overflow-hidden">
                            <span 
                                className="material-symbols-outlined text-secondary" 
                                style={{ fontSize: '2.8rem' }}
                            >
                                person
                            </span>
                        </div>
                    </div>

                    {user.rol && (
                        <Badge 
                            variant={getRolBadgeVariant(user.rol)} 
                            data-test-id={`${dataTestId}-badge`}
                        >
                            {getRolLabel(user.rol)}
                        </Badge>
                    )}
                </div>

                {/* Columna de Información */}
                <div 
                    className="flex flex-col gap-2 w-full overflow-hidden" 
                    data-test-id={`${dataTestId}-info`}
                >
                    {/* Nombre */}
                    <h3 
                        className="text-lg font-semibold text-foreground truncate" 
                        data-test-id={`${dataTestId}-name`}
                    >
                        {fullName}
                    </h3>

                    {/* Nombre de usuario */}
                    <p 
                        className="text-xs font-light text-neutral-600 truncate" 
                        data-test-id={`${dataTestId}-username`}
                    >
                        @{user.userName}
                    </p>

                    {/* Correo con icono */}
                    {!isAdmin && (
                        <div className="flex items-center gap-2" data-test-id={`${dataTestId}-email`}>
                            <span 
                                className="material-symbols-outlined text-neutral-500" 
                                style={{ fontSize: '0.875rem' }}
                            >
                                email
                            </span>
                            <p className="text-xs font-light text-neutral-500 truncate">
                                {user.mail}
                            </p>
                        </div>
                    )}

                    {/* Teléfono con icono */}
                    {user.person?.phone && (
                        <div className="flex items-center gap-2" data-test-id={`${dataTestId}-phone`}>
                            <span 
                                className="material-symbols-outlined text-neutral-500" 
                                style={{ fontSize: '0.875rem' }}
                            >
                                phone
                            </span>
                            <p className="text-xs font-light text-neutral-500 truncate">
                                {user.person.phone}
                            </p>
                        </div>
                    )}

                    {/* DNI/RUT con icono */}
                    {user.person?.dni && (
                        <div className="flex items-center gap-2" data-test-id={`${dataTestId}-dni`}>
                            <span 
                                className="material-symbols-outlined text-neutral-500" 
                                style={{ fontSize: '0.875rem' }}
                            >
                                badge
                            </span>
                            <p className="text-xs font-light text-neutral-500 truncate">
                                {user.person.dni}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Botones de acción */}
            <div 
                className="flex justify-end items-center mt-4 gap-1" 
                data-test-id={`${dataTestId}-actions`}
            >
                <IconButton 
                    icon="edit"
                    variant="basicSecondary"
                    aria-label={`Editar usuario ${fullName}`}
                    onClick={() => !isAdmin && canUpdate && setOpenUpdateDialog(true)}
                    disabled={isAdmin || !canUpdate}
                    data-test-id={`${dataTestId}-edit-button`}
                />
                <IconButton 
                    icon="delete"
                    variant="basicSecondary"
                    aria-label={`Eliminar usuario ${fullName}`}
                    onClick={() => !isAdmin && canDelete && setOpenDeleteDialog(true)}
                    disabled={isAdmin || !canDelete}
                    data-test-id={`${dataTestId}-delete-button`}
                />
            </div>

            {/* Dialogs */}
            <DeleteUserDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                user={{ ...user, rol: user.rol ?? '' }}
                data-test-id={`${dataTestId}-delete-dialog`}
            />

            <UpdateUserDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                user={{ ...user, rol: user.rol ?? '' }}
                data-test-id={`${dataTestId}-update-dialog`}
            />
        </article>
    );
};

export default UserCard;
