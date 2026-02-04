// redux/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
    userId: string | null;
    expirationTime: number | null;
}

const initialState: UserState = {
    userId: null,
    expirationTime: null,
};

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        setUserSession: (state, action: PayloadAction<{ userId: string; expirationTime: number }>) => {
            state.userId = action.payload.userId;
            state.expirationTime = action.payload.expirationTime;
        },
        clearUserSession: (state) => {
            state.userId = null;
            state.expirationTime = null;
        },
    },
});

export const { setUserSession, clearUserSession } = sessionSlice.actions;

export default sessionSlice.reducer;
