import Cookies from 'js-cookie';

const SESSION_COOKIE_NAME = 'jurispolicialSession';
const SESSION_DURATION_DAYS = 7;

export interface SessionData {
    uid: string;
    email: string | null;
    lastLogin: number;
}

export const setSessionCookie = (data: SessionData) => {
    Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(data), {
        expires: SESSION_DURATION_DAYS,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
};

export const getSessionCookie = (): SessionData | null => {
    const cookie = Cookies.get(SESSION_COOKIE_NAME);
    if (!cookie) return null;
    
    try {
        return JSON.parse(cookie);
    } catch {
        return null;
    }
};

export const removeSessionCookie = () => {
    Cookies.remove(SESSION_COOKIE_NAME);
};

export const isSessionValid = (session: SessionData | null): boolean => {
    if (!session) return false;
    
    const now = Date.now();
    const sessionAge = now - session.lastLogin;
    const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000; // days to milliseconds
    
    return sessionAge < maxAge;
};
