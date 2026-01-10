'use client'
import React, { useState, useContext, useTransition } from 'react';
import Image from 'next/image';
import SideBar, { SideBarMenuItem } from './SideBar';
import UserProfileDropdown from '@/app/ui/UserProfileDropdown';

interface TopBarProps {
  title?: string;
  logoSrc?: string;
  className?: string;
  onMenuClick?: () => void;
  SideBarComponent?: React.ComponentType<{ onClose: () => void }>;
  menuItems?: SideBarMenuItem[]; // if provided, TopBar will render SideBar internally
  // New props for user profile
  showUserButton?: boolean;
  userName?: string;
}

interface SideBarControl {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const SideBarContext = React.createContext<SideBarControl>({
  open: () => {},
  close: () => {},
  isOpen: false,
  expanded: {},
  setExpanded: () => {},
});

export function useSideBar() {
  return useContext(SideBarContext);
}

const TopBar: React.FC<TopBarProps> = ({
  title = 'title',
  logoSrc,
  className,
  SideBarComponent,
  menuItems = [],
  showUserButton = false,
  userName
}) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({});
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const open = () => setShowSidebar(true);
  const close = () => setShowSidebar(false);

  return (
    <SideBarContext.Provider value={{ open, close, isOpen: showSidebar, expanded: sidebarExpanded, setExpanded: setSidebarExpanded }}>
        <div data-test-id="top-bar-root">
      <header className={`fixed top-0 z-30 w-full flex items-center justify-between px-10 py-2 pb-3 bg-background border-b-[2px] border-primary ${className}`}>
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <>
                {(!logoLoaded || logoError) && (
                  <div className="h-10 w-10 bg-neutral-300 rounded-lg flex items-center justify-center" data-test-id="top-bar-logo-skeleton">
                    {logoError && (
                      <span className="material-symbols-outlined text-neutral-400" style={{ fontSize: 20 }}>
                        image_not_supported
                      </span>
                    )}
                  </div>
                )}
                {!logoError && (
                  <Image
                    src={logoSrc}
                    alt="Logo"
                    width={40}
                    height={40}
                    className={`h-10 w-10 object-contain transition-opacity duration-300 ${!logoLoaded ? 'opacity-0 absolute' : 'opacity-100'}`}
                    data-test-id="top-bar-logo"
                    onLoadingComplete={() => setLogoLoaded(true)}
                    onError={() => setLogoError(true)}
                  />
                )}
              </>
            ) : (
              <div className="h-10 w-10 bg-neutral-300 rounded-lg flex items-center justify-center" data-test-id="top-bar-logo-placeholder">
                <span className="material-symbols-outlined text-neutral-400" style={{ fontSize: 20 }}>
                  image
                </span>
              </div>
            )}
            <span className="text-lg font-bold text-foreground" data-test-id="top-bar-title">{title}</span>
          </div>

          {/* Right side elements */}
          <div className="flex items-center gap-2">
            {/* User name */}
            {userName && (
              <span className="text-sm font-weight-300 text-foreground" data-test-id="top-bar-user-name">
                {userName}
              </span>
            )}

            {/* User Profile Dropdown */}
            {showUserButton && (
              <UserProfileDropdown />
            )}

            {/* Menu button */}
            <button
              type="button"
              onClick={open}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors text-foreground hover:text-secondary focus:outline-none"
              data-test-id="top-bar-menu-button"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-2xl" aria-hidden>
                menu
              </span>
            </button>
          </div>
        </header>
        {/* Renderizar SideBar como modal, solo si showSidebar está activo */}
        {showSidebar && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10"
              onClick={close}
              aria-label="Cerrar menú lateral"
              data-test-id="sidebar-overlay"
            />
            <SideBar
              menuItems={menuItems}
              onClose={close}
              logoUrl={logoSrc}
              expandedState={sidebarExpanded}
              onExpandedChange={setSidebarExpanded}
            />
          </>
        )}
        {/* Children se renderizan fuera de TopBar, en el layout */}
      </div>
    </SideBarContext.Provider>
  );
};

export default TopBar;
