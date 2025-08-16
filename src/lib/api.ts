import { OrderItem, Store, Menu } from "./types";

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

export const fetchMenusByStoreId = async (storeId: string, accessToken: string): Promise<Menu[]> => {
    // Menggunakan endpoint baru yang otentik dan spesifik
    return fetcher(`/pos/stores/by-id/${storeId}/menus`, accessToken);
};

export const createAndPayOrder = async (
    storeId: string,
    items: OrderItem[],
    paymentMethod: string,
    cashReceived: number,
    customerName: string,
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
            mode: 'DINE_IN',
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