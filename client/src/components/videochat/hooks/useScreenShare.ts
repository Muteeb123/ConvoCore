import { useState, useRef, MutableRefObject, useCallback } from "react";
import ZoomVideo from "@zoom/videosdk";
import { ShareState } from "../types";

type VideoClientType = ReturnType<typeof ZoomVideo.createClient>;

interface StopShareOptions {
  skipToast?: boolean;
}

export const useScreenShare = (
  clientRef: MutableRefObject<VideoClientType>,
  toast: (props: any) => void
) => {
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [shareState, setShareState] = useState<ShareState>({ userId: null, isLocal: false });
  const [isScreenShareFullscreen, setIsScreenShareFullscreen] = useState(false);
  const [isScreenSharePanelOpen, setIsScreenSharePanelOpen] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupShareElements = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (videoElementRef.current) {
      try {
        const video = videoElementRef.current;
        if (!video.paused) {
          video.pause();
        }
        video.srcObject = null;
        video.src = '';
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
        
        videoElementRef.current = null;
        console.log("✅ [SCREEN SHARE] Video element cleaned up");
      } catch (error) {
        console.warn("⚠️ [SCREEN SHARE] Failed to cleanup video element:", error);
      }
    }
    if (canvasElementRef.current) {
      try {
        const canvas = canvasElementRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        
        canvasElementRef.current = null;
        console.log("✅ [SCREEN SHARE] Canvas element cleaned up");
      } catch (error) {
        console.warn("⚠️ [SCREEN SHARE] Failed to cleanup canvas element:", error);
      }
    }
  }, []);

  const ensureVideoElement = useCallback(() => {
    if (videoElementRef.current) {
      cleanupShareElements();
    }

    const video = document.createElement("video");
    video.id = `zoom-share-video-${Date.now()}`;
    video.style.position = "fixed";
    video.style.left = "-10000px";
    video.style.top = "-10000px";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.zIndex = "-1";
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    document.body.appendChild(video);
    videoElementRef.current = video;
    
    console.log("✅ [SCREEN SHARE] Video element created:", video.id);
    return video;
  }, [cleanupShareElements]);

  const ensureCanvasElement = useCallback(() => {
    if (canvasElementRef.current) {
      cleanupShareElements();
    }

    const canvas = document.createElement("canvas");
    canvas.id = `zoom-share-canvas-${Date.now()}`;
    canvas.style.position = "fixed";
    canvas.style.left = "-10000px";
    canvas.style.top = "-10000px";
    canvas.style.width = "1px";
    canvas.style.height = "1px";
    canvas.style.opacity = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "-1";

    document.body.appendChild(canvas);
    canvasElementRef.current = canvas;
    
    console.log("✅ [SCREEN SHARE] Canvas element created:", canvas.id);
    return canvas;
  }, [cleanupShareElements]);

  const resetShareState = useCallback(() => {
    setIsSharingScreen(false);
    setShareState({ userId: null, isLocal: false });
    setIsScreenShareFullscreen(false);
    setIsScreenSharePanelOpen(false);
  }, []);

  const startShare = useCallback(async () => {
    const client = clientRef.current;
    const mediaStream = client.getMediaStream();

    if (!mediaStream) {
      console.error("[SCREEN SHARE] Media stream not available");
      toast({
        title: "Screen share unavailable",
        description: "Media stream is not ready yet. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("[SCREEN SHARE] Starting screen share...");
      cleanupShareElements();
      await new Promise(resolve => setTimeout(resolve, 100));
      const needsVideoElement = typeof mediaStream.isStartShareScreenWithVideoElement === "function"
        ? mediaStream.isStartShareScreenWithVideoElement()
        : false;

      const element = needsVideoElement ? ensureVideoElement() : ensureCanvasElement();
      
      console.log("[SCREEN SHARE] Using element type:", needsVideoElement ? "video" : "canvas");
      console.log("[SCREEN SHARE] Element details:", {
        tagName: element.tagName,
        id: element.id,
        parentNode: !!element.parentNode
      });

      await mediaStream.startShareScreen(element);
      console.log("[SCREEN SHARE] Screen share started successfully");

      setIsSharingScreen(true);
      setShareState({
        userId: client.getCurrentUserInfo()?.userId ?? null,
        isLocal: true,
      });
      setIsScreenSharePanelOpen(true);

      toast({
        title: "Screen sharing started",
        description: "Your screen is now being shared.",
      });
      cleanupTimeoutRef.current = setTimeout(() => {
        console.log("[SCREEN SHARE] Cleanup timeout triggered");
        cleanupShareElements();
      }, 30000);

    } catch (error: any) {
      console.error("[SCREEN SHARE] Failed to start:", error);

      cleanupShareElements();
      resetShareState();

      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      let description = "Failed to start screen share.";
      if (error?.name === "NotAllowedError") {
        description = "Browser denied screen share permission. Please check your browser settings.";
      } else if (error?.name === "NotFoundError") {
        description = "No screen or window was selected for sharing.";
      } else if (error?.name === "NotSupportedError") {
        description = "Screen sharing is not supported in this browser.";
      } else if (error?.message) {
        description = error.message;
      } else if (error?.type === "INVALID_PARAMETERS") {
        description = "Invalid parameters for screen sharing.";
      }

      toast({
        title: "Screen share failed",
        description,
        variant: "destructive",
      });
    }
  }, [clientRef, cleanupShareElements, ensureCanvasElement, ensureVideoElement, resetShareState, toast]);

  const stopShare = useCallback(async (options?: StopShareOptions) => {
    const client = clientRef.current;
    const mediaStream = client.getMediaStream();

    try {
      console.log("[SCREEN SHARE] Stopping screen share...");
      await mediaStream.stopShareScreen?.();
      console.log("[SCREEN SHARE] Screen share stopped");
    } catch (error) {
      console.warn("[SCREEN SHARE] Error while stopping share:", error);
    } finally {
      cleanupShareElements();
      resetShareState();
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }

      if (!options?.skipToast) {
        toast({
          title: "Screen sharing stopped",
          description: "Your screen is no longer being shared.",
        });
      }
    }
  }, [clientRef, cleanupShareElements, resetShareState, toast]);

  useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    cleanupShareElements();
  }, [cleanupShareElements]);

  return {
    isSharingScreen,
    setIsSharingScreen,
    shareState,
    setShareState,
    isScreenShareFullscreen,
    setIsScreenShareFullscreen,
    isScreenSharePanelOpen,
    setIsScreenSharePanelOpen,
    startShare,
    stopShare,
  };
};