'use client';

import { useRouter } from 'next/navigation';
import NewReceptionPage from '../ui/NewReceptionPage';

export default function NewReceptionRoute() {
    const router = useRouter();

    return <NewReceptionPage onSuccess={() => router.push('/admin/purchasing/receptions')} />;
}
