'use client'

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { fetchMenusByStoreId, createOrder, confirmPayment, fetchCategoriesByStoreId, calculateBill } from '@/lib/api';
import { addItem, removeItem, clearOrder, updateQuantity } from '@/redux/slices/orderSlice';
import { Menu, Category, BillResponse, Order } from '@/lib/types';
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
    const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

    useEffect(() => {
        async function loadData() {
            if (!selectedStoreId || !session?.accessToken) return;

            try {
                setLoading(true);
                const fetchedCategories = await fetchCategoriesByStoreId(selectedStoreId, session.accessToken);
                const fetchedMenuResponse = await fetchMenusByStoreId(selectedStoreId, session.accessToken);

                setCategories(fetchedCategories);
                // Handle new response structure { menus: [], ... }
                setMenus(fetchedMenuResponse.menus || []);
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
            setBill(null);
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

    // Recalculate bill whenever items change
    useEffect(() => {
        if (orderState.items.length > 0) {
            const debounce = setTimeout(() => {
                handleCalculateBill();
            }, 500);
            return () => clearTimeout(debounce);
        } else {
            setBill(null);
        }
    }, [orderState.items, selectedStoreId]);

    const handlePlaceOrder = async () => {
        if (!orderState.items.length || !selectedStoreId || !session?.accessToken || !session?.user) {
            toast.warn("Keranjang kosong, toko belum dipilih, atau sesi habis.");
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

        try {
            const items = orderState.items.map(item => ({ menuId: item.menu.id, quantity: item.quantity }));
            const order = await createOrder(
                {
                    store_id: selectedStoreId,
                    user_id: session.user.id,
                    table_number: tableNumber || undefined,
                    items: items,
                },
                session.accessToken
            );
            setCreatedOrder(order);
            toast.success(`Order ${order.order_code} dibuat. Silakan lanjut ke pembayaran.`);
        } catch (error: any) {
            toast.error(`Gagal membuat pesanan: ${error.message}`);
        }
    };

    const handleConfirmPayment = async () => {
        if (!createdOrder || !session?.accessToken) return;

        if (paymentMethod === 'CASH' && cashReceived < (bill?.grandTotal || 0)) {
            toast.error("Uang tunai tidak mencukupi.");
            return;
        }

        try {
            setIsPaymentProcessing(true);
            await confirmPayment(
                {
                    order_code: createdOrder.order_code,
                    payment_method: paymentMethod,
                },
                session.accessToken
            );
            toast.success("Pembayaran berhasil dikonfirmasi!");

            // Reset Flow
            dispatch(clearOrder());
            setCustomerName('');
            setTableNumber('');
            setBill(null);
            setCreatedOrder(null);
            setCashReceived(0);
        } catch (error: any) {
            toast.error(`Gagal konfirmasi pembayaran: ${error.message}`);
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-xl font-semibold text-gray-600">Memuat menu...</div>;
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-100 p-4 gap-4 overflow-hidden">
            {/* Kategori Menu - Desktop: Left, Mobile: Top (Horizontal Scroll) */}
            <div className="w-full lg:w-1/5 bg-white rounded-lg shadow-md p-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto">
                <h2 className="hidden lg:block text-xl font-bold mb-4">Kategori</h2>
                {categories.map(category => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`p-3 rounded-lg text-sm lg:text-base whitespace-nowrap lg:whitespace-normal transition-colors duration-200 text-left ${selectedCategory === category.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Daftar Menu */}
            <div className="flex-1 p-4 overflow-y-auto bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Daftar Menu</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMenus.map(menu => (
                        <div
                            key={menu.id}
                            className="bg-white border hover:border-blue-500 rounded-lg shadow-sm cursor-pointer hover:shadow-lg transition-all p-4 flex flex-col justify-between h-full"
                            onClick={() => dispatch(addItem(menu))}>
                            <div>
                                {menu.imageUrl && (
                                    <div className="w-full h-32 bg-gray-200 rounded-md mb-2 overflow-hidden">
                                        <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h3 className="font-semibold text-sm lg:text-base mb-1">{menu.name}</h3>
                                {/* <p className="text-xs text-gray-500 mb-2 line-clamp-2">{menu.description}</p> */}
                            </div>
                            <p className="font-bold text-blue-600">{formatRupiah(menu.price)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ringkasan Pesanan & Pembayaran */}
            <div className="w-full lg:w-1/3 bg-white p-4 shadow-lg rounded-lg flex flex-col h-1/2 lg:h-full">
                <h2 className="text-xl font-bold mb-4">
                    {createdOrder ? `Pembayaran: ${createdOrder.order_code}` : 'Order Baru'}
                </h2>

                {/* Input Fields - Only when not yet created order */}
                {!createdOrder && (
                    <div className="mb-4 space-y-3">
                        <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
                            <button
                                className={`flex-1 py-1 rounded-md text-sm font-medium transition-all ${orderMode === 'DINE_IN' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setOrderMode('DINE_IN')}
                            >
                                Dine-In
                            </button>
                            <button
                                className={`flex-1 py-1 rounded-md text-sm font-medium transition-all ${orderMode === 'TAKEAWAY' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                onClick={() => setOrderMode('TAKEAWAY')}
                            >
                                Takeaway
                            </button>
                        </div>

                        {orderMode === 'TAKEAWAY' ? (
                            <div>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nama Pelanggan *"
                                />
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    value={tableNumber}
                                    onChange={(e) => setTableNumber(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nomor Meja *"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Shopping Cart List */}
                <div className="flex-1 overflow-y-auto border-t border-b py-2 space-y-2">
                    {orderState.items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <p>Keranjang kosong</p>
                        </div>
                    ) : (
                        orderState.items.map(item => (
                            <div key={item.menu.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{item.menu.name}</p>
                                    <p className="text-xs text-gray-500">{formatRupiah(item.menu.price)} x {item.quantity}</p>
                                </div>
                                {!createdOrder && (
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => dispatch(updateQuantity({ menuId: item.menu.id, quantity: item.quantity - 1 }))} className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300">-</button>
                                        <span className="w-4 text-center text-sm">{item.quantity}</span>
                                        <button onClick={() => dispatch(updateQuantity({ menuId: item.menu.id, quantity: item.quantity + 1 }))} className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300">+</button>
                                    </div>
                                )}
                                <div className="font-semibold text-sm ml-2">
                                    {formatRupiah(item.menu.price * item.quantity)}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-2 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatRupiah(bill?.subtotal || orderState.subtotal)}</span>
                    </div>
                    {bill && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Pajak (10%)</span>
                                <span>{formatRupiah(bill.taxAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold text-blue-700">
                                <span>Total</span>
                                <span>{formatRupiah(bill.grandTotal)}</span>
                            </div>
                        </>
                    )}

                    {!createdOrder ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => dispatch(clearOrder())}
                                className="px-4 py-3 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                onClick={handlePlaceOrder}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-semibold shadow-lg transition-transform active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                disabled={orderState.items.length === 0 || !bill}
                            >
                                Buat Pesanan
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-fade-in-up">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                >
                                    <option value="CASH">Tunai (Cash)</option>
                                    <option value="QRIS">QRIS</option>
                                    <option value="DEBIT">Debit Card</option>
                                </select>
                            </div>

                            {paymentMethod === 'CASH' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Uang Diterima</label>
                                    <input
                                        type="number"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="0"
                                    />
                                    {cashReceived > (bill?.grandTotal || 0) && (
                                        <div className="mt-2 flex justify-between text-green-600 font-bold">
                                            <span>Kembalian:</span>
                                            <span>{formatRupiah(cashReceived - (bill?.grandTotal || 0))}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCreatedOrder(null)}
                                    className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
                                >
                                    Batal Bayar
                                </button>
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={isPaymentProcessing || (paymentMethod === 'CASH' && cashReceived < (bill?.grandTotal || 0))}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-md hover:bg-green-700 font-bold shadow-lg disabled:bg-gray-400"
                                >
                                    {isPaymentProcessing ? 'Memproses...' : 'Konfirmasi Bayar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Add simple animation styles if needed or use existing tailwind