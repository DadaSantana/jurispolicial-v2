'use client'
import { User } from "@/types/user"
import { createSlice } from "@reduxjs/toolkit"

export interface UserSlice {
    user: User
    hasFreeTrialCredits: boolean
}

const initialState: UserSlice = {
    user: {
        uid: "",
        email: null,
        nome: "",
        cpf: "",
        role: "membro",
        creditos: 0,
        dataCadastro: new Date(),
        ultimoLogin: new Date()
    },
    hasFreeTrialCredits: true
}

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action) => {
            const payload = action.payload;
            
            // Função auxiliar para converter Timestamp para Date
            const toDate = (value: any): Date => {
                if (!value) return new Date();
                if (value.toDate && typeof value.toDate === 'function') {
                    return value.toDate();
                }
                if (value instanceof Date) {
                    return value;
                }
                if (typeof value === 'string' || typeof value === 'number') {
                    return new Date(value);
                }
                // Se for objeto vazio ou inválido, retornar Date atual
                if (typeof value === 'object' && Object.keys(value).length === 0) {
                    return new Date();
                }
                return new Date();
            };
            
            // Converter Timestamps do Firebase para Date serializável
            const serializedUser = {
                ...payload,
                dataCadastro: toDate(payload.dataCadastro),
                ultimoLogin: toDate(payload.ultimoLogin),
                plano: payload.plano ? {
                    ...payload.plano,
                    inicio: payload.plano.inicio ? toDate(payload.plano.inicio) : undefined,
                    termino: payload.plano.termino ? toDate(payload.plano.termino) : undefined,
                } : payload.plano
            };
            
            state.user = serializedUser;
            state.hasFreeTrialCredits = payload.freeTrialUsage < 5;
        },
        clearUser: (state) => {
            state.user = initialState.user
            state.hasFreeTrialCredits = true
        }
    }
})

export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer