import { useState, MutableRefObject } from "react";
import { type VideoClient } from "@zoom/videosdk";
import { Reaction } from "../types";

export const useReactions = (client: MutableRefObject<typeof VideoClient>) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<number>>(new Set());

  const scheduleRemoval = (reactionId: string, delay = 3000) => {
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reactionId));
    }, delay);
  };

  const addReaction = (reaction: Reaction, opts?: { durationMs?: number }) => {
    setReactions(prev => {
      if (prev.some(r => r.id === reaction.id)) {
        return prev;
      }
      return [...prev, reaction];
    });
    scheduleRemoval(reaction.id, opts?.durationMs ?? 3000);
  };

  const updateHandRaiseState = (userId: number, raised: boolean) => {
    setRaisedHands(prev => {
      const next = new Set(prev);
      if (raised) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleIncomingReaction = (reaction: Reaction) => {
    addReaction(reaction, { durationMs: 3000 });
  };

  const handleIncomingHandRaise = (userId: number, raised: boolean) => {
    if (userId === client.current.getCurrentUserInfo()?.userId) {
      // Sync local state if server echoes back
      setHandRaised(raised);
    }
    updateHandRaiseState(userId, raised);
  };

  const sendReaction = (emoji: string) => {
    const currentUser = client.current.getCurrentUserInfo();
    const reaction: Reaction = {
      userId: currentUser?.userId || 0,
      emoji,
      id: `${currentUser?.userId || "self"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    
    addReaction(reaction);
    
    try {
      const cmdChannel = (client.current as any).getCommandClient?.();
      cmdChannel?.send?.(JSON.stringify({ type: 'reaction', data: reaction }));
    } catch (e) {
      console.log("Reaction broadcast not available");
    }
  };

  const toggleHandRaise = (toast: any) => {
    const currentUserId = client.current.getCurrentUserInfo()?.userId;
    const newState = !handRaised;
    setHandRaised(newState);
    
    if (currentUserId) {
      updateHandRaiseState(currentUserId, newState);
      
      try {
        const cmdChannel = (client.current as any).getCommandClient?.();
        cmdChannel?.send?.(JSON.stringify({ type: 'handRaise', userId: currentUserId, raised: newState }));
      } catch (e) {
        console.log("Hand raise broadcast not available");
      }
    }
    
    toast({
      title: newState ? "Hand raised" : "Hand lowered",
      description: newState ? "The host will be notified" : "Your hand has been lowered",
    });
  };

  return {
    reactions,
    setReactions,
    handRaised,
    setHandRaised,
    raisedHands,
    setRaisedHands,
    sendReaction,
    toggleHandRaise,
    handleIncomingReaction,
    handleIncomingHandRaise,
  };
};

