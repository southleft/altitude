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
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2>Chronicle: AI Story Generator</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your UI (e.g. Build a login form...)"
          style={{ width: '80%', marginRight: 8 }}
        />
        <button type="submit" disabled={loading || !prompt}>Generate</button>
      </form>
      <div>
        <h4>Result</h4>
        <div style={{ background: '#f9f9f9', padding: 16, minHeight: 80 }}>
          {loading ? 'Generating...'
            : error ? <span style={{ color: 'red' }}>{error}</span>
            : storyInfo ? (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Story generated:</strong> {storyInfo.title}<br/>
                    <code>{storyInfo.outPath}</code>
                  </div>
                  <em>Check the "Chronicle" section in Storybook for your new story.</em>
                </div>
              )
            : 'No story generated yet.'}
        </div>
      </div>
    </div>
  );
};

export default ChroniclePanel;
