import { create } from "zustand";

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  sector_id: number;
  avatar: string | null;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  role: { name: string } | null;
  sector: { name: string; id?: number } | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  clearMustChangePassword: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  logout: () => {
    localStorage.removeItem("geotask_user");
    set({ user: null, loading: false });
  },

  clearMustChangePassword: () => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, must_change_password: false };
    set({ user: updated });
    localStorage.setItem("geotask_user", JSON.stringify(updated));
  },
}));
