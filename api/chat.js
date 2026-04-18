// ============================================
// /api/chat
// Streams Claude responses back to the client
// using Server-Sent Events (SSE).
// ============================================

import { SYSTEM_PROMPT } from './_system-prompt.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { messages, code } = await req.json();

    // Verify access code on every request — gate is enforced server-side
    const expectedCode = process.env.ACCESS_CODE;
    if (!expectedCode || typeof code !== 'string' || code.trim() !== expectedCode) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages required', { status: 400 });
    }

    // Filter messages to role/content only, just in case
    const cleanMessages = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || ''),
    }));

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response('Server not configured', { status: 500 });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: cleanMessages,
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return new Response(
        `data: ${JSON.stringify({ type: 'error', message: 'Upstream error' })}\n\n`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    // Transform Anthropic SSE stream into simpler client-facing SSE events
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;

              const payload = trimmed.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;

              try {
                const evt = JSON.parse(payload);

                // Anthropic sends content_block_delta events with text chunks
                if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                  const text = evt.delta.text || '';
                  if (text) {
                    const out = `data: ${JSON.stringify({ type: 'content', text })}\n\n`;
                    controller.enqueue(encoder.encode(out));
                  }
                }

                if (evt.type === 'message_stop') {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Handler error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
