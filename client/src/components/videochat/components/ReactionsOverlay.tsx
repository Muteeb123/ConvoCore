import { Reaction } from "../types";

interface ReactionsOverlayProps {
  reactions: Reaction[];
}

export const ReactionsOverlay = ({ reactions }: ReactionsOverlayProps) => {
  return (
    <>
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="fixed bottom-32 left-1/2 transform -translate-x-1/2 text-6xl animate-bounce pointer-events-none z-50"
          style={{
            animation: "bounce 3s ease-out forwards",
            opacity: 0.9,
          }}
        >
          {reaction.emoji}
        </div>
      ))}
    </>
  );
};

