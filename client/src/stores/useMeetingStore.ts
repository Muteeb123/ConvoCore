import { create } from "zustand";

type MeetingStore = {
  slug: string | null;
  isHost: boolean;
  startedAt: number | null;
  endsAt: number | null;
  remainingSeconds: number;
  ended: boolean;
  _timerId: number | null;
  setup: (slug: string, isHost: boolean, onTimeUp?: () => void) => Promise<void>;
  clear: () => void;
};

function toSeconds(ms: number) {
  return Math.max(0, Math.floor(ms / 1000));
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  slug: null,
  isHost: false,
  startedAt: null,
  endsAt: null,
  remainingSeconds: 0,
  ended: false,
  _timerId: null,

  setup: async (slug: string, isHost: boolean, onTimeUp?: () => void) => {
    // Stop existing timer
    const existing = get()._timerId;
    if (existing) {
      window.clearInterval(existing);
    }

    // Try to fetch server state to get a canonical endsAt
    let serverEndsAt: number | null = null;
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(slug)}/state`);
      if (res.ok) {
        const data = await res.json();
        if (data?.endsAt) {
          const endsAtMs = typeof data.endsAt === "number" ? data.endsAt : Date.parse(data.endsAt);
          if (!Number.isNaN(endsAtMs)) serverEndsAt = endsAtMs;
        }
        if (data?.ended) {
          set({ slug, isHost, startedAt: Date.now(), endsAt: Date.now(), remainingSeconds: 0, ended: true });
          onTimeUp?.();
          return;
        }
      }
    } catch {}

    const now = Date.now();
    const defaultEndsAt = now + 30 * 60 * 1000; // 30 minutes
    const endsAt = serverEndsAt ?? defaultEndsAt;

    // If host and server doesn't know endsAt, try to register it (ignore failures)
    if (isHost && !serverEndsAt) {
      try {
        await fetch(`/api/meetings/${encodeURIComponent(slug)}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endsAt }),
        });
      } catch {}
    }

    set({ slug, isHost, startedAt: now, endsAt, ended: false });
    // Prime remaining immediately
    set({ remainingSeconds: toSeconds(endsAt - Date.now()) });

    const id = window.setInterval(async () => {
      const st = get();
      if (!st.endsAt) return;
      const remain = toSeconds(st.endsAt - Date.now());
      set({ remainingSeconds: remain });
      if (remain <= 0 && !st.ended) {
        set({ ended: true });
        // Best effort: if host, attempt to end on server
        if (st.isHost) {
          try { await fetch(`/api/meetings/${encodeURIComponent(slug)}/end`, { method: "POST" }); } catch {}
        }
        onTimeUp?.();
      }
    }, 1000);

    set({ _timerId: id });
  },

  clear: () => {
    const id = get()._timerId;
    if (id) window.clearInterval(id);
    set({ slug: null, isHost: false, startedAt: null, endsAt: null, remainingSeconds: 0, ended: false, _timerId: null });
  },
}));


