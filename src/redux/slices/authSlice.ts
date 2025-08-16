import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/lib/types';

interface AuthState {
    user: User | null;
    selectedStoreId: string | null;
}

const initialState: AuthState = {
    user: null,
    selectedStoreId: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User | null>) => {
            state.user = action.payload;
        },
        selectStore: (state, action: PayloadAction<string>) => {
            state.selectedStoreId = action.payload;
        },
        clearAuth: (state) => {
            state.user = null;
            state.selectedStoreId = null;
        },
    },
});

export const { setUser, selectStore, clearAuth } = authSlice.actions;
export default authSlice.reducer;