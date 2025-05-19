import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { generateStory } from '../../story-generator/generateStory.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-opus-20240229';

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Claude API key not set');
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  // Try to extract the main content
  return data?.content?.[0]?.text || data?.completion || '';
}

function extractHtmlBlock(text: string): { html: string, title: string } {
  // Try to extract a code block with html or lit-html
  const codeBlock = text.match(/```(?:html|lit-html)?([\s\S]*?)```/i);
  const html = codeBlock ? codeBlock[1].trim() : text.trim();
  // Try to extract a title from the prompt or fallback
  const titleMatch = html.match(/<([a-z0-9-]+)/i);
  const title = titleMatch ? titleMatch[1].replace('al-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Chronicle Story';
  return { html, title };
}

export async function generateStoryFromPrompt(req: Request, res: Response) {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  try {
    const aiText = await callClaude(prompt);
    const { html, title } = extractHtmlBlock(aiText);
    const outPath = generateStory({ title, html });
    res.json({ success: true, title, outPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Story generation failed' });
  }
}
