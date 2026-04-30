import { create } from 'zustand';
import { disconnectSocket } from '../ws/socket';
import { api } from '../api/client';

export type UserRole = 'CLIENT' | 'COURIER' | 'DISPATCHER';

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
};

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem('authUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('authUser');
  }
}

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('accessToken'),
  user: loadUser(),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
    set({ token });
  },

  setUser: (user) => {
    saveUser(user);
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authUser');
    disconnectSocket();
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) {
      set({ user: null });
      saveUser(null);
      return;
    }
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      saveUser(data);
      set({ user: data });
    } catch (err: any) {
      // Стираем сессию только если токен невалиден (401/403),
      // но не при сетевых ошибках — чтобы сессия выживала при перезапуске сервера
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authUser');
        set({ token: null, user: null });
      }
      // При сетевой ошибке оставляем сохранённого user из localStorage
    }
  },
}));
