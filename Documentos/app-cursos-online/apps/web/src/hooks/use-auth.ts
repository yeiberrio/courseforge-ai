"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { User, AuthResponse } from "@/types";

const TOKEN_KEY = "cf_access_token";
const REFRESH_KEY = "cf_refresh_token";
const USER_KEY = "cf_user";

function getTokens() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  return {
    token,
    user: userStr ? JSON.parse(userStr) : null,
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token: savedToken, user: savedUser } = getTokens();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login", { email, password });

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);

    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.post("/auth/logout", {}, token);
      }
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
  };
}
