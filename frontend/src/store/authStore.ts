import { create } from "zustand";
import type { User } from "@/types";
import { usersApi } from "@/api/users";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    passwordConfirm: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (username, password) => {
    const { data } = await usersApi.login({ username, password });
    set({ user: data });
  },

  register: async (username, email, password, passwordConfirm) => {
    const { data } = await usersApi.register({
      username,
      email,
      password,
      password_confirm: passwordConfirm,
    });
    set({ user: data });
  },

  logout: async () => {
    await usersApi.logout();
    set({ user: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await usersApi.getProfile();
      set({ user: data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
