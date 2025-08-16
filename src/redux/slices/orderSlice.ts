import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Menu } from '@/lib/types';

interface OrderItem {
    menu: Menu;
    quantity: number;
}

interface OrderState {
    items: OrderItem[];
    subtotal: number;
}

const initialState: OrderState = {
    items: [],
    subtotal: 0,
};

const orderSlice = createSlice({
    name: 'order',
    initialState,
    reducers: {
        addItem: (state, action: PayloadAction<Menu>) => {
            const existingItem = state.items.find(item => item.menu.id === action.payload.id);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                state.items.push({ menu: action.payload, quantity: 1 });
            }
            state.subtotal = state.items.reduce((total, item) => total + (item.menu.price * item.quantity), 0);
        },
        updateQuantity: (state, action: PayloadAction<{ menuId: string, quantity: number }>) => {
            const itemToUpdate = state.items.find(item => item.menu.id === action.payload.menuId);
            if (itemToUpdate) {
                itemToUpdate.quantity = action.payload.quantity;
            }
            state.subtotal = state.items.reduce((total, item) => total + (item.menu.price * item.quantity), 0);
        },
        removeItem: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(item => item.menu.id !== action.payload);
            state.subtotal = state.items.reduce((total, item) => total + (item.menu.price * item.quantity), 0);
        },
        clearOrder: (state) => {
            state.items = [];
            state.subtotal = 0;
        },
    },
});

export const { addItem, removeItem, clearOrder, updateQuantity } = orderSlice.actions;
export default orderSlice.reducer;