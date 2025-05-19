import React, { useState } from 'react';

const MCP_API = 'http://localhost:4001/mcp/generate-story';

const ChroniclePanel: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyInfo, setStoryInfo] = useState<{ title: string; outPath: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPreview(null);
    setStoryInfo(null);
    try {
      const res = await fetch(MCP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Story generation failed');
      setStoryInfo({ title: data.title, outPath: data.outPath });
      // Read the generated HTML from the file path (not possible from browser), so show a message instead
      setPreview(`Story generated: <strong>${data.title}</strong><br/><code>${data.outPath}</code>`);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, background: '#181818', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h2 style={{ color: '#fff' }}>Chronicle: AI Story Generator</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your UI (e.g. Build a login form...)"
          style={{
            width: '80%',
            marginRight: 8,
            padding: '10px 12px',
            borderRadius: 4,
            border: '1px solid #ccc',
            fontSize: 16,
            color: '#222',
            background: '#fff',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={loading || !prompt}
          style={{
            padding: '10px 18px',
            borderRadius: 4,
            border: 'none',
            background: loading || !prompt ? '#aaa' : '#007bff',
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
            cursor: loading || !prompt ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>
      <div>
        <h4 style={{ color: '#fff' }}>Result</h4>
        <div style={{ background: '#f9f9f9', padding: 16, minHeight: 80, borderRadius: 4, color: '#222', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: 12, right: 16, display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 8, color: '#007bff' }}>Loading</span>
              <span style={{
                width: 18,
                height: 18,
                border: '3px solid #007bff',
                borderTop: '3px solid #f9f9f9',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
              }} />
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          {!loading && (error ? (
            <span style={{ color: 'red' }}>{error}</span>
          ) : storyInfo ? (
            <div style={{ color: '#155724', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 4, padding: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Story generated:</strong> {storyInfo.title}<br/>
                <code>{storyInfo.outPath}</code>
              </div>
              <em>Check the "Chronicle" section in Storybook for your new story.</em>
            </div>
          ) : (
            <span style={{ color: '#222' }}>No story generated yet.</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChroniclePanel;
