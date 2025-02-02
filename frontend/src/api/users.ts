import api from "./client";
import type { User } from "@/types";

export const usersApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
  }) => api.post<User>("/api/users/register/", data),

  login: (data: { username: string; password: string }) =>
    api.post<User>("/api/users/login/", data),

  logout: () => api.post("/api/users/logout/"),

  getProfile: () => api.get<User>("/api/users/me/"),

  updateProfile: (data: Partial<User>) =>
    api.patch<User>("/api/users/me/", data),
};
