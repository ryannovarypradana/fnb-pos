import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { User as CustomUser } from '@/lib/types';
import { jwtDecode } from "jwt-decode";
import { User } from "next-auth";

interface JWTDecoded {
    user_id: string;
    email: string;
    role: string;
    store_id?: string;
    company_id?: string;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const res = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: credentials?.email,
                        password: credentials?.password,
                    }),
                });

                const data = await res.json();

                if (res.ok && data?.token) {
                    const decodedToken = jwtDecode<JWTDecoded>(data.token);

                    const user: User = {
                        id: decodedToken.user_id,
                        email: decodedToken.email,
                        name: decodedToken.email,
                        role: decodedToken.role as CustomUser['role'],
                        storeId: decodedToken.store_id || undefined,
                        companyId: decodedToken.company_id || undefined,
                        accessToken: data.token,
                    };
                    return user as any;
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = {
                    ...token.user,
                    ...user,
                };
                token.accessToken = user.accessToken;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = token.user as CustomUser;
            session.accessToken = token.accessToken as string;
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };