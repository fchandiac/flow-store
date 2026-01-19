import type { PropsWithChildren, ReactNode } from 'react';

interface AccountingShellProps {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    infoNotice?: ReactNode;
}

export default function AccountingShell({
    title,
    description,
    actions,
    infoNotice,
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
                {infoNotice ? (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{infoNotice}</p>
                ) : null}
            </header>
            <section className="flex-1 overflow-auto">
                {children}
            </section>
        </div>
    );
}
