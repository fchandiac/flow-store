import type { PropsWithChildren, ReactNode } from 'react';

interface AccountingShellProps {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}

export default function AccountingShell({
    title,
    description,
    actions,
    children,
}: PropsWithChildren<AccountingShellProps>) {
    return (
        <div className="flex h-full flex-col gap-6">
            <header className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
                        {description ? (
                            <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>
                        ) : null}
                    </div>
                    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Vista de solo lectura. Los saldos se calculan en línea según la operación.
                </p>
            </header>
            <section className="flex-1 overflow-auto rounded-xl border border-border/40 bg-white p-6 shadow-sm">
                {children}
            </section>
        </div>
    );
}
