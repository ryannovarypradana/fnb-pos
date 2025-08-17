'use client'

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { fetchMenusByStoreId, createAndPayOrder, fetchCategoriesByStoreId, calculateBill } from '@/lib/api';
import { addItem, removeItem, clearOrder, updateQuantity } from '@/redux/slices/orderSlice';
import { Menu, Category, BillResponse } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

export default function PosDashboard() {
    const { data: session } = useSession();
    const dispatch = useDispatch();
    const selectedStoreId = useSelector((state: RootState) => state.auth.selectedStoreId);
    const orderState = useSelector((state: RootState) => state.order);

    const [menus, setMenus] = useState<Menu[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [customerName, setCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [orderMode, setOrderMode] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [cashReceived, setCashReceived] = useState(0);
    const [bill, setBill] = useState<BillResponse | null>(null);

    useEffect(() => {
        async function loadData() {
            if (!selectedStoreId || !session?.accessToken) return;

            try {
                setLoading(true);
                const fetchedCategories = await fetchCategoriesByStoreId(selectedStoreId, session.accessToken);
                const fetchedMenus = await fetchMenusByStoreId(selectedStoreId, session.accessToken);

                setCategories(fetchedCategories);
                setMenus(fetchedMenus);
                if (fetchedCategories.length > 0) {
                    setSelectedCategory(fetchedCategories[0].id);
                }
            } catch (error) {
                console.error("Gagal memuat data:", error);
                toast.error("Gagal memuat data toko.");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [selectedStoreId, session]);

    const filteredMenus = selectedCategory
        ? menus.filter(menu => menu.categoryId === selectedCategory)
        : menus;

    const handleCalculateBill = async () => {
        if (!orderState.items.length) {
            toast.warn("Keranjang kosong.");
            return;
        }

        try {
            const items = orderState.items.map(item => ({ menuId: item.menu.id, quantity: item.quantity }));
            if (selectedStoreId) {
                const calculatedBill = await calculateBill(selectedStoreId, items, session?.accessToken as string);
                setBill(calculatedBill);
            }
        } catch (error: any) {
            toast.error(`Gagal menghitung tagihan: ${error.message}`);
        }
    };

    const handleCreateOrder = async () => {
        if (!orderState.items.length || !selectedStoreId || !session?.accessToken) {
            toast.warn("Keranjang kosong atau toko belum dipilih.");
            return;
        }

        if (orderMode === 'DINE_IN' && !tableNumber) {
            toast.warn("Nomor meja wajib diisi untuk pesanan Dine-In.");
            return;
        }

        if (orderMode === 'TAKEAWAY' && !customerName) {
            toast.warn("Nama pelanggan wajib diisi untuk pesanan Takeaway.");
            return;
        }

        if (paymentMethod === 'CASH' && cashReceived < (bill?.grandTotal || 0)) {
            toast.error("Uang tunai tidak mencukupi.");
            return;
        }

        try {
            const items = orderState.items.map(item => ({ menuId: item.menu.id, quantity: item.quantity }));
            const order = await createAndPayOrder(
                selectedStoreId,
                items,
                customerName,
                tableNumber,
                orderMode,
                paymentMethod,
                cashReceived,
                session.accessToken,
            );
            toast.success(`Pesanan ${order.orderCode} berhasil dibuat!`);
            dispatch(clearOrder());
            setCustomerName('');
            setTableNumber('');
            setBill(null);
            setCashReceived(0);
        } catch (error: any) {
            toast.error(`Gagal membuat pesanan: ${error.message}`);
        }
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    if (loading) {
        return <div className="text-center p-8">Memuat menu...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 p-4 gap-4">
            {/* Kategori Menu */}
            <div className="w-1/5 bg-white rounded-lg shadow-md p-4 overflow-y-auto flex flex-col">
                <h2 className="text-xl font-bold mb-4">Kategori</h2>
                {categories.map(category => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`p-3 rounded-lg mb-2 text-left transition-colors duration-200 ${selectedCategory === category.id
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Daftar Menu */}
            <div className="flex-1 p-4 overflow-y-auto bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Daftar Menu</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredMenus.map(menu => (
                        <div
                            key={menu.id}
                            className="bg-white border rounded-lg shadow-sm cursor-pointer hover:shadow-lg transition-shadow p-4"
                            onClick={() => dispatch(addItem(menu))}>
                            <h3 className="font-semibold text-lg">{menu.name}</h3>
                            <p className="text-sm text-gray-500">{formatRupiah(menu.price)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ringkasan Pesanan & Pembayaran */}
            <div className="w-1/3 bg-white p-4 shadow-lg rounded-lg flex flex-col">
                <h2 className="text-xl font-bold mb-4">Ringkasan Pesanan</h2>

                {/* Info Pelanggan */}
                <div className="mb-4 space-y-2">
                    <div>
                        <label htmlFor="orderMode" className="block text-sm font-medium text-gray-700">Mode Pesanan</label>
                        <div className="mt-1 flex items-center gap-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="orderMode"
                                    value="DINE_IN"
                                    checked={orderMode === 'DINE_IN'}
                                    onChange={() => setOrderMode('DINE_IN')}
                                    className="form-radio text-blue-600"
                                />
                                <span className="ml-2 text-gray-700">Dine-In</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="orderMode"
                                    value="TAKEAWAY"
                                    checked={orderMode === 'TAKEAWAY'}
                                    onChange={() => setOrderMode('TAKEAWAY')}
                                    className="form-radio text-blue-600"
                                />
                                <span className="ml-2 text-gray-700">Takeaway</span>
                            </label>
                        </div>
                    </div>
                    {orderMode === 'TAKEAWAY' && (
                        <div>
                            <label htmlFor="customerName" className="block text-sm text-gray-700">Nama Pelanggan <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="customerName"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="Masukkan nama pelanggan"
                                required
                            />
                        </div>
                    )}
                    {orderMode === 'DINE_IN' && (
                        <div>
                            <label htmlFor="tableNumber" className="block text-sm text-gray-700">Nomor Meja <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="tableNumber"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="Masukkan nomor meja"
                                required
                            />
                        </div>
                    )}
                </div>

                {/* Daftar Item */}
                <div className="flex-1 overflow-y-auto border-t py-4">
                    {orderState.items.length === 0 ? (
                        <p className="text-gray-500 text-center italic">Keranjang kosong</p>
                    ) : (
                        orderState.items.map(item => (
                            <div key={item.menu.id} className="flex justify-between items-center mb-2 p-2 bg-gray-50 rounded-md">
                                <div className="flex-1">
                                    <p className="font-semibold">{item.menu.name}</p>
                                    <p className="text-sm text-gray-500">{formatRupiah(item.menu.price)}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => dispatch(updateQuantity({ menuId: item.menu.id, quantity: item.quantity - 1 }))} className="text-gray-500">-</button>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => dispatch(updateQuantity({ menuId: item.menu.id, quantity: parseInt(e.target.value) || 0 }))}
                                        className="w-12 text-center border rounded-md"
                                        min="0"
                                    />
                                    <button onClick={() => dispatch(updateQuantity({ menuId: item.menu.id, quantity: item.quantity + 1 }))} className="text-gray-500">+</button>
                                    <button onClick={() => dispatch(removeItem(item.menu.id))} className="text-red-500">Hapus</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Ringkasan Tagihan & Pembayaran */}
                <div className="mt-4 border-t pt-4 space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                        <span>Subtotal:</span>
                        <span>{formatRupiah(orderState.subtotal)}</span>
                    </div>

                    {bill && (
                        <div className="border-t mt-4 pt-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Pajak:</span>
                                <span className="text-gray-600">{formatRupiah(bill.taxAmount)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xl text-green-600">
                                <span>Grand Total:</span>
                                <span>{formatRupiah(bill.grandTotal)}</span>
                            </div>

                            <div className="space-y-2 mt-4">
                                <div>
                                    <label htmlFor="paymentMethod" className="block text-sm text-gray-700">Metode Pembayaran</label>
                                    <select
                                        id="paymentMethod"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="DEBIT">DEBIT</option>
                                        <option value="QRIS">QRIS</option>
                                        <option value="EWALLET">EWALLET</option>
                                    </select>
                                </div>
                                {paymentMethod === 'CASH' && (
                                    <div>
                                        <label htmlFor="cashReceived" className="block text-sm text-gray-700">Uang Diterima</label>
                                        <input
                                            type="number"
                                            id="cashReceived"
                                            value={cashReceived}
                                            onChange={(e) => setCashReceived(parseFloat(e.target.value))}
                                            className="w-full px-3 py-2 border rounded-md"
                                            min="0"
                                        />
                                    </div>
                                )}
                                {paymentMethod === 'CASH' && cashReceived > bill.grandTotal && (
                                    <div className="flex justify-between text-lg font-bold text-blue-600">
                                        <span>Kembalian:</span>
                                        <span>{formatRupiah(cashReceived - bill.grandTotal)}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleCreateOrder}
                                className="w-full bg-green-500 text-white py-3 rounded-md text-lg mt-4 hover:bg-green-600 disabled:bg-green-300"
                                disabled={paymentMethod === 'CASH' && cashReceived < bill.grandTotal}
                            >
                                Proses Pembayaran
                            </button>
                        </div>
                    )}

                    {!bill && (
                        <button
                            onClick={handleCalculateBill}
                            className="w-full bg-blue-500 text-white py-3 rounded-md text-lg mt-4 hover:bg-blue-600 disabled:bg-blue-300"
                            disabled={orderState.items.length === 0}
                        >
                            Hitung Tagihan
                        </button>
                    )}

                    <button
                        onClick={() => dispatch(clearOrder())}
                        className="w-full bg-gray-500 text-white py-3 rounded-md text-lg mt-2 hover:bg-gray-600"
                    >
                        Hapus Pesanan
                    </button>
                </div>
            </div>
        </div>
    );
}