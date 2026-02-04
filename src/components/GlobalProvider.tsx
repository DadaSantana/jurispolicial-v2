'use client'

import { store } from "@/app/redux/store"
import { Provider } from "react-redux"
import AuthProvider from "./AuthProvider"
import { Toaster } from "sonner"

const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <Provider store={store}>
            <AuthProvider>
                {children}
                <Toaster />
            </AuthProvider>
        </Provider>
    )
}

export default GlobalProvider
