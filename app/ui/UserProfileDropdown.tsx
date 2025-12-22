'use client'
import React, { useState, useRef, useEffect } from 'react';
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
    await signOut({ callbackUrl: '/login' });
  };

  const userName = session?.user?.name || 'Usuario';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center transition-colors text-foreground hover:text-secondary focus:outline-none"
        data-test-id="user-profile-button"
        aria-label="Menú de usuario"
      >
        <span className="material-symbols-outlined text-2xl">person</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-background shadow-lg border border-border z-50">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
          <div className="p-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md hover:bg-accent transition-colors"
              data-test-id="logout-button"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
