'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import UserCard from './UserCard';
import CreateUserDialog from './CreateUserDialog';

export enum UserRole {
    ADMIN = 'ADMIN',
    OPERATOR = 'OPERATOR'
}

export interface UserType {
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

export interface UserListProps {
    users: UserType[];
}

const defaultEmptyMessage = 'No hay usuarios para mostrar.';

const UserList: React.FC<UserListProps> = ({ users }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setSearch(value);
        
        const params = typeof window !== 'undefined' 
            ? new URLSearchParams(window.location.search) 
            : new URLSearchParams();
        
        if (value) {
            params.set('search', value);
        } else {
            params.delete('search');
        }
        
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '/admin/settings/users';
        router.replace(`${pathname}?${params.toString()}`);
        router.refresh();
    };

    const displayedUsers = users;

    return (
        <div className="w-full" data-test-id="users-list-container">
            {/* Header con búsqueda y botón agregar */}
            <div className="flex items-center justify-between mb-6 gap-4" data-test-id="users-list-header">
                <IconButton 
                    icon="add" 
                    variant="outlined"
                    aria-label="Agregar usuario"
                    onClick={() => setOpenCreateDialog(true)}
                    data-test-id="users-add-button"
                />
                <div className="w-full max-w-sm" data-test-id="users-search-container">
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={handleSearchChange}
                        startIcon="search"
                        placeholder="Buscar usuario..."
                        data-test-id="users-search-input"
                    />
                </div>
            </div>

            {/* Grid de tarjetas */}
            <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full" 
                data-test-id="users-grid"
            >
                {displayedUsers && displayedUsers.length > 0 ? (
                    displayedUsers.map(user => (
                        <UserCard 
                            key={user.id} 
                            user={user}
                            data-test-id={`user-card-${user.id}`}
                        />
                    ))
                ) : (
                    <div 
                        className="col-span-full text-center text-neutral-500 py-8" 
                        data-test-id="users-empty-message"
                    >
                        {defaultEmptyMessage}
                    </div>
                )}
            </div>

            {/* CreateUserDialog */}
            <CreateUserDialog 
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                data-test-id="users-create-dialog"
            />
        </div>
    );
};

export default UserList;
