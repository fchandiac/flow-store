'use client'
import React, { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

interface UserProfileDropdownProps {
  className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = '' }) => {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
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
  const userName = (user?.personName as string | undefined)
    || (user?.name as string | undefined)
    || (user?.userName as string | undefined)
    || 'Usuario';

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
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-background shadow-lg border border-border z-50">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{(user?.email as string | undefined) ?? ''}</p>
          </div>
          <div className="p-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md text-primary hover:scale-105 transition-transform"
              data-test-id="logout-button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
