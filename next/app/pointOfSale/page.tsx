'use client';

import ProductSearch from './ui/ProductSearch';
import CartPanel from './ui/CartPanel';
import PaymentDialog from './ui/PaymentDialog';

export default function PointOfSalePage() {
    return (
        <div className="flex h-full flex-col gap-6">
            <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <ProductSearch />
                <CartPanel />
            </div>
            <PaymentDialog />
        </div>
    );
}
