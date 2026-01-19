"use client";

import { useMemo, useState } from "react";
import IconButton from "@/baseComponents/IconButton/IconButton";
import Dialog from "@/baseComponents/Dialog/Dialog";
import type { AccountingAccountNode } from "@/actions/accounting";
import { ACCOUNTING_CURRENCY_FORMAT } from "@/lib/accounting/format";

const depthClasses = ["pl-2", "pl-6", "pl-10", "pl-14", "pl-18", "pl-22"] as const;

type AccountsTreeClientProps = {
    hierarchy: AccountingAccountNode[];
    baseDepth?: number;
};

interface AccountDictionaryEntry {
    title: string;
    description: string;
}

const ACCOUNT_DICTIONARY: Record<string, AccountDictionaryEntry> = {
    "1": {
        title: "Activos",
        description: "Lo que el negocio tiene. Incluye dinero disponible y recursos que pueden convertirse en efectivo."
    },
    "1.1.01": {
        title: "Caja General",
        description: "Dinero en efectivo físico disponible en la tienda (billetes y monedas). Aumenta con ventas en efectivo y disminuye con depósitos al banco o pagos menores."
    },
    "1.1.02": {
        title: "Bancos",
        description: "Dinero disponible en las cuentas corrientes bancarias. Aumenta con depósitos y ventas con tarjeta; disminuye con transferencias a proveedores o pagos de servicios."
    },
    "1.1.04": {
        title: "Existencias (Inventario)",
        description: "Valor de los productos almacenados en estantería o bodega listos para vender."
    },
    "1.1.05": {
        title: "IVA Crédito Fiscal",
        description: "IVA pagado al comprar mercadería. Funciona como un saldo a favor que descuenta el IVA que debes pagar por las ventas."
    },
    "2": {
        title: "Pasivos",
        description: "Lo que el negocio debe. Incluye compromisos financieros y obligaciones con terceros."
    },
    "2.1.01": {
        title: "Proveedores",
        description: "Deudas pendientes con empresas que suministran mercadería. Indica cuánto dinero debes pagar a futuro."
    },
    "2.1.02": {
        title: "IVA Débito Fiscal",
        description: "IVA recaudado de los clientes en cada venta. No es dinero propio, pertenece al Estado y se declara mensualmente."
    },
    "2.1.03": {
        title: "Retenciones",
        description: "Impuestos retenidos (como boletas de honorarios) que la empresa debe declarar y pagar al fisco en nombre de terceros."
    },
    "3": {
        title: "Patrimonio",
        description: "Valor real del dueño dentro de la empresa. Representa aportes y resultados acumulados."
    },
    "3.1.01": {
        title: "Capital Pagado",
        description: "Monto inicial de dinero o bienes con el que se inició el negocio."
    },
    "3.1.02": {
        title: "Utilidades Acumuladas",
        description: "Ganancias de períodos anteriores que permanecen en la empresa para reinversión o ahorro."
    },
    "4": {
        title: "Ingresos",
        description: "Lo que el negocio gana. Registra entradas de dinero por ventas y otros conceptos."
    },
    "4.1.01": {
        title: "Ventas de Mercaderías",
        description: "Valor neto de los productos vendidos. Es la principal fuente de ingresos de la tienda."
    },
    "4.2.02": {
        title: "Ganancia por Ajustes",
        description: "Ingresos extraordinarios generados, por ejemplo, cuando sobra dinero en un arqueo de caja o aparece inventario adicional."
    },
    "5": {
        title: "Egresos / Gastos",
        description: "Lo que el negocio consume. Incluye costos y gastos necesarios para operar."
    },
    "5.1.01": {
        title: "Costo de Ventas (CMV)",
        description: "Costo de adquisición de los productos que ya fueron vendidos. Permite calcular el margen de ganancia real."
    },
    "5.1.02": {
        title: "Pérdida por Ajustes",
        description: "Gastos derivados de mermas, productos vencidos o robos detectados en el inventario."
    },
    "5.2.03": {
        title: "Gastos Generales",
        description: "Costos operativos necesarios para que la tienda funcione (luz, agua, limpieza, internet, entre otros)."
    }
};

function resolveAccountInfo(code: string): AccountDictionaryEntry | null {
    const parts = code.split('.')
        .map((segment) => segment.trim())
        .filter(Boolean);

    for (let i = parts.length; i > 0; i -= 1) {
        const candidate = parts.slice(0, i).join('.');
        if (ACCOUNT_DICTIONARY[candidate]) {
            return ACCOUNT_DICTIONARY[candidate];
        }
    }

    return null;
}

function AccountRow({
    node,
    depth,
    onInfoClick,
    hasChildren,
    isExpanded,
    onToggleExpand,
}: {
    node: AccountingAccountNode;
    depth: number;
    onInfoClick: (account: AccountingAccountNode) => void;
    hasChildren: boolean;
    isExpanded: boolean;
    onToggleExpand: (() => void) | null;
}) {
    const paddingClass = depthClasses[Math.min(depth, depthClasses.length - 1)];

    return (
        <div className={`grid grid-cols-[minmax(0,1fr)_minmax(0,160px)] items-center px-4 py-2 text-sm text-gray-800 ${paddingClass}`}>
            <span className="flex items-center gap-2">
                {hasChildren ? (
                    <IconButton
                        icon={isExpanded ? "expand_less" : "chevron_right"}
                        variant="ghost"
                        size="xs"
                        ariaLabel={`${isExpanded ? "Contraer" : "Expandir"} ${node.name}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleExpand?.();
                        }}
                        className="-ml-1"
                    />
                ) : (
                    <span className="w-5" aria-hidden />
                )}
                <IconButton
                    icon="info"
                    variant="ghost"
                    size="xs"
                    ariaLabel={`Ver detalle de la cuenta ${node.code}`}
                    onClick={() => onInfoClick(node)}
                />
                <span className="font-mono text-xs text-muted-foreground">{node.code}</span>
                <span>{node.name}</span>
            </span>
            <span className="text-right font-semibold text-slate-700">
                {ACCOUNTING_CURRENCY_FORMAT.format(node.balance)}
            </span>
        </div>
    );
}

function AccountInfoDialog({
    account,
    onClose,
}: {
    account: AccountingAccountNode | null;
    onClose: () => void;
}) {
    const info = account ? resolveAccountInfo(account.code) : null;

    return (
        <Dialog
            open={Boolean(account)}
            onClose={onClose}
            title={account ? info?.title ?? `Cuenta ${account.code}` : undefined}
            size="sm"
            showCloseButton
            closeButtonText="Cerrar"
        >
            {account ? (
                <div className="space-y-4 text-sm leading-6 text-slate-700">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Código {account.code}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">{account.name}</p>
                        <p className="mt-2 text-slate-700">{info?.description ?? 'No hay información disponible para esta cuenta aún.'}</p>
                    </div>
                </div>
            ) : null}
        </Dialog>
    );
}

export default function AccountsTreeClient({ hierarchy, baseDepth = 0 }: AccountsTreeClientProps) {
    const [selectedAccount, setSelectedAccount] = useState<AccountingAccountNode | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const rows = useMemo(() => {
        const renderQueue: Array<{ node: AccountingAccountNode; depth: number }> = [];

        const traverse = (nodes: AccountingAccountNode[], depth: number) => {
            for (const node of nodes) {
                renderQueue.push({ node, depth });
                const hasChildren = node.children.length > 0;
                if (hasChildren && expandedNodes.has(node.id)) {
                    traverse(node.children, depth + 1);
                }
            }
        };

        traverse(hierarchy, baseDepth);
        return renderQueue;
    }, [hierarchy, baseDepth, expandedNodes]);

    return (
        <div className="flex flex-col rounded-lg border border-border/40">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,160px)] border-b border-border/40 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <span>Cuenta</span>
                <span className="text-right">Saldo CLP</span>
            </div>
            <div className="divide-y divide-border/20">
                {rows.map(({ node, depth }) => {
                    const hasChildren = node.children.length > 0;
                    const isExpanded = hasChildren && expandedNodes.has(node.id);
                    return (
                        <AccountRow
                            key={node.id}
                            node={node}
                            depth={depth}
                            hasChildren={hasChildren}
                            isExpanded={isExpanded}
                            onToggleExpand={hasChildren ? () => toggleExpand(node.id) : null}
                            onInfoClick={setSelectedAccount}
                        />
                    );
                })}
            </div>
                <div className="px-4 py-2" />
            <AccountInfoDialog account={selectedAccount} onClose={() => setSelectedAccount(null)} />
        </div>
    );
}
