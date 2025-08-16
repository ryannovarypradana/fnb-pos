'use client'

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { fetchMenusByStoreId, createAndPayOrder } from '@/lib/api';
import { addItem, removeItem, clearOrder, updateQuantity } from '@/redux/slices/orderSlice';
import { Menu } from '@/lib/types';
import { useSession } from 'next-auth/react';

export default function PosDashboard() {
    const { data: session } = useSession();
    const dispatch = useDispatch();
    const selectedStoreId = useSelector((state: RootState) => state.auth.selectedStoreId);
    const orderState = useSelector((state: RootState) => state.order);

    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState(true);
    const [customerName, setCustomerName] = useState(''); // State untuk nama pelanggan

    useEffect(() => {
        async function loadMenus() {
            if (!selectedStoreId || !session?.accessToken) return;

            try {
                setLoading(true);
                // Memanggil endpoint internal yang memerlukan storeId dari sesi dan token
                const fetchedMenus = await fetchMenusByStoreId(selectedStoreId, session.accessToken);
                setMenus(fetchedMenus);
            } catch (error) {
                console.error("Gagal memuat menu:", error);
            } finally {
                setLoading(false);
            }
        }
        loadMenus();
    }, [selectedStoreId, session]);

    const handleCreateOrder = async () => {
        if (!orderState.items.length || !selectedStoreId || !session?.accessToken) {
            alert("Keranjang kosong atau toko belum dipilih.");
            return;
        }
        if (!customerName) {
            alert("Nama pelanggan harus diisi.");
            return;
        }
        try {
            const items = orderState.items.map(item => ({ menuId: item.menu.id, quantity: item.quantity }));
            const order = await createAndPayOrder(selectedStoreId, items, 'CASH', orderState.subtotal, customerName, session.accessToken);
            alert(`Pesanan ${order.orderCode} untuk ${customerName} berhasil dibuat!`);
            dispatch(clearOrder());
            setCustomerName('');
        } catch (error: any) {
            alert(`Gagal membuat pesanan: ${error.message}`);
        }
    };

    if (loading) {
        return <div className="text-center p-8">Memuat menu...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="flex-1 p-4 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Daftar Menu</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {menus.map(menu => (
                        <div key={menu.id} className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg" onClick={() => dispatch(addItem(menu))}>
                            <h3 className="font-semibold">{menu.name}</h3>
                            <p className="text-sm text-gray-500">Rp {menu.price.toLocaleString('id-ID')}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-1/3 bg-white p-4 shadow-lg flex flex-col">
                <h2 className="text-2xl font-bold mb-4">Ringkasan Pesanan</h2>
                <div className="mb-4">
                    <label htmlFor="customerName" className="block text-gray-700 mb-1">Nama Pelanggan</label>
                    <input
                        type="text"
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Masukkan nama pelanggan"
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {orderState.items.map(item => (
                        <div key={item.menu.id} className="flex justify-between items-center mb-2">
                            <div>
                                <p className="font-semibold">{item.menu.name}</p>
                                <p className="text-sm text-gray-500">Rp {item.menu.price.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => dispatch(updateQuantity({ menuId: item.menu.id, quantity: parseInt(e.target.value) || 0 }))}
                                    className="w-16 text-center border rounded-md"
                                />
                                <button onClick={() => dispatch(removeItem(item.menu.id))} className="text-red-500">Hapus</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                        <span>Subtotal:</span>
                        <span>Rp {orderState.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <button
                        onClick={handleCreateOrder}
                        className="w-full bg-green-500 text-white py-3 rounded-md text-lg mt-4 hover:bg-green-600"
                    >
                        Bayar
                    </button>
                </div>
            </div>
        </div>
    );
}