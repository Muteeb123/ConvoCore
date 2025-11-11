// Types and interfaces for Videochat component

export interface VideochatProps {
  slug: string;
  JWT: string;
  isHost: boolean;
}

export interface Participant {
  userId: number;
  displayName: string;
  handRaised?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  message: string;
  timestamp: number;
}

export interface Reaction {
  userId: number;
  emoji: string;
  id: string;
}

export interface ShareState {
  userId: number | null;
  isLocal: boolean;
}

export type ViewMode = "gallery" | "speaker";
export type VideoQuality = "360p" | "720p" | "1080p";
export type DrawTool = "pen" | "eraser";

