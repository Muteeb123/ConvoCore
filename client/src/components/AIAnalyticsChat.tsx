import React, { useState } from "react";

const AIAnalyticsChat: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/ai-analytics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to fetch AI analytics" }));
        throw new Error(errorData.error || "Failed to fetch AI analytics");
      }

      const data = await res.json();
      setResponse(data.aiResponse || data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading && prompt.trim()) {
      handleAsk();
    }
  };

  return (
    <div className="w-full p-6 bg-gradient-to-br from-white to-gray-50 shadow-2xl rounded-2xl mt-10 border border-gray-200">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
          <span className="text-3xl">📊</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          AI Analytics Assistant
        </h2>
        <p className="text-gray-600 text-sm">
          Ask questions about your CRM data and get instant insights
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Try: 'Show me all unqualified leads' or 'Top 5 customers by revenue'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="w-full px-5 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 placeholder-gray-400"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        <button
          onClick={handleAsk}
          disabled={loading || !prompt.trim()}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analyzing...
            </span>
          ) : (
            "Ask"
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {response && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="bg-white rounded-xl p-6 shadow-inner border border-gray-100">
            <div className="ai-response-content">
              <style>{`
                .ai-response-content {
                  color: #374151;
                  line-height: 1.7;
                }
                .ai-response-content p {
                  margin: 1rem 0;
                  line-height: 1.7;
                  color: #374151;
                }
                .ai-response-content table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1.5rem 0;
                  font-size: 0.9rem;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  border-radius: 8px;
                  overflow: hidden;
                }
                .ai-response-content thead {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                }
                .ai-response-content th {
                  padding: 0.75rem 1rem;
                  text-align: left;
                  font-weight: 600;
                  text-transform: uppercase;
                  font-size: 0.75rem;
                  letter-spacing: 0.05em;
                }
                .ai-response-content td {
                  padding: 0.75rem 1rem;
                  border-bottom: 1px solid #e5e7eb;
                }
                .ai-response-content tbody tr:hover {
                  background-color: #f9fafb;
                }
                .ai-response-content tbody tr:last-child td {
                  border-bottom: none;
                }
                .ai-response-content ul, .ai-response-content ol {
                  margin: 1rem 0;
                  padding-left: 1.5rem;
                }
                .ai-response-content li {
                  margin: 0.5rem 0;
                }
                .ai-response-content strong, .ai-response-content b {
                  color: #1f2937;
                  font-weight: 600;
                }
                .ai-response-content h1, .ai-response-content h2, .ai-response-content h3 {
                  color: #111827;
                  font-weight: 700;
                  margin-top: 1.5rem;
                  margin-bottom: 1rem;
                }
                .ai-response-content h1 {
                  font-size: 1.5rem;
                }
                .ai-response-content h2 {
                  font-size: 1.25rem;
                }
                .ai-response-content h3 {
                  font-size: 1.125rem;
                }
              `}</style>
              <div
                dangerouslySetInnerHTML={{ __html: response }}
                className="overflow-x-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsChat;
