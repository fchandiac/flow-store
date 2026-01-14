'use client';

import { Button } from "@/app/baseComponents/Button/Button";
import { useRouter } from "next/navigation";
import SupplierPaymentsDataGrid from "./ui/SupplierPaymentsDataGrid";

/**
 * Pagos a Proveedores
 * Ruta: /admin/purchasing/supplier-payments
 * Vista placeholder para administrar programación y seguimiento de pagos.
 */
export default function SupplierPaymentsPage() {
    const router = useRouter();

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Pagos a proveedores</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Visualiza obligaciones pendientes, monitorea sus vencimientos y sincroniza el estado de pago
                        con tus recepciones.
                    </p>
                </div>
                <Button
                    variant="outlined"
                    data-test-id="supplier-payments-back-to-suppliers"
                    onClick={() => router.push("/admin/purchasing/suppliers")}
                >
                    Ir a proveedores
                </Button>
            </div>

            <SupplierPaymentsDataGrid />
        </div>
    );
}
