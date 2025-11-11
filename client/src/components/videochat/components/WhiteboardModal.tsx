import { PenTool, Eraser, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawTool } from "../types";

interface WhiteboardModalProps {
  showWhiteboard: boolean;
  setShowWhiteboard: (show: boolean) => void;
  whiteboardCanvasRef: React.RefObject<HTMLCanvasElement>;
  drawTool: DrawTool;
  setDrawTool: (tool: DrawTool) => void;
  drawColor: string;
  setDrawColor: (color: string) => void;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  clearWhiteboard: () => void;
  saveWhiteboard: () => void;
}

export const WhiteboardModal = ({
  showWhiteboard,
  setShowWhiteboard,
  whiteboardCanvasRef,
  drawTool,
  setDrawTool,
  drawColor,
  setDrawColor,
  startDrawing,
  draw,
  stopDrawing,
  clearWhiteboard,
  saveWhiteboard,
}: WhiteboardModalProps) => {
  if (!showWhiteboard) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[90%] h-[90%] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
          <div className="flex items-center gap-3">
            <PenTool className="h-6 w-6 text-white" />
            <span className="font-bold text-white text-lg">Whiteboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDrawTool("pen")}
              className={`text-white hover:bg-white/20 ${
                drawTool === "pen" ? "bg-white/30" : ""
              }`}
            >
              <PenTool className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDrawTool("eraser")}
              className={`text-white hover:bg-white/20 ${
                drawTool === "eraser" ? "bg-white/30" : ""
              }`}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              className="h-8 w-12 rounded cursor-pointer"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={clearWhiteboard}
              className="text-white hover:bg-white/20"
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={saveWhiteboard}
              className="text-white hover:bg-white/20"
            >
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowWhiteboard(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-100">
          <canvas
            ref={whiteboardCanvasRef}
            width={1600}
            height={900}
            className="bg-white shadow-xl cursor-crosshair rounded"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
};

