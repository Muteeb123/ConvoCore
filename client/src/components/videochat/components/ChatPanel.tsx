import { MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "../types";

interface ChatPanelProps {
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  sendChatMessage: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatPanel = ({
  isChatOpen,
  setIsChatOpen,
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  chatEndRef,
}: ChatPanelProps) => {
  if (!isChatOpen) return null;

  return (
    <div className="fixed right-4 bottom-24 w-96 h-96 bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col z-40">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">Chat</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsChatOpen(false)}
          className="h-7 w-7 p-0 text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2 bg-gray-50">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="h-12 w-12 mb-2" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-lg p-2 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                  {msg.userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  {msg.userName}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-800 ml-8">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          placeholder="Type a message..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
          className="flex-1"
        />
        <Button onClick={sendChatMessage} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

