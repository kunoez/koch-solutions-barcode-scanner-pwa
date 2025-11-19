"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";

export function useAuth() {
  const router = useRouter();
  const { token, user, setToken, setUser, logout, selectedProject } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Store token in localStorage for API client
        localStorage.setItem("token", token);
        const profile = await api.getProfile();
        setUser(profile);
      } catch {
        logout();
        localStorage.removeItem("token");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [token, setUser, logout]);

  const login = async (email: string, password: string) => {
    const accessToken = await api.login({ email, password });
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    const profile = await api.getProfile();
    setUser(profile);
    router.push("/projects");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    logout();
    router.push("/");
  };

  return {
    isAuthenticated: !!token && !!user,
    isLoading,
    user,
    token,
    selectedProject,
    login,
    logout: handleLogout,
  };
}
