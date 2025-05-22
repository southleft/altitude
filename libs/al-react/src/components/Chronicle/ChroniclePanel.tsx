import React, { useState, useRef, useEffect } from 'react';

const MCP_API = 'http://localhost:4001/mcp/generate-story';
const LOCAL_STORAGE_KEY = 'chronicle_chat_history_v1';
const MAX_RECENT_CHATS = 20;

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ChatSession {
  id: string; // fileName or hash
  title: string;
  fileName: string;
  conversation: Message[];
  lastUpdated: number;
}

function loadChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

function saveChats(chats: ChatSession[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chats));
}

const ChroniclePanel: React.FC = () => {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load recent chats on mount
  useEffect(() => {
    const chats = loadChats();
    setRecentChats(chats.sort((a, b) => b.lastUpdated - a.lastUpdated).slice(0, MAX_RECENT_CHATS));
    if (chats.length > 0) {
      setConversation(chats[0].conversation);
      setActiveChatId(chats[0].id);
      setActiveTitle(chats[0].title);
    }
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setLoading(true);
    const newConversation = [...conversation, { role: 'user' as const, content: input }];
    setConversation(newConversation);
    setInput('');
    try {
      const res = await fetch(MCP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          conversation: newConversation,
          fileName: activeChatId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Story generation failed');
      const aiMsg = { role: 'ai' as const, content: data.story || `Story generated: ${data.title}\n${data.outPath}` };
      const updatedConversation = [...newConversation, aiMsg];
      setConversation(updatedConversation);
      // Save chat session
      const chatId = data.fileName || data.outPath || Date.now().toString();
      const chatTitle = data.title || input;
      setActiveChatId(chatId);
      setActiveTitle(chatTitle);
      const newSession: ChatSession = {
        id: chatId,
        title: chatTitle,
        fileName: data.fileName || '',
        conversation: updatedConversation,
        lastUpdated: Date.now(),
      };
      let chats = loadChats();
      chats = chats.filter(c => c.id !== chatId);
      chats.unshift(newSession);
      if (chats.length > MAX_RECENT_CHATS) chats = chats.slice(0, MAX_RECENT_CHATS);
      saveChats(chats);
      setRecentChats(chats);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setConversation(conv => [...conv, { role: 'ai' as const, content: `Error: ${err.message || 'Unknown error'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chat: ChatSession) => {
    setConversation(chat.conversation);
    setActiveChatId(chat.id);
    setActiveTitle(chat.title);
  };

  const handleNewChat = () => {
    setConversation([]);
    setActiveChatId(null);
    setActiveTitle('');
  };

  return (
    <div style={{ display: 'flex', height: 540, background: '#181818', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 210 : 44,
        background: '#15151a',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        borderRight: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            background: sidebarOpen ? '#007bff' : '#222',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            margin: 12,
            padding: sidebarOpen ? '6px 14px' : '6px 10px',
            fontWeight: 600,
            cursor: 'pointer',
            width: sidebarOpen ? 'auto' : 24,
            alignSelf: 'flex-start',
            transition: 'background 0.2s',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '☰ Chats' : '☰'}
        </button>
        {sidebarOpen && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px 8px' }}>
            <button
              onClick={handleNewChat}
              style={{
                width: '100%',
                padding: '8px 0',
                marginBottom: 8,
                borderRadius: 4,
                border: 'none',
                background: '#007bff',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 15,
              }}
            >
              + New Chat
            </button>
            {recentChats.length > 0 && <div style={{ color: '#aaa', fontSize: 13, marginBottom: 6 }}>Recent</div>}
            {recentChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 4,
                  border: chat.id === activeChatId ? '2px solid #007bff' : '1px solid #222',
                  background: chat.id === activeChatId ? '#e6f0ff' : '#23232a',
                  color: chat.id === activeChatId ? '#007bff' : '#fff',
                  fontWeight: chat.id === activeChatId ? 700 : 400,
                  fontSize: 14,
                  marginBottom: 4,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={chat.title}
              >
                {chat.title}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, maxWidth: 600 }}>
        <h2 style={{ color: '#fff', margin: '16px 0 8px 24px' }}>Chronicle: AI Story Generator</h2>
        <div style={{ flex: 1, overflowY: 'auto', background: '#222', borderRadius: 6, padding: 16, margin: '0 24px 12px 24px' }}>
          {conversation.length === 0 && (
            <div style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>
              <div>Start a conversation to generate a Storybook story.</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>
                (e.g. "Build a login form with two fields and a button")
              </div>
            </div>
          )}
          {conversation.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}>
              <div style={{
                background: msg.role === 'user' ? '#007bff' : '#f1f1f1',
                color: msg.role === 'user' ? '#fff' : '#222',
                borderRadius: 16,
                padding: '10px 16px',
                maxWidth: '80%',
                whiteSpace: 'pre-wrap',
                fontSize: 15,
                boxShadow: msg.role === 'user' ? '0 2px 8px rgba(0,123,255,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
              <div style={{ background: '#f1f1f1', color: '#222', borderRadius: 16, padding: '10px 16px', fontSize: 15 }}>
                Generating...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 24px 16px 24px' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe your UI or give feedback..."
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 4,
              border: '1px solid #ccc',
              fontSize: 16,
              color: '#222',
              background: '#fff',
              boxSizing: 'border-box',
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 18px',
              borderRadius: 4,
              border: 'none',
              background: loading || !input.trim() ? '#aaa' : '#007bff',
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? '...' : 'Send'}
          </button>
        </form>
        {error && <div style={{ color: 'red', margin: '0 24px 8px 24px' }}>{error}</div>}
      </div>
    </div>
  );
};

export default ChroniclePanel;
