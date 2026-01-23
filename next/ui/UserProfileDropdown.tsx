'use client'
import React, { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import ChangePasswordDialog from './ChangePasswordDialog';

interface UserProfileDropdownProps {
  className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = '' }) => {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const user = session?.user as Record<string, unknown> | undefined;
  const fullName = (user?.personName as string | undefined)
    || (user?.name as string | undefined)
    || 'Usuario';
  const loginName = (user?.userName as string | undefined) || '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center transition-colors text-foreground hover:text-[var(--color-secondary)] focus:outline-none"
        data-test-id="user-profile-button"
        aria-label="Menú de usuario"
      >
        <span className="material-symbols-outlined text-2xl">person</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-background shadow-lg border border-border z-50">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-bold text-foreground truncate">{fullName}</p>
            {loginName && (
              <p className="text-xs font-medium text-neutral-500 truncate italic">@{loginName}</p>
            )}
            <p className="text-xs text-muted-foreground truncate mt-1">{(user?.email as string | undefined) ?? ''}</p>
          </div>
          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsPasswordDialogOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-foreground hover:bg-neutral-100 transition-colors"
              data-test-id="change-password-button"
            >
              <span className="material-symbols-outlined text-lg">lock</span>
              Cambiar contraseña
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-primary hover:bg-neutral-100 transition-colors"
              data-test-id="logout-button"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <ChangePasswordDialog 
        isOpen={isPasswordDialogOpen} 
        onClose={() => setIsPasswordDialogOpen(false)} 
      />
    </div>
  );
};

export default UserProfileDropdown;
