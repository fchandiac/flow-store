import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Logo removed from sidebar per request
import { Button } from '../Button/Button';
import { logout, getCurrentSession } from '@/app/actions/auth.server';

export interface SideBarMenuItem {
  id?: string;
  label: string;
  url?: string;
  children?: SideBarMenuItem[];
}

interface SideBarProps {
  menuItems: SideBarMenuItem[];
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
  logoUrl?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  inspector: 'Inspector',
  director: 'Director',
};

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'FlowStore';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
const APP_RELEASE = process.env.NEXT_PUBLIC_APP_RELEASE || '21-Diciembre-2025';

const SideBar: React.FC<SideBarProps> = ({ menuItems, className, style, onClose, logoUrl }) => {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  // Cargar sesión al montar el componente
  useEffect(() => {
    const loadSession = async () => {
      const currentSession = await getCurrentSession();
      setSession(currentSession);
    };
    loadSession();
  }, []);

  // Track which parent items are open using their id or label
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigate = (url?: string) => {
    if (!url) return;
    // Close sidebar BEFORE navigating for faster perceived response
    if (typeof onClose === 'function') onClose();
    // Use window.location for full page reload to show loading.tsx
    window.location.href = url;
  };

  const renderMenuItem = (item: SideBarMenuItem, idx: number) => {
    const id = item.id ?? `${item.label}-${idx}`;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    if (hasChildren) {
      const isOpen = !!openIds[id];
      return (
        <li key={id}>
          <button
            className="block px-4 py-2 rounded-lg text-gray-900 hover:bg-secondary/20 hover:shadow-md hover:text-secondary transition-all duration-200 font-medium w-full flex justify-between items-center text-sm"
            onClick={() => toggleOpen(id)}
            aria-expanded={isOpen}
            data-test-id={`side-bar-parent-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span>{item.label}</span>
            <svg
              className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <ul className={`pl-6 space-y-1 mt-1 ${isOpen ? '' : 'hidden'}`}>
            {item.children!.map((child, cIdx) => (
              <li key={(child.id ?? `${child.label}-${cIdx}`)}>
                <button
                  className="w-full text-left px-4 py-2 rounded hover:bg-secondary/20 hover:shadow-sm hover:text-secondary transition-all duration-200 font-medium cursor-pointer text-sm"
                  onClick={() => handleNavigate(child.url)}
                  data-test-id={`side-bar-child-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {child.label}
                </button>
              </li>
            ))}
          </ul>
        </li>
      );
    }

    return (
      <li key={id}>
        <button
          className="w-full text-left px-4 py-2 rounded hover:bg-secondary/20 hover:shadow-sm hover:text-secondary transition-all duration-200 font-medium cursor-pointer text-sm"
          onClick={() => handleNavigate(item.url)}
          data-test-id={`side-bar-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {item.label}
        </button>
      </li>
    );
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-50 w-64 h-full bg-white/60 backdrop-blur backdrop-saturate-150 text-black flex flex-col items-center py-6 shadow-xl border border-white/20 ${className ? className : ''}`}
      style={style}
      data-test-id="side-bar-root"
    >
      <div className="mb-6 text-center">
        {logoUrl ? (
          <div className="">
            {(!logoLoaded || logoError) && (
              <div className="h-20 w-20 bg-neutral-300 rounded-lg flex items-center justify-center mx-auto mb-2" data-test-id="side-bar-logo-skeleton">
                {logoError && (
                  <span className="material-symbols-outlined text-neutral-400" style={{ fontSize: 32 }}>
                    image_not_supported
                  </span>
                )}
              </div>
            )}
            {!logoError && (
              <img
                src={logoUrl}
                alt={`${APP_NAME} Logo`}
                className={`h-20 w-auto mx-auto object-contain transition-opacity duration-300 ${!logoLoaded ? 'opacity-0 absolute' : 'opacity-100'}`}
                data-test-id="side-bar-logo"
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoError(true)}
              />
            )}
          </div>
        ) : null}
        {/* <div className="text-xl font-bold" data-test-id="side-bar-app-name">{APP_NAME}</div> */}
        {/* <div className="text-sm opacity-70" data-test-id="side-bar-app-version">{'1.2.12'}</div> */}
        <div className="text-lg font-bold text-gray-800" data-test-id="side-bar-app-name">{APP_NAME}</div>
        <div className="text-sm text-gray-600" data-test-id="side-bar-app-version">v{APP_VERSION}</div>
        <div className="text-xs text-gray-500" data-test-id="side-bar-app-release">Release: {APP_RELEASE}</div>
      </div>

      {session && (() => {
        const u = session as { userName?: string; rol?: string };
        return (
          <div className="w-full px-6 mb-6">
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 gap-3" style={{ background: 'transparent', borderWidth: '0.3px' }}>
              <span className="material-symbols-outlined text-black text-3xl">person</span>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold truncate">{u.userName}</span>
                <span className="text-xs opacity-60 capitalize truncate">{ROLE_LABELS[u.rol as keyof typeof ROLE_LABELS] || u.rol}</span>
              </div>
            </div>
          </div>
        );
      })()}

      <nav className="w-full px-4 flex-1 mt-2 overflow-y-auto">
        <ul className="flex flex-col gap-2 w-full">
          {menuItems.map((item, idx) => renderMenuItem(item, idx))}
        </ul>
      </nav>

      <div className="w-full mt-auto px-6 pb-2">
        <Button
          variant="outlined"
          className="w-full"
          onClick={async () => {
            await logout();
            // Limpiar localStorage para evitar restauración automática de sesión
            localStorage.removeItem('flow_session');
            window.location.href = '/';
          }}
          data-test-id="side-bar-logout-btn"
        >
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
};

export default SideBar;
