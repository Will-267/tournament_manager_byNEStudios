
import { useState, useEffect, useRef } from "react";

interface ChatPanelProps {
  tournamentId: string;
}

export function ChatPanel({ tournamentId }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/chat`)
      .then(res => res.json())
      .then(setMessages);
  }, [tournamentId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const userName = localStorage.getItem("userName") || "Demo User";
      const userEmail = localStorage.getItem("userEmail") || "demo@user.com";
      const res = await fetch(`/api/tournaments/${tournamentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), userName, userEmail }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setMessage("");
      // Refetch messages
      fetch(`/api/tournaments/${tournamentId}/chat`)
        .then(res => res.json())
        .then(setMessages);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-96">
      <h3 className="text-lg font-semibold mb-4">Tournament Chat</h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg._id || msg.timestamp} className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">
                  {msg.userName}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div className="text-gray-700 text-sm bg-white p-2 rounded-lg shadow-sm">
                {msg.message}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <div className="text-2xl mb-2">💬</div>
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
