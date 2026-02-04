'use client'

import { configureStore } from "@reduxjs/toolkit"
import userSlice from "./features/users/userSlice"

export const store = configureStore({
    reducer: {
        userSlice
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignorar warnings para campos específicos que são convertidos
                ignoredActions: ['user/setUser'],
                ignoredActionPaths: ['payload.dataCadastro', 'payload.ultimoLogin', 'payload.plano.inicio', 'payload.plano.termino'],
                ignoredPaths: ['userSlice.user.dataCadastro', 'userSlice.user.ultimoLogin', 'userSlice.user.plano.inicio', 'userSlice.user.plano.termino'],
            },
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch