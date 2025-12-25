import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import logo from './spur-logo.png';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

// 💡 NEW: Define the Quick Start Questions
const QUICK_QUESTIONS = [
  "📦 What is your return policy?",
  "🇮🇳 Do you ship to India?",
  "🚚 How long does shipping take?",
  "🕒 What are your support hours?"
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from LocalStorage, default to null if missing
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem('chatSessionId');
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load history if we have a session ID on startup
  useEffect(() => {
    if (sessionId) fetchHistory(sessionId);
  }, [sessionId]);

  const fetchHistory = async (id: string) => {
    try {
      const response = await axios.get(`http://localhost:3000/chat/history/${id}`);
      const history = response.data.messages.map((msg: any) => ({
        id: msg.id.toString(),
        sender: msg.sender,
        text: msg.text
      }));
      setMessages(history);
    } catch (error) {
      console.error("History fetch failed. Starting fresh.");
      localStorage.removeItem('chatSessionId');
      setSessionId(null);
    }
  };

  // --- ROBUST SEND MESSAGE FUNCTION ---
  // 🔄 UPDATED: Now accepts an optional 'textOverride' so buttons can trigger it
  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;

    // Prevent empty or duplicate sends
    if (!textToSend.trim() || isLoading) return;
    if (textToSend.length > 500) return alert("Message too long");

    // Clear input if it came from the text box
    if (!textOverride) setInput('');

    // 1. Optimistically add User Message
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      // 2. CHECK: Is the user actually online?
      if (!navigator.onLine) {
        throw new Error("OFFLINE");
      }

      console.log("Sending Message with SessionID:", sessionId);

      const response = await axios.post('http://localhost:3000/chat/message', {
        message: textToSend,
        sessionId: sessionId
      });

      // 3. Update Session ID if it changed or was null
      if (response.data.sessionId) {
        console.log("Received SessionID:", response.data.sessionId);
        setSessionId(response.data.sessionId);
        localStorage.setItem('chatSessionId', response.data.sessionId);
      }

      // 4. Add Real AI Response
      const aiMessage: Message = {
        id: Date.now().toString() + '_ai',
        sender: 'ai',
        text: response.data.reply
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error("Message sending failed:", error);

      // 5. GRACEFUL ERROR HANDLING LOGIC
      let errorMessage = "I'm having trouble connecting right now. Please try again.";

      // Handle Axios specific errors + explicit Offline check
      if (error.message === "OFFLINE" || !navigator.onLine) {
        errorMessage = "⚠️ It looks like you are offline. Please check your internet connection and try again.";
      } else if (error.code === "ERR_NETWORK") {
        // Axios throws ERR_NETWORK if it can't reach the server
        errorMessage = "⚠️ I cannot reach the server. Please ensure the backend is running.";
      } else if (error.response && error.response.status >= 500) {
        errorMessage = "⚠️ Our system is experiencing a temporary issue. Please try again later.";
      }

      const errorMsgObject: Message = {
        id: Date.now().toString() + '_error',
        sender: 'ai',
        text: errorMessage
      };
      setMessages(prev => [...prev, errorMsgObject]);

    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    localStorage.removeItem('chatSessionId');
    setSessionId(null);
    setMessages([]);
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="brand-header">
          <img src={logo} alt="Spur Logo" className="brand-logo" />
          <h1>Spur Bot</h1>
        </div>
        <div className="header-actions">
          <button onClick={clearChat} title="Start New Chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="messages-list">
        {/* 💡 EMPTY STATE: Show Logo + Quick Questions */}
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-content">
              <img src={logo} className="empty-logo" alt="Spur Logo" />
              <h3>How can I help you today?</h3>
              <p>Select a common question to get started:</p>

              <div className="quick-questions-grid">
                {QUICK_QUESTIONS.map((q, index) => (
                  <button
                    key={index}
                    className="quick-question-btn"
                    onClick={() => sendMessage(q)} // Instant Send
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Normal Message Rendering */}
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
            <div
              className={`avatar ${msg.sender}`}
              style={msg.sender === 'ai' ? { backgroundImage: `url(${logo})` } : {}}
            ></div>
            <div className="message-content">
              {msg.sender === 'ai' ? (
                <div className="message-card">
                  <div className="ai-card-header">
                    <span className="ai-icon"></span> Support Assistant
                  </div>
                  <div className="ai-card-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="message-bubble">
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper ai">
            {/* 1. The Avatar */}
            <div
              className="avatar ai"
              style={{ backgroundImage: `url(${logo})` }}
            ></div>

            {/* 2. The Bubble with Animation */}
            <div className="message-content">
              <div className="message-bubble" style={{ background: '#f1f5f9', width: 'fit-content' }}>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your question..."
          disabled={isLoading}
        />
        <button className="send-btn" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
          Send
        </button>
      </div>

      {/* Footer: Session ID */}
      <div style={{
        padding: '12px',
        fontSize: '0.85rem',
        color: '#475569',
        textAlign: 'center',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        fontFamily: 'monospace'
      }}>
        <span style={{ fontWeight: 600, color: '#2563eb' }}>Session ID:</span> {sessionId || "New Session"}
      </div>

    </div>
  );
}

export default App;