import { useState, useRef, MutableRefObject } from "react";

export const useRecording = (
  videoContainerRef: MutableRefObject<HTMLDivElement | null>,
  session: string,
  toast: any
) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const container = videoContainerRef.current;
      if (!container) {
        throw new Error("Video container not found");
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error("Could not get canvas context");

      const canvasStream = canvas.captureStream(30);
      
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach(track => {
          canvasStream.addTrack(track);
        });
      } catch (audioError) {
        console.warn("Could not capture audio:", audioError);
      }

      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(canvasStream, options);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${session}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: "Recording saved",
          description: "Your recording has been downloaded",
        });
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      const drawFrame = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const videos = container.querySelectorAll('video, canvas');
        videos.forEach((videoEl, index) => {
          if (videoEl instanceof HTMLVideoElement || videoEl instanceof HTMLCanvasElement) {
            const x = (index % 3) * 640;
            const y = Math.floor(index / 3) * 360;
            ctx.drawImage(videoEl as any, x, y, 640, 360);
          }
        });
        
        requestAnimationFrame(drawFrame);
      };
      
      drawFrame();

      toast({
        title: "Recording started",
        description: "Your meeting is being recorded",
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not start recording",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};

