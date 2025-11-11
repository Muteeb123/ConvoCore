import { useState, MutableRefObject } from "react";
import { type VideoClient } from "@zoom/videosdk";

export const useVideoEffects = (
  client: MutableRefObject<typeof VideoClient>,
  videoContainerRef: MutableRefObject<HTMLDivElement | null>,
  toast: any
) => {
  const [virtualBgEnabled, setVirtualBgEnabled] = useState(false);
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [isPipMode, setIsPipMode] = useState(false);

  const toggleVirtualBackground = async () => {
    try {
      const mediaStream = client.current.getMediaStream() as any;
      
      if (!virtualBgEnabled) {
        if (mediaStream.updateVirtualBackground) {
          await mediaStream.updateVirtualBackground({
            imageUrl: 'blur',
          });
          setVirtualBgEnabled(true);
          toast({
            title: "Virtual background enabled",
            description: "Background blur is now active",
          });
        } else {
          toast({
            title: "Not supported",
            description: "Virtual background is not supported in this SDK version",
            variant: "destructive",
          });
        }
      } else {
        if (mediaStream.updateVirtualBackground) {
          await mediaStream.updateVirtualBackground({ imageUrl: 'none' });
          setVirtualBgEnabled(false);
          toast({
            title: "Virtual background disabled",
            description: "Background blur has been removed",
          });
        }
      }
    } catch (error) {
      console.error("Virtual background error:", error);
      toast({
        title: "Error",
        description: "Failed to toggle virtual background",
        variant: "destructive",
      });
    }
  };

  const toggleBlur = async () => {
    try {
      const mediaStream = client.current.getMediaStream() as any;
      
      if (!blurEnabled) {
        if (mediaStream.updateVirtualBackground) {
          await mediaStream.updateVirtualBackground({ imageUrl: 'blur' });
          setBlurEnabled(true);
          toast({
            title: "Background blur enabled",
            description: "Your background is now blurred",
          });
        } else {
          toast({
            title: "Not supported",
            description: "Background blur is not supported in this SDK version",
            variant: "destructive",
          });
        }
      } else {
        if (mediaStream.updateVirtualBackground) {
          await mediaStream.updateVirtualBackground({ imageUrl: 'none' });
          setBlurEnabled(false);
          toast({
            title: "Background blur disabled",
            description: "Background blur has been removed",
          });
        }
      }
    } catch (error) {
      console.error("Background blur error:", error);
      toast({
        title: "Error",
        description: "Failed to toggle background blur",
        variant: "destructive",
      });
    }
  };

  const togglePictureInPicture = async () => {
    try {
      const videoElement = videoContainerRef.current?.querySelector('video');
      
      if (!videoElement) {
        toast({
          title: "No video available",
          description: "Cannot enable picture-in-picture mode",
          variant: "destructive",
        });
        return;
      }

      if (!document.pictureInPictureElement) {
        await videoElement.requestPictureInPicture();
        setIsPipMode(true);
        toast({
          title: "Picture-in-Picture enabled",
          description: "Video is now in PiP mode",
        });
      } else {
        await document.exitPictureInPicture();
        setIsPipMode(false);
        toast({
          title: "Picture-in-Picture disabled",
          description: "Returned to normal view",
        });
      }
    } catch (error) {
      console.error("Picture-in-picture error:", error);
      toast({
        title: "PiP not supported",
        description: "Picture-in-picture is not available",
        variant: "destructive",
      });
    }
  };

  return {
    virtualBgEnabled,
    blurEnabled,
    isPipMode,
    setIsPipMode,
    toggleVirtualBackground,
    toggleBlur,
    togglePictureInPicture,
  };
};

