import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Project, User } from "@/types";

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Project
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;

  // Scanner
  lastScannedBarcode: string | null;
  setLastScannedBarcode: (barcode: string | null) => void;

  // Location
  currentLocation: { lat: number; lng: number } | null;
  setCurrentLocation: (location: { lat: number; lng: number } | null) => void;

  // UI
  pendingScansCount: number;
  setPendingScansCount: (count: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          token: null,
          user: null,
          selectedProject: null,
        }),

      // Project
      selectedProject: null,
      setSelectedProject: (project) => set({ selectedProject: project }),

      // Scanner
      lastScannedBarcode: null,
      setLastScannedBarcode: (barcode) => set({ lastScannedBarcode: barcode }),

      // Location
      currentLocation: null,
      setCurrentLocation: (location) => set({ currentLocation: location }),

      // UI
      pendingScansCount: 0,
      setPendingScansCount: (count) => set({ pendingScansCount: count }),
    }),
    {
      name: "barcode-scanner-storage",
      partialize: (state) => ({
        token: state.token,
        selectedProject: state.selectedProject,
      }),
    }
  )
);
