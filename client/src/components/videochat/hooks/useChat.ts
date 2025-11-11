import { useState, useRef, MutableRefObject } from "react";
import { type VideoClient } from "@zoom/videosdk";
import { ChatMessage } from "../types";

export const useChat = (
  client: MutableRefObject<typeof VideoClient>,
  userName: string
) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const appendMessage = (message: ChatMessage) => {
    setChatMessages(prev => {
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    const currentUser = client.current.getCurrentUserInfo();
    const message: ChatMessage = {
      id: `${currentUser?.userId || "self"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: currentUser?.userId || 0,
      userName: currentUser?.displayName || userName,
      message: chatInput,
      timestamp: Date.now(),
    };
    
    appendMessage(message);
    setChatInput("");
    
    // Broadcast to other participants via command channel if available
    try {
      const cmdChannel = (client.current as any).getCommandClient?.();
      cmdChannel?.send?.(JSON.stringify({ type: 'chat', data: message }));
    } catch (e) {
      console.log("Chat broadcast not available");
    }
  };

  const handleIncomingMessage = (message: ChatMessage) => {
    appendMessage(message);
  };

  return {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    chatEndRef,
    sendChatMessage,
    handleIncomingMessage,
  };
};

