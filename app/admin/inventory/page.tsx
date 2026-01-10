import { redirect } from 'next/navigation';

/**
 * Redirige la vista raíz de Inventario al catálogo de productos.
 */
export default function InventoryRootPage() {
	redirect('/admin/inventory/products');
}
