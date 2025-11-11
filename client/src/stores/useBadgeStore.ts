import { create } from "zustand";

type BadgeState = {
  badges: Record<string, number>;
  setBadge: (key: string, value: number) => void;
};

export const useBadgeStore = create<BadgeState>((set, get) => ({
  badges: {},
  setBadge: (key, value) => {
    const current = get().badges[key];
    if (current === value) return;

    set((state) => ({
      badges: {
        ...state.badges,
        [key]: value,
      },
    }));
  },
}));
