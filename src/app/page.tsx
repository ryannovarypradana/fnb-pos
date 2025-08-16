'use client'

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { selectStore, setUser } from '@/redux/slices/authSlice';
import StoreSelector from './components/StoreSelector';
import PosDashboard from './components/PosDashboard';

import { User } from '@/lib/types';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useDispatch();
  const selectedStoreId = useSelector((state: RootState) => state.auth.selectedStoreId);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (session) {
      dispatch(setUser(session.user as User));

      // Jika pengguna adalah Store Admin atau Kasir, langsung set storeId mereka
      if ((session.user?.role === 'STORE_ADMIN' || session.user?.role === 'CASHIER') && session.user.storeId) {
        dispatch(selectStore(session.user.storeId));
      }
    }
  }, [session, status, router, dispatch]);

  if (status === 'loading') {
    return <div className="text-center mt-10">Memuat sesi...</div>;
  }

  const user = session?.user;
  const isMultiStoreUser = user?.role === 'COMPANY_REP' || user?.role === 'SUPER_ADMIN';

  if (isMultiStoreUser) {
    if (selectedStoreId) {
      return <PosDashboard />;
    } else {
      return <StoreSelector />;
    }
  }

  if (selectedStoreId && (user?.role === 'STORE_ADMIN' || user?.role === 'CASHIER')) {
    return <PosDashboard />;
  }

  return <div>Silakan login untuk mengakses halaman ini.</div>;
}