export interface Company {
    id: string;
    name: string;
}

export interface DailyHours {
    open: string;
    close: string;
    isClosed: boolean;
}

export interface OpeningHours {
    monday: DailyHours;
    tuesday: DailyHours;
    wednesday: DailyHours;
    thursday: DailyHours;
    friday: DailyHours;
    saturday: DailyHours;
    sunday: DailyHours;
}

export interface Store {
    id: string;
    code: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    location: string;
    taxPercentage: number;
    companyId: string;
    company: Company;
    operationalHours: OpeningHours;
    latitude: number;
    longitude: number;
    bannerImageUrl: string;
}

export interface Category {
    id: string;
    name: string;
    storeId: string;
}

export interface Menu {
    id: string;
    name: string;
    description: string;
    price: number;
    storeId: string;
    isAvailable: boolean;
    stock: number;
    categoryId: string;
    category: Category;
    imageUrl?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'COMPANY_REP' | 'STORE_ADMIN' | 'CASHIER';
    companyId?: string;
    storeId?: string;
    accessToken?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface OrderItem {
    menuId: string;
    quantity: number;
}

// Antarmuka baru untuk respons kalkulasi tagihan
export interface BillResponse {
    subtotal: number;
    taxAmount: number;
    finalAmount: number;
    roundingAmount: number;
    grandTotal: number;
}