import { OrderItem, Store, Menu, Category, BillResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_GO_API_URL;

export const fetcher = async (url: string, token?: string) => {
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_URL}${url}`, { headers });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch data');
    }
    return res.json();
};

export const fetchAllStores = async (): Promise<Store[]> => {
    return fetcher('/public/stores');
};

export const fetchMenusByStoreId = async (storeId: string, accessToken: string): Promise<{ menus: Menu[] }> => {
    return fetcher(`/api/v1/pos/stores/by-id/${storeId}/menus`, accessToken);
};



export const confirmPayment = async (payload: any, accessToken: string): Promise<any> => {
    const res = await fetch(`${API_URL}/api/v1/orders/confirm-payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to confirm payment');
    }
    return res.json();
};

// Fungsi diperbarui untuk menggunakan endpoint `/pos/stores/by-id/:id/categories`
export const fetchCategoriesByStoreId = async (storeId: string, accessToken: string): Promise<Category[]> => {
    return fetcher(`/api/v1/pos/stores/by-id/${storeId}/categories`, accessToken);
};

export const calculateBill = async (storeId: string, items: OrderItem[], accessToken: string): Promise<BillResponse> => {
    const res = await fetch(`${API_URL}/api/v1/orders/calculate-bill`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        // Map menuId -> product_id for backend
        body: JSON.stringify({
            store_id: storeId,
            items: items.map(item => ({
                product_id: item.menuId,
                quantity: item.quantity
            }))
        }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to calculate bill');
    }
    return res.json();
};

// Helper to create order
export const createOrder = async (
    storeId: string,
    items: OrderItem[],
    userId: string, // Changed from implicit to explicit user_id if needed, or rely on token? Doc says user_id is in body.
    tableNumber: string | undefined,
    accessToken: string
): Promise<any> => {
    const payload = {
        store_id: storeId,
        user_id: userId,
        table_number: tableNumber,
        items: items.map(item => ({
            product_id: item.menuId,
            quantity: item.quantity
        }))
    };

    const res = await fetch(`${API_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create order');
    }
    return res.json();
};

export const createAndPayOrder = async (
    storeId: string,
    items: OrderItem[],
    customerName: string, // Not used in CREATE ORDER per doc but maybe for local?
    tableNumber: string,
    mode: string, // 'DINE_IN' etc? Not in doc, doc has table_number.
    paymentMethod: string,
    cashReceived: number, // Not used in CREATE, but in payment flow? Doc has separate payment confirmation.
    accessToken: string,
    userId: string // Need userId
) => {
    // 1. Create Order
    const order = await createOrder(storeId, items, userId, tableNumber, accessToken);

    // 2. Confirm Payment
    const paymentPayload = {
        order_code: order.order_code,
        payment_method: paymentMethod
    };

    return confirmPayment(paymentPayload, accessToken);
};