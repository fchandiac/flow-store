import type { PropsWithChildren } from 'react';
import Tabs, { type TabItem } from '@/app/baseComponents/Tabs/Tabs';

const tabs: TabItem[] = [
    { href: '/admin/purchasing/receptions', label: 'Listado', exact: true },
    { href: '/admin/purchasing/receptions/new', label: 'Nueva recepción' },
];

export default function ReceptionsLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex h-full flex-col">
            <header className="bg-white">
                <div className="pt-6 pb-4 space-y-2">
                    <h1 className="text-2xl font-bold">Recepciones</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona las recepciones de mercadería y registra nuevas entradas desde órdenes de compra o directas.
                    </p>
                </div>
                <Tabs items={tabs} basePath="/admin/purchasing/receptions" />
            </header>
            <section className="flex-1 overflow-auto">{children}</section>
        </div>
    );
}
