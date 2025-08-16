'use client'

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectStore } from '@/redux/slices/authSlice';
import { RootState } from '@/redux/store';
import { fetchAllStores } from '@/lib/api';
import { useSession } from 'next-auth/react';
import { Store } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function StoreSelector() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const dispatch = useDispatch();
    const { data: session } = useSession();
    const user = useSelector((state: RootState) => state.auth.user);
    const router = useRouter();

    useEffect(() => {
        async function loadStores() {
            if (!user) return;

            try {
                setLoading(true);
                const allStores = await fetchAllStores();

                if (user.role === 'COMPANY_REP') {
                    const companyStores = allStores.filter((store: Store) => store.companyId === user.companyId);
                    setStores(companyStores);
                } else if (user.role === 'SUPER_ADMIN') {
                    setStores(allStores);
                }
            } catch (error) {
                console.error("Gagal memuat daftar toko:", error);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        }

        loadStores();
    }, [user, session, router]);

    if (loading) {
        return <div className="text-center p-8">Memuat daftar toko...</div>;
    }

    return (
        <div className="flex flex-col items-center p-8 bg-gray-50 min-h-screen">
            <h2 className="text-2xl font-bold mb-6">Pilih Toko untuk Mengelola</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
                {stores.map(store => (
                    <div
                        key={store.id}
                        onClick={() => dispatch(selectStore(store.id))}
                        className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    >
                        <h3 className="text-xl font-semibold">{store.name}</h3>
                        <p className="text-gray-600">Kode: {store.code}</p>
                        <p className="text-gray-500 text-sm">{store.location}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}