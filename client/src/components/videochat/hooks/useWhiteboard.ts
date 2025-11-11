import { useState, useRef, MutableRefObject } from "react";
import { DrawTool } from "../types";

export const useWhiteboard = (toast: any) => {
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawTool, setDrawTool] = useState<DrawTool>("pen");

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = drawTool === 'eraser' ? '#FFFFFF' : drawColor;
    ctx.lineWidth = drawTool === 'eraser' ? 20 : 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Whiteboard saved",
        description: "Your whiteboard has been downloaded",
      });
    });
  };

  return {
    showWhiteboard,
    setShowWhiteboard,
    whiteboardCanvasRef,
    isDrawing,
    drawColor,
    setDrawColor,
    drawTool,
    setDrawTool,
    startDrawing,
    draw,
    stopDrawing,
    clearWhiteboard,
    saveWhiteboard,
  };
};

