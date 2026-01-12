import { redirect } from "next/navigation";

/**
 * Redirige la vista raíz de Compras hacia el listado de órdenes.
 */
export default function PurchasingRootPage() {
    redirect("/admin/purchasing/purchase-orders");
}
