import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Role, User } from "@shared/schema";

interface RoleState {
  role: Role | null;
  setRole: (role: Role) => void;
  clearRole: () => void;
}

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: null,
      setRole: (role) => set({ role }),
      clearRole: () => set({ role: null }),
    }),
    {
      name: "user-role-storage", // localStorage key
    }
  )
);

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "user-storage",
    }
  )
);
