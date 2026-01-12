'use client';

import { Button } from "@/app/baseComponents/Button/Button";
import { useRouter } from "next/navigation";

/**
 * Pagos a Proveedores
 * Ruta: /admin/purchasing/supplier-payments
 * Vista placeholder para administrar programación y seguimiento de pagos.
 */
export default function SupplierPaymentsPage() {
    const router = useRouter();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Pagos a proveedores</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Registra compromisos de pago, concilia facturas pendientes y controla el estado de los desembolsos
                    a tus proveedores.
                </p>
            </div>

            <section className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center space-y-4">
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    Esta vista aún no cuenta con un flujo operativo. Utiliza el botón inferior para regresar al listado de
                    proveedores mientras habilitamos la conciliación de pagos.
                </p>
                <div>
                    <Button
                        variant="outlined"
                        data-test-id="supplier-payments-back-to-suppliers"
                        onClick={() => router.push("/admin/purchasing/suppliers")}
                    >
                        Ir a proveedores
                    </Button>
                </div>
            </section>
        </div>
    );
}
