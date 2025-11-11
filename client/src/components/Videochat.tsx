"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import { CameraButton, MicButton } from "./MuteButtons"; // Alias path
import {
  PhoneOff,
  Link as LinkIcon,
  Users,
  X,
  Maximize2,
  Minimize2,
  Loader2,
  Monitor,
  Video,
  AlertCircle,
  MessageSquare,
  Hand,
  Circle,
  Settings,
  Grid3x3,
  User,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button"; // Alias
import { Input } from "@/components/ui/input"; // Alias
import { useMeetingStore } from "@/stores/useMeetingStore"; // Alias
import { useToast } from "@/hooks/use-toast"; // Alias
import {
  VideochatProps,
  Participant,
  ViewMode,
  VideoQuality as VQ,
} from "@/components/videochat/types"; // Alias path
import { useScreenShare } from "@/components/videochat/hooks/useScreenShare"; // Alias path
import { useChat } from "@/components/videochat/hooks/useChat"; // Alias path
import { useRecording } from "@/components/videochat/hooks/useRecording"; // Alias path
import { useWhiteboard } from "@/components/videochat/hooks/useWhiteboard"; // Alias path
import { useReactions } from "@/components/videochat/hooks/useReactions"; // Alias path
import { useVideoEffects } from "@/components/videochat/hooks/useVideoEffects"; // Alias path
import { ChatPanel } from "@/components/videochat/components/ChatPanel"; // Alias path
import { WhiteboardModal } from "@/components/videochat/components/WhiteboardModal"; // Alias path
import { SettingsModal } from "@/components/videochat/components/SettingsModal"; // Alias path
import { ReactionsOverlay } from "@/components/videochat/components/ReactionsOverlay"; // Alias path

// Note: This logic for userName remains as it is functional
const userName = `User-${new Date().getTime().toString().slice(8)}`;

const Videochat = (props: VideochatProps) => {
  const session = props.slug;
  const jwt = props.JWT;
  const isHost = props.isHost;
  const { toast } = useToast();

  const [inSession, setInSession] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const client = useRef(ZoomVideo.createClient());
  const [isVideoMuted, setIsVideoMuted] = useState(
    !client.current.getCurrentUserInfo()?.bVideoOn
  );
  const [isAudioMuted, setIsAudioMuted] = useState(
    client.current.getCurrentUserInfo()?.muted ?? true
  );

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const shareContainerRef = useRef<HTMLDivElement>(null);
  const shareFullscreenContainerRef = useRef<HTMLDivElement>(null);
  const shareRetryTimersRef = useRef<Map<number, number>>(new Map());
  type ShareViewRecord = {
    container: HTMLElement;
    elements: HTMLElement[];
  };

  const shareViewRecordsRef = useRef<Map<number, ShareViewRecord>>(new Map());
  const activeShareUserRef = useRef<number | null>(null);
  const activeShareChangeHandlerRef = useRef<
    ((payload: any) => Promise<void> | void) | null
  >(null);
  const peerShareStateChangeHandlerRef = useRef<
    ((payload: any) => Promise<void> | void) | null
  >(null);
  const passiveStopShareHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const videoTilesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const commandClientRef = useRef<any>(null);
  const commandHandlerRef = useRef<((payload: any) => void) | null>(null);
  const commandRetryTimeoutRef = useRef<number | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { setup, clear, remainingSeconds } = useMeetingStore();
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [showSettings, setShowSettings] = useState(false);
  const [videoQuality, setVideoQuality] = useState<VQ>("720p");

  const baseUrl = useMemo(() => window.location.origin, []);
  // Note: String interpolation logic remains for functionality
  const internalLink = useMemo(
    () => `${baseUrl}/call/${encodeURIComponent(session)}`,
    [baseUrl, session]
  );
  const externalLink = useMemo(
    () => `${baseUrl}/call/guest/${encodeURIComponent(session)}`,
    [baseUrl, session]
  );

  const screenShare = useScreenShare(client, toast);
  const chat = useChat(client, userName);
  const recording = useRecording(videoContainerRef, session, toast);
  const whiteboard = useWhiteboard(toast);
  const reactions = useReactions(client);
  const videoEffects = useVideoEffects(client, videoContainerRef, toast);

  // All logic functions (teardownCommandChannel, setupCommandChannel, copy, refreshParticipants, etc.)
  // remain unchanged as requested to preserve functionality.

  const teardownCommandChannel = () => {
    if (commandRetryTimeoutRef.current) {
      window.clearTimeout(commandRetryTimeoutRef.current);
      commandRetryTimeoutRef.current = null;
    }

    if (commandHandlerRef.current) {
      try {
        client.current.off?.(
          "command-channel-message",
          commandHandlerRef.current
        );
      } catch (err) {
        console.warn("[COMMAND] Failed to detach handler", err);
      }
    }

    commandClientRef.current = null;
    commandHandlerRef.current = null;
  };

  const setupCommandChannel = () => {
    const commandClient = (client.current as any).getCommandClient?.();

    if (!commandClient) {
      if (!commandRetryTimeoutRef.current) {
        commandRetryTimeoutRef.current = window.setTimeout(() => {
          commandRetryTimeoutRef.current = null;
          setupCommandChannel();
        }, 500);
      }
      return;
    }

    teardownCommandChannel();
    commandClientRef.current = commandClient;

    const handler = (payload: { text?: string }) => {
      if (!payload?.text) {
        return;
      }

      try {
        const parsed = JSON.parse(payload.text);
        if (!parsed?.type) {
          return;
        }

        switch (parsed.type) {
          case "chat": {
            const incoming = parsed.data ?? parsed.message;
            if (!incoming) break;
            const chatMessage = {
              ...incoming,
              // Note: ID generation logic remains for functionality
              id:
                incoming.id ??
                `${incoming.userId ?? "remote"}-${
                  incoming.timestamp ?? Date.now()
                }-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: incoming.timestamp ?? Date.now(),
            };
            chat.handleIncomingMessage(chatMessage);
            break;
          }
          case "reaction": {
            const incomingReaction = parsed.data ?? parsed.reaction;
            if (!incomingReaction) break;
            reactions.handleIncomingReaction({
              ...incomingReaction,
              id:
                incomingReaction.id ??
                `${
                  incomingReaction.userId ?? "remote"
                }-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            });
            break;
          }
          case "handRaise": {
            if (typeof parsed.userId === "number") {
              reactions.handleIncomingHandRaise(
                parsed.userId,
                Boolean(parsed.raised)
              );
            }
            break;
          }
          default:
            break;
        }
      } catch (error) {
        console.error(
          "[COMMAND] Failed to process command message:",
          error,
          payload
        );
      }
    };

    commandHandlerRef.current = handler;
    client.current.on?.("command-channel-message", handler);
    console.log("[COMMAND] Command channel ready");
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copied",
        description: "Meeting link has been copied to clipboard",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const refreshParticipants = () => {
    try {
      const list = (client.current as any).getAllUser?.();
      const mapped = (list || []).map((u: any) => ({
        userId: u.userId,
        displayName: u.displayName || `User-${u.userId}`,
        handRaised: reactions.raisedHands.has(u.userId),
      }));
      setParticipants(mapped);
    } catch {}
  };

  const removeParticipant = async (userId: number) => {
    try {
      const anyClient: any = client.current as any;
      if (typeof anyClient.kickUser === "function") {
        await anyClient.kickUser(userId);
      } else if (typeof anyClient.expelUser === "function") {
        await anyClient.expelUser(userId);
      } else {
        console.warn("Kick/Expel method not found in this SDK version");
      }
      refreshParticipants();
    } catch (e) {
      console.error("Failed to remove participant", e);
    }
  };

  const renderVideo = async (event: {
    action: "Start" | "Stop";
    userId: number;
  }) => {
    const mediaStream = client.current.getMediaStream();
    if (event.action === "Stop") {
      try {
        const element = await mediaStream.detachVideo(event.userId);
        Array.isArray(element)
          ? element.forEach((el) => el.remove())
          : element.remove?.();
      } catch {}
      const tile = videoTilesRef.current.get(event.userId);
      if (tile && tile.parentElement) tile.parentElement.removeChild(tile);
      videoTilesRef.current.delete(event.userId);
      return;
    }

    try {
      console.log(`[RENDER VIDEO] Rendering video for user: ${event.userId}`);

      // All dynamic styling logic remains unchanged to preserve functionality
      const videoEl = document.createElement("video");
      videoEl.style.width = "100%";
      videoEl.style.height = "100%";
      videoEl.style.objectFit = "cover";
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.disablePictureInPicture = true;
      videoEl.style.backgroundColor = "#000";

      const tile = document.createElement("div");
      tile.style.position = "relative";
      tile.style.background = "#000";
      tile.style.borderRadius = "10px";
      tile.style.overflow = "hidden";
      tile.style.aspectRatio = "16/9";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.style.width = "100%";
      tile.style.height = "100%";

      const label = document.createElement("div");
      const name =
        participants.find((p) => p.userId === event.userId)?.displayName ||
        `User-${event.userId}`;
      label.textContent = name;
      label.style.position = "absolute";
      label.style.left = "10px";
      label.style.bottom = "10px";
      label.style.background = "rgba(0,0,0,0.5)";
      label.style.color = "#fff";
      label.style.fontSize = "12px";
      label.style.padding = "2px 6px";
      label.style.borderRadius = "6px";
      label.style.zIndex = "10";

      tile.appendChild(videoEl);
      tile.appendChild(label);

      if (videoContainerRef.current) {
        videoContainerRef.current.appendChild(tile);
        videoTilesRef.current.set(event.userId, tile);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      const streamElement = await mediaStream.attachVideo(
        event.userId,
        VideoQuality.Video_360P
      );

      if (streamElement) {
        videoEl.parentNode?.replaceChild(streamElement as HTMLElement, videoEl);
      }

      console.log(
        `[RENDER VIDEO] Video rendered successfully for user: ${event.userId}`
      );
    } catch (error) {
      console.error(
        `[RENDER VIDEO] Failed to render video for user ${event.userId}:`,
        error
      );
    }
  };

  const scheduleShareRetry = (userId: number, attempt: number) => {
    const retryTimer = window.setTimeout(() => {
      shareRetryTimersRef.current.delete(userId);
      void startShareViewForUser(userId, attempt + 1);
    }, 500);
    const existing = shareRetryTimersRef.current.get(userId);
    if (existing) {
      window.clearTimeout(existing);
    }
    shareRetryTimersRef.current.set(userId, retryTimer);
  };

  const detachShareViewForUser = async (userId: number) => {
    const retryTimer = shareRetryTimersRef.current.get(userId);
    if (retryTimer) {
      window.clearTimeout(retryTimer);
      shareRetryTimersRef.current.delete(userId);
    }

    const record = shareViewRecordsRef.current.get(userId);

    try {
      const mediaStream = client.current.getMediaStream() as any;
      await mediaStream.detachShareView?.(userId);
    } catch (error) {
      console.warn("[SHARE VIEW] Failed to detach share view:", error);
    } finally {
      if (record) {
        record.elements.forEach((element: HTMLElement) => {
          try {
            element.remove();
          } catch {}
        });
        try {
          record.container.remove();
        } catch {}
      }
      shareViewRecordsRef.current.delete(userId);
      if (activeShareUserRef.current === userId) {
        activeShareUserRef.current = null;
      }
    }
  };

  const startShareViewForUser = async (userId: number, attempt = 0) => {
    const currentUserId = client.current.getCurrentUserInfo()?.userId;
    if (userId === currentUserId) {
      return;
    }

    const mediaStream = client.current.getMediaStream() as any;
    const targetContainer = screenShare.isScreenShareFullscreen
      ? shareFullscreenContainerRef.current ?? shareContainerRef.current
      : shareContainerRef.current;

    if (!mediaStream || !targetContainer) {
      console.error("[SHARE VIEW] Share container or media stream unavailable");
      return;
    }

    if (activeShareUserRef.current && activeShareUserRef.current !== userId) {
      await detachShareViewForUser(activeShareUserRef.current);
    }

    try {
      console.log(
        "[SHARE VIEW] Attaching share view for user:",
        userId,
        "attempt",
        attempt
      );
      const element = await mediaStream.attachShareView(userId);
      const elements = (
        Array.isArray(element) ? element : [element]
      ) as HTMLElement[];

      const containerWrapper = document.createElement("video-player-container");
      containerWrapper.className = "share-player-container";
      containerWrapper.style.width = "100%";
      containerWrapper.style.height = "100%";
      containerWrapper.style.display = "flex";
      containerWrapper.style.alignItems = "center";
      containerWrapper.style.justifyContent = "center";

      shareViewRecordsRef.current.set(userId, {
        container: containerWrapper,
        elements,
      });
      activeShareUserRef.current = userId;

      const existingTimer = shareRetryTimersRef.current.get(userId);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        shareRetryTimersRef.current.delete(userId);
      }

      if (
        shareContainerRef.current &&
        shareContainerRef.current !== targetContainer
      ) {
        shareContainerRef.current.innerHTML = "";
      }
      if (
        shareFullscreenContainerRef.current &&
        shareFullscreenContainerRef.current !== targetContainer
      ) {
        shareFullscreenContainerRef.current.innerHTML = "";
      }

      targetContainer.innerHTML = "";
      targetContainer.appendChild(containerWrapper);
      elements.forEach((el: HTMLElement) => {
        el.style.width = "100%";
        el.style.height = "100%";
        containerWrapper.appendChild(el);
      });

      console.log("[SHARE VIEW] Share view attached successfully");
    } catch (error: any) {
      console.error("[SHARE VIEW] Failed to attach share view:", error);
      shareViewRecordsRef.current.delete(userId);
      if (activeShareUserRef.current === userId) {
        activeShareUserRef.current = null;
      }

      if (
        attempt < 5 &&
        error?.type === "INVALID_PARAMETERS" &&
        typeof error?.reason === "string" &&
        error.reason.includes("Target user is not sharing")
      ) {
        scheduleShareRetry(userId, attempt);
      }
    }
  };

  const joinSession = async () => {
    setIsJoining(true);
    try {
      console.log("[JOIN SESSION] Initializing Zoom client...");

      await client.current.init("en-US", "Global", {
        leaveOnPageUnload: true,
      });

      console.log("[JOIN SESSION] Zoom client initialized successfully");
    } catch (error) {
      console.error("[JOIN SESSION] Initialization error:", error);
      toast({
        title: "Failed to initialize",
        description: "Could not initialize video client",
        variant: "destructive",
      });
      setIsJoining(false);
      return;
    }

    client.current.on("peer-video-state-change", renderVideo);
    const passiveStopHandler = async () => {
      await screenShare.stopShare({ skipToast: true });
    };
    passiveStopShareHandlerRef.current = passiveStopHandler;
    client.current.on("passively-stop-share", passiveStopHandler);
    console.log("📍 [JOIN SESSION] Video state change listener registered");

    try {
      const anyClient: any = client.current as any;
      if (typeof anyClient.on === "function") {
        anyClient.on("connection-change", (payload: any) => {
          console.log("[CONNECTION CHANGE]", payload);
          if (
            payload?.state === "Closed" ||
            payload?.reason === "ended_by_host"
          ) {
            teardownCommandChannel();
            if (isHost) {
              window.location.href = "/";
            } else {
              const isGuestPath =
                window.location.pathname.startsWith("/call/guest/");
              window.location.href = isGuestPath ? "/guest-thanks" : "/";
            }
          }
        });
        anyClient.on("session-closed", () => {
          console.log("[SESSION CLOSED] Session ended");
          teardownCommandChannel();
          if (isHost) {
            window.location.href = "/";
          } else {
            const isGuestPath =
              window.location.pathname.startsWith("/call/guest/");
            window.location.href = isGuestPath ? "/guest-thanks" : "/";
          }
        });

        const onActiveShareChange = async (payload: any) => {
          console.log("[ACTIVE SHARE CHANGE] Event received:", payload);
          const state = payload?.state;
          const userId = payload?.userId ?? payload?.activeUserId;
          const mediaStream = client.current.getMediaStream();

          if (!userId) {
            return;
          }

          if (state === "Active" || state === "Started") {
            const isLocal =
              userId === client.current.getCurrentUserInfo()?.userId;
            console.log(`[SHARE ACTIVE] User: ${userId}, IsLocal: ${isLocal}`);

            screenShare.setShareState({ userId, isLocal });
            screenShare.setIsScreenSharePanelOpen(true);
            screenShare.setIsSharingScreen(isLocal);

            if (!isLocal) {
              setTimeout(
                () => {
                  void startShareViewForUser(userId);
                },
                state === "Started" ? 400 : 0
              );
            }
          } else if (state === "Inactive" || state === "Stopped") {
            console.log("[SHARE INACTIVE] Screen share ended for user", userId);
            try {
              await mediaStream.stopShareView?.();
            } catch (e) {
              console.warn("[SHARE CLEANUP] Error stopping share view:", e);
            }
            await detachShareViewForUser(userId);
            screenShare.setShareState({ userId: null, isLocal: false });
            screenShare.setIsScreenShareFullscreen(false);
            screenShare.setIsScreenSharePanelOpen(false);
            screenShare.setIsSharingScreen(false);
          }
        };
        activeShareChangeHandlerRef.current = onActiveShareChange;
        anyClient.on?.("active-share-change", onActiveShareChange);

        const onPeerShareStateChange = async (payload: any) => {
          const { state, userId } = payload || {};
          if (!userId) return;

          const currentUserId = client.current.getCurrentUserInfo()?.userId;

          if (state === "Start" && userId !== currentUserId) {
            console.log("[PEER SHARE] Start detected for", userId);
            await startShareViewForUser(userId);
          } else if (state === "Stop") {
            console.log("[PEER SHARE] Stop detected for", userId);
            await detachShareViewForUser(userId);
            if (!screenShare.shareState.isLocal) {
              screenShare.setShareState({ userId: null, isLocal: false });
              screenShare.setIsScreenSharePanelOpen(false);
            }
          }
        };
        peerShareStateChangeHandlerRef.current = onPeerShareStateChange;
        anyClient.on?.("peer-share-state-change", onPeerShareStateChange);
      }
    } catch (e) {
      console.error("[JOIN SESSION] Error setting up event listeners:", e);
    }

    client.current.on("user-added", refreshParticipants);
    client.current.on("user-removed", refreshParticipants);

    await client.current
      .join(session, jwt, userName)
      .catch((e) => console.log("[JOIN SESSION] Join error:", e));

    setupCommandChannel();
    setInSession(true);

    refreshParticipants();

    await setup(session, isHost, () => {
      console.log("[TIMER] 30-minute session time reached");
      if (isHost) {
        window.location.href = "/";
      } else {
        const isGuestPath = window.location.pathname.startsWith("/call/guest/");
        window.location.href = isGuestPath ? "/guest-thanks" : "/";
      }
    });

    const mediaStream = client.current.getMediaStream();
    await mediaStream.startAudio();
    setIsAudioMuted(mediaStream.isAudioMuted());

    await mediaStream.startVideo();
    const isVideoCapturing = mediaStream.isCapturingVideo();
    setIsVideoMuted(!isVideoCapturing);

    await renderVideo({
      action: "Start",
      userId: client.current.getCurrentUserInfo().userId,
    });
    setIsJoining(false);
  };

  const leaveSession = async () => {
    if (recording.isRecording) {
      recording.stopRecording();
    }

    const attachedShareUsers = Array.from(shareViewRecordsRef.current.keys());
    await Promise.all(
      attachedShareUsers.map((userId) => detachShareViewForUser(userId))
    );
    shareViewRecordsRef.current.clear();

    try {
      await client.current.getMediaStream().stopShareView?.();
    } catch {}
    videoTilesRef.current.forEach((tile) => tile.remove());
    videoTilesRef.current.clear();

    teardownCommandChannel();

    client.current.off("peer-video-state-change", renderVideo);
    if (passiveStopShareHandlerRef.current) {
      client.current.off(
        "passively-stop-share",
        passiveStopShareHandlerRef.current
      );
      passiveStopShareHandlerRef.current = null;
    }
    if (activeShareChangeHandlerRef.current) {
      (client.current as any).off?.(
        "active-share-change",
        activeShareChangeHandlerRef.current
      );
      activeShareChangeHandlerRef.current = null;
    }
    if (peerShareStateChangeHandlerRef.current) {
      (client.current as any).off?.(
        "peer-share-state-change",
        peerShareStateChangeHandlerRef.current
      );
      peerShareStateChangeHandlerRef.current = null;
    }
    client.current.off("user-added", refreshParticipants);
    client.current.off("user-removed", refreshParticipants);
    try {
      (client.current as any).off?.("active-share-change");
    } catch {}
    try {
      (client.current as any).off?.("peer-share-state-change");
    } catch {}
    await client.current.leave().catch((e) => console.log("leave error", e));
    clear();
    if (isHost) {
      window.location.href = "/";
    } else {
      const isGuestPath = window.location.pathname.startsWith("/call/guest/");
      window.location.href = isGuestPath ? "/guest-thanks" : "/";
    }
  };

  useEffect(() => {
    chat.chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.chatMessages]);

  useEffect(() => {
    if (whiteboard.showWhiteboard && whiteboard.whiteboardCanvasRef.current) {
      const canvas = whiteboard.whiteboardCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [whiteboard.showWhiteboard]);

  useEffect(() => {
    if (!inSession) return;
    let timer: number | null = null;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/meetings/${encodeURIComponent(session)}/state`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.ended) {
            await leaveSession();
            return;
          }
        }

        if (!screenShare.shareState.userId) {
          try {
            const mediaStream = client.current.getMediaStream();
            const activeShareUser = (mediaStream as any).getActiveShareUser?.();
            if (
              activeShareUser &&
              activeShareUser !== client.current.getCurrentUserInfo()?.userId
            ) {
              screenShare.setShareState({
                userId: activeShareUser,
                isLocal: false,
              });
              screenShare.setIsScreenSharePanelOpen(true);

              setTimeout(async () => {
                try {
                  await startShareViewForUser(activeShareUser);
                } catch (viewError) {
                  console.error(
                    "❌ [POLL VIEW] Failed to start viewing:",
                    viewError
                  );
                }
              }, 500);
            }
          } catch (shareCheckError) {}
        }
      } catch {}
      timer = window.setTimeout(poll, 2000);
    };
    poll();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [inSession, session, screenShare.shareState.userId]);

  useEffect(() => {
    return () => {
      teardownCommandChannel();
      shareRetryTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer)
      );
      shareRetryTimersRef.current.clear();
      shareViewRecordsRef.current.forEach((_value, userId) => {
        void detachShareViewForUser(userId);
      });
      shareViewRecordsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (screenShare.shareState.userId && !screenShare.isScreenShareFullscreen) {
      startShareViewForUser(screenShare.shareState.userId);
    }
  }, [screenShare.shareState.userId, screenShare.isScreenSharePanelOpen]);

  useEffect(() => {
    const activeUserId = activeShareUserRef.current;
    if (!activeUserId) return;

    const record = shareViewRecordsRef.current.get(activeUserId);
    const targetContainer = screenShare.isScreenShareFullscreen
      ? shareFullscreenContainerRef.current ?? shareContainerRef.current
      : shareContainerRef.current;

    if (!record || !targetContainer) return;

    if (
      shareContainerRef.current &&
      shareContainerRef.current !== targetContainer
    ) {
      shareContainerRef.current.innerHTML = "";
    }
    if (
      shareFullscreenContainerRef.current &&
      shareFullscreenContainerRef.current !== targetContainer
    ) {
      shareFullscreenContainerRef.current.innerHTML = "";
    }

    targetContainer.innerHTML = "";
    targetContainer.appendChild(record.container);
  }, [
    screenShare.isScreenShareFullscreen,
    screenShare.isScreenSharePanelOpen,
    screenShare.shareState.userId,
  ]);

  // Fullscreen Share View (UI Polished)
  if (screenShare.isScreenShareFullscreen && screenShare.shareState.userId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700">
          <h1 className="text-white font-semibold">Screen Share</h1>
          <Button
            size="sm"
            variant="outline"
            onClick={() => screenShare.setIsScreenShareFullscreen(false)}
            className="text-slate-200 border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <Minimize2 className="h-4 w-4 mr-2" /> Exit Fullscreen
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            ref={shareFullscreenContainerRef}
            className="w-full h-full rounded-lg overflow-hidden bg-black flex items-center justify-center video-player-container share-container"
          >
            {!screenShare.shareState.userId && (
              <div className="text-slate-400 text-sm">
                Preparing share view...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Component View (UI Polished)
  return (
    <div className="flex h-full w-full flex-1 flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-4 md:px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Monitor className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <div className="min-w-0">
            {/* UPDATED: Title is now conditional */}
            <h1 className="text-base md:text-lg font-bold text-slate-800 truncate">
              {isHost ? "Video Session" : "Guest Meeting"}
            </h1>
            <p className="text-xs text-slate-500 truncate">{session}</p>
          </div>
        </div>
        {inSession && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* UPDATED: This block is now wrapped in isHost check */}
            {isHost && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(internalLink)}
                  title="Copy internal host link"
                  className="rounded-lg hidden sm:flex"
                >
                  <LinkIcon className="h-4 w-4 mr-1.5" /> Internal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(externalLink)}
                  title="Copy external guest link"
                  className="rounded-lg hidden md:flex"
                >
                  <LinkIcon className="h-4 w-4 mr-1.5" /> Guest
                </Button>
              </>
            )}
            {remainingSeconds <= 5 * 60 && (
              <div className="ml-2 rounded-lg bg-red-100 text-red-700 px-3 py-1.5 text-xs font-semibold shadow-sm flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Ends in {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area - This will scroll if content overflows */}
      <div className="flex-1 flex flex-col lg:flex-row w-full gap-0 overflow-hidden">
        {/* Primary View (Video/Share) - This area scrolls vertically */}
        <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
          {/* FIX: This logic ensures the share panel only shows if:
            1. Someone is sharing (screenShare.shareState.userId)
            2. The person sharing is NOT the current user (!screenShare.shareState.isLocal)
          */}
          {screenShare.shareState.userId && !screenShare.shareState.isLocal && (
            <div className="flex-shrink-0">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-900/70 border-b border-slate-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-blue-600/50 flex items-center justify-center flex-shrink-0">
                      <Monitor className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-base font-bold text-white truncate">
                        Screen Share
                      </span>
                      <div className="text-xs text-blue-300 mt-0.5 truncate">
                        {/* This text will now only show "Viewing shared screen" based on parent logic */}
                        {!screenShare.shareState.isLocal &&
                          "👁 Viewing shared screen"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        screenShare.setIsScreenShareFullscreen(true)
                      }
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg"
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Fullscreen
                    </Button>
                    {screenShare.isScreenSharePanelOpen && (
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() =>
                          screenShare.setIsScreenSharePanelOpen(false)
                        }
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg w-9 h-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {screenShare.isScreenSharePanelOpen && (
                  <div
                    ref={shareContainerRef}
                    className="relative bg-black video-player-container share-container flex items-center justify-center"
                    style={{
                      height: "450px", // Fixed height for share view
                      overflow: "hidden",
                    }}
                  >
                    {!screenShare.shareState.userId && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center text-slate-400">
                          <Monitor className="h-16 w-16 mx-auto mb-4 opacity-30" />
                          <p className="text-sm">
                            Screen sharing in progress...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FIX: This is the second part of the fix.
            This placeholder shows for the person who IS sharing.
          */}
          {/* {screenShare.shareState.isLocal && (
            <div className="flex-shrink-0">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl p-6">
                <div className="flex items-center justify-center gap-3 min-w-0 h-[450px] text-center text-slate-400">
                  <div className="flex flex-col items-center gap-4">
                    <Monitor className="h-16 w-16 mx-auto opacity-30" />
                    <p className="text-lg font-semibold text-white">
                      You are sharing your screen
                    </p>
                    <p className="text-sm">
                      Other participants can see your shared content.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        void screenShare.stopShare();
                      }}
                      className="rounded-lg mt-2"
                    >
                      <Monitor className="h-4 w-4 mr-1.5" />
                      Stop Sharing
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Main video area */}
          <div className="bg-black rounded-lg border border-slate-700 overflow-hidden shadow-sm flex-1 flex flex-col min-h-[300px]">
            <div
              ref={videoContainerRef}
              className="flex-1 w-full h-full relative" // Use relative for join button positioning
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "12px",
                padding: "12px",
                overflow: "auto",
              }}
            >
              {!inSession && (
                <div className="flex items-center justify-center h-full min-h-[300px] absolute inset-0">
                  <div className="flex flex-col items-center gap-4">
                    {isJoining ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm text-slate-400">
                          Joining session...
                        </p>
                      </>
                    ) : (
                      <Button
                        size="lg"
                        className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-semibold rounded-lg shadow-lg"
                        onClick={joinSession}
                      >
                        <Video className="h-5 w-5 mr-2" />
                        Join Session
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side panel - Participants list */}
        {inSession && (
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 shadow-sm flex flex-col flex-shrink-0 overflow-hidden max-h-[50vh] lg:max-h-none">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4 mr-2 text-slate-500" /> Participants (
                {participants.length})
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {participants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-slate-300 mb-2" />
                  <div className="text-xs text-slate-500">
                    No participants yet.
                  </div>
                </div>
              ) : (
                participants.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 bg-white hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold relative flex-shrink-0">
                        {p.displayName.charAt(0).toUpperCase()}
                        {reactions.raisedHands.has(p.userId) && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 p-0.5 rounded-full shadow">
                            <Hand className="h-2.5 w-2.5 text-black" />
                          </div>
                        )}
                      </div>
                      <div
                        className="text-sm truncate font-medium text-slate-700"
                        title={p.displayName}
                      >
                        {p.displayName}
                      </div>
                    </div>
                    {/* FIX: Hide kick button if not host */}
                    {isHost &&
                      p.userId !==
                        client.current.getCurrentUserInfo()?.userId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeParticipant(p.userId)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                  </div>
                ))
              )}
            </div>
            {/* FIX: Hide Quick Links if not host */}
            {/* {isHost && (
              <div className="border-t border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Quick Links
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={internalLink}
                    className="flex-1 text-xs bg-white border-slate-300"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => copy(internalLink)}
                  >
                    Copy
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={externalLink}
                    className="flex-1 text-xs bg-white border-slate-300"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => copy(externalLink)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )} */}
          </div>
        )}
      </div>

      {/* Modular UI Components */}
      <ChatPanel {...chat} />
      <ReactionsOverlay reactions={reactions.reactions} />
      <WhiteboardModal {...whiteboard} />
      <SettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        videoQuality={videoQuality}
        setVideoQuality={setVideoQuality}
        blurEnabled={videoEffects.blurEnabled}
        toggleBlur={videoEffects.toggleBlur}
        virtualBgEnabled={videoEffects.virtualBgEnabled}
        toggleVirtualBackground={videoEffects.toggleVirtualBackground}
        isPipMode={videoEffects.isPipMode}
        togglePictureInPicture={videoEffects.togglePictureInPicture}
        session={session}
        participantsCount={participants.length}
        remainingSeconds={remainingSeconds}
        isRecording={recording.isRecording}
        isScreenSharing={!!screenShare.shareState.userId}
      />

      {/* Controls footer */}
      {inSession && (
        <div className="bg-white border-t border-slate-200 p-3 flex gap-2 justify-center items-center shadow-inner-top flex-wrap flex-shrink-0">
          {/* Basic controls */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
            <CameraButton
              client={client}
              isVideoMuted={isVideoMuted}
              setIsVideoMuted={setIsVideoMuted}
              renderVideo={renderVideo}
            />
            <MicButton
              isAudioMuted={isAudioMuted}
              client={client}
              setIsAudioMuted={setIsAudioMuted}
            />
          </div>

          {/* Screen share */}
          {!screenShare.shareState.isLocal ? (
            <Button
              onClick={() => {
                void screenShare.startShare();
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              disabled={screenShare.isSharingScreen}
            >
              <Monitor className="h-4 w-4 mr-1.5" />
              Share
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                void screenShare.stopShare();
              }}
              className="rounded-lg"
            >
              <Monitor className="h-4 w-4 mr-1.5" />
              Stop
            </Button>
          )}

          {/* FIX: Hide Record button if not host */}
          {isHost && !recording.isRecording ? (
            <Button
              onClick={recording.startRecording}
              size="sm"
              variant="outline"
              className="rounded-lg"
            >
              <Circle className="h-4 w-4 mr-1.5 text-red-600" />
              Record
            </Button>
          ) : isHost && recording.isRecording ? (
            <Button
              onClick={recording.stopRecording}
              size="sm"
              variant="destructive"
              className="animate-pulse rounded-lg"
            >
              <Circle className="h-4 w-4 mr-1.5 fill-red-600 text-red-600" />
              Stop Recording
            </Button>
          ) : null}

          {/* Chat */}
          <Button
            onClick={() => chat.setIsChatOpen(!chat.isChatOpen)}
            size="sm"
            variant={chat.isChatOpen ? "secondary" : "outline"}
            className="relative rounded-lg"
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Chat
            {chat.chatMessages.length > 0 && !chat.isChatOpen && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                {chat.chatMessages.length}
              </span>
            )}
          </Button>

          {/* Reactions */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
            <Button
              onClick={() => reactions.sendReaction("👍")}
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0 text-lg rounded-md"
            >
              👍
            </Button>
            <Button
              onClick={() => reactions.sendReaction("❤")}
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0 text-lg rounded-md"
            >
              ❤
            </Button>
            <Button
              onClick={() => reactions.sendReaction("😂")}
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0 text-lg rounded-md"
            >
              😂
            </Button>
            <Button
              onClick={() => reactions.sendReaction("👏")}
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0 text-lg rounded-md"
            >
              👏
            </Button>
          </div>

          {/* Hand Raise */}
          <Button
            onClick={() => reactions.toggleHandRaise(toast)}
            size="sm"
            variant={reactions.handRaised ? "secondary" : "outline"}
            className={`${
              reactions.handRaised
                ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                : ""
            } rounded-lg`}
          >
            <Hand className="h-4 w-4 mr-1.5" />
            {reactions.handRaised ? "Lower" : "Raise"}
          </Button>

          {/* View Mode */}
          <Button
            onClick={() =>
              setViewMode(viewMode === "gallery" ? "speaker" : "gallery")
            }
            size="sm"
            variant="outline"
            className="rounded-lg"
          >
            {viewMode === "gallery" ? (
              <User className="h-4 w-4 mr-1.5" />
            ) : (
              <Grid3x3 className="h-4 w-4 mr-1.5" />
            )}
            {viewMode === "gallery" ? "Speaker" : "Gallery"}
          </Button>

          {/* Whiteboard */}
          <Button
            onClick={() =>
              whiteboard.setShowWhiteboard(!whiteboard.showWhiteboard)
            }
            size="sm"
            variant={whiteboard.showWhiteboard ? "secondary" : "outline"}
            className="rounded-lg"
          >
            <PenTool className="h-4 w-4 mr-1.5" />
            Whiteboard
          </Button>

          {/* Settings */}
          <Button
            onClick={() => setShowSettings(!showSettings)}
            size="icon"
            variant="outline"
            className="rounded-lg"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Leave */}
          <Button
            onClick={leaveSession}
            variant="destructive"
            size="sm"
            className="ml-2 rounded-lg"
          >
            <PhoneOff className="h-4 w-4 mr-1.5" /> Leave
          </Button>
        </div>
      )}
    </div>
  );
};

export default Videochat;
