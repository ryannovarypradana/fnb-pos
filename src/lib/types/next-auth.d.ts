import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import { User as CustomUser } from '@/lib/types';

// Perluas tipe Session
declare module "next-auth" {
    interface Session extends DefaultSession {
        user?: CustomUser; // Gunakan tipe kustom kita untuk user
        accessToken?: string;
    }
    // Perluas tipe User
    interface User extends DefaultUser {
        id: string;
        name: string;
        email: string;
        role: 'SUPER_ADMIN' | 'ADMIN' | 'COMPANY_REP' | 'STORE_ADMIN' | 'CASHIER';
        storeId?: string;
        companyId?: string;
        accessToken?: string;
    }
}

// Perluas tipe JWT
declare module "next-auth/jwt" {
    interface JWT {
        user: CustomUser; // Simpan user kustom di sini
        accessToken?: string;
    }
}