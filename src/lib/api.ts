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

export const createOrder = async (payload: any, accessToken: string): Promise<any> => {
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
        body: JSON.stringify({ storeId, items }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to calculate bill');
    }
    return res.json();
};

export const createAndPayOrder = async (
    storeId: string,
    items: OrderItem[],
    customerName: string,
    tableNumber: string,
    mode: string,
    paymentMethod: string,
    cashReceived: number,
    accessToken: string,
) => {
    const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            storeId,
            customerName,
            tableNumber,
            mode,
            items,
            paymentMethod,
            cashReceived,
        }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create order');
    }
    return res.json();
};