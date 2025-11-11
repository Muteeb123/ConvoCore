import { Settings, Video, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoQuality } from "../types";

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  videoQuality: VideoQuality;
  setVideoQuality: (quality: VideoQuality) => void;
  blurEnabled: boolean;
  toggleBlur: () => void;
  virtualBgEnabled: boolean;
  toggleVirtualBackground: () => void;
  isPipMode: boolean;
  togglePictureInPicture: () => void;
  session: string;
  participantsCount: number;
  remainingSeconds: number;
  isRecording: boolean;
  isScreenSharing: boolean;
}

export const SettingsModal = ({
  showSettings,
  setShowSettings,
  videoQuality,
  setVideoQuality,
  blurEnabled,
  toggleBlur,
  virtualBgEnabled,
  toggleVirtualBackground,
  isPipMode,
  togglePictureInPicture,
  session,
  participantsCount,
  remainingSeconds,
  isRecording,
  isScreenSharing,
}: SettingsModalProps) => {
  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[500px] max-h-[600px] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-white" />
            <span className="font-bold text-white text-lg">Settings</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Video Quality */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Quality
            </h3>
            <div className="space-y-2">
              {(["360p", "720p", "1080p"] as const).map((quality) => (
                <label
                  key={quality}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="radio"
                    name="videoQuality"
                    checked={videoQuality === quality}
                    onChange={() => setVideoQuality(quality)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{quality}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Video Effects */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Video Effects
            </h3>
            <div className="space-y-2">
              <Button
                onClick={toggleBlur}
                variant={blurEnabled ? "default" : "outline"}
                className="w-full justify-start"
              >
                {blurEnabled ? "Disable" : "Enable"} Background Blur
              </Button>
              <Button
                onClick={toggleVirtualBackground}
                variant={virtualBgEnabled ? "default" : "outline"}
                className="w-full justify-start"
              >
                {virtualBgEnabled ? "Disable" : "Enable"} Virtual Background
              </Button>
              <Button
                onClick={togglePictureInPicture}
                variant={isPipMode ? "default" : "outline"}
                className="w-full justify-start"
              >
                {isPipMode ? "Exit" : "Enter"} Picture-in-Picture
              </Button>
            </div>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Session Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Session ID:</span> {session}
              </p>
              <p>
                <span className="font-medium">Participants:</span> {participantsCount}
              </p>
              <p>
                <span className="font-medium">Time remaining:</span>{" "}
                {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </p>
              <p>
                <span className="font-medium">Recording:</span>{" "}
                {isRecording ? "Active" : "Inactive"}
              </p>
              <p>
                <span className="font-medium">Screen sharing:</span>{" "}
                {isScreenSharing ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

