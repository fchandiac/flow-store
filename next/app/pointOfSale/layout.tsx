'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import TopBar from '@/baseComponents/TopBar/TopBar';
import type { SideBarMenuItem } from '@/baseComponents/TopBar/SideBar';
import { PointOfSaleProvider, usePointOfSale } from './context/PointOfSaleContext';

/**
 * Layout Punto de Venta con panel dividido: buscador y carrito.
 * Se reutiliza TopBar para conservar la experiencia del panel administrativo.
 */

const menuItems: SideBarMenuItem[] = [
    {
        id: 'pos-home',
        label: 'Venta en curso',
        url: '/pointOfSale',
    },
    {
        id: 'admin-back',
        label: 'Ir a Admin',
        url: '/admin',
    },
    {
        id: 'logout',
        label: 'Cerrar sesión',
        url: '/',
    },
];

function PointOfSaleHeader() {
    const {
        branchName,
        storageName,
        selectedPriceListId,
        priceLists,
        isLoading,
        isFetching,
    } = usePointOfSale();

    const selectedPriceList = priceLists.find((list) => list.id === selectedPriceListId);
    const isBusy = isLoading || isFetching;

    return (
        <section className="border-b bg-white px-6 py-3">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-semibold text-gray-900">Punto de Venta</h1>
                    <span className="text-sm text-muted-foreground">
                        Gestiona las ventas en sucursal desde un solo lugar.
                    </span>
                    {isBusy && (
                        <span className="material-symbols-outlined animate-spin text-base text-muted-foreground">
                            progress_activity
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Sucursal:</span>
                        <span data-test-id="pos-header-branch">{branchName ?? 'Determinando…'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Almacén:</span>
                        <span data-test-id="pos-header-storage">{storageName ?? 'No asignado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Lista de precios:</span>
                        <span data-test-id="pos-header-price-list">{selectedPriceList?.name ?? 'Sin lista'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link className="text-blue-600 hover:underline" href="/admin">
                            Admin
                        </Link>
                        <Link className="text-red-600 hover:underline" href="/">
                            Salir
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

type CustomerDisplayHandle = {
    close: () => void;
    closed?: boolean;
};

export default function PointOfSaleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const fallbackWindowRef = useRef<CustomerDisplayHandle | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const openDisplayWindow = async () => {
            try {
                if (window.electronAPI?.openCustomerDisplay) {
                    await window.electronAPI.openCustomerDisplay();
                    return;
                }

                const targetUrl = `${window.location.origin}/customerDisplay`;
                const popup = window.open(
                    targetUrl,
                    'FlowStoreCustomerDisplay',
                    'width=1280,height=800,noopener,noreferrer'
                );
                if (popup) {
                    fallbackWindowRef.current = popup as unknown as CustomerDisplayHandle;
                }
            } catch (error) {
                console.warn('[PointOfSaleLayout] No fue posible abrir la pantalla de cliente:', error);
            }
        };

        void openDisplayWindow();

        return () => {
            if (!window.electronAPI?.openCustomerDisplay) {
                const popup = fallbackWindowRef.current;
                if (popup && typeof popup.close === 'function' && !popup.closed) {
                    popup.close();
                }
            }
            fallbackWindowRef.current = null;
        };
    }, []);

    return (
        <PointOfSaleProvider>
            <div className="min-h-screen bg-white">
                <TopBar
                    title="FlowStore POS"
                    logoSrc="/logo.png"
                    menuItems={menuItems}
                    showUserButton
                />

                <main className="flex min-h-screen flex-col pt-16">
                    <PointOfSaleHeader />
                    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-8 pt-6">
                        {children}
                    </div>
                </main>
            </div>
        </PointOfSaleProvider>
    );
}
