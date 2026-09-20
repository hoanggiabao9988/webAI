import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = req.cookies.get('baodevai_key')?.value;
  if (!apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, model = 'gemini-3.6-flash', customSkillPrompt } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  // Convert messages to Gemini format with file support
  const contents = messages.map(
    (m: {
      role: string;
      content: string;
      files?: { name: string; type: string; data: string }[];
    }) => {
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (m.files && Array.isArray(m.files)) {
        for (const f of m.files) {
          const base64Data = f.data.includes(';base64,')
            ? f.data.split(';base64,')[1]
            : f.data;
          const mimeType = f.type || 'application/octet-stream';

          // For plain text / code files, decode into text prompt
          if (
            mimeType.startsWith('text/') ||
            mimeType === 'application/json' ||
            mimeType === 'application/javascript' ||
            mimeType === 'application/typescript' ||
            f.name.endsWith('.html') ||
            f.name.endsWith('.css') ||
            f.name.endsWith('.js') ||
            f.name.endsWith('.ts') ||
            f.name.endsWith('.py') ||
            f.name.endsWith('.txt') ||
            f.name.endsWith('.json') ||
            f.name.endsWith('.md')
          ) {
            try {
              const decodedText = Buffer.from(base64Data, 'base64').toString('utf-8');
              parts.push({
                text: `[File đính kèm: ${f.name}]\n\`\`\`\n${decodedText}\n\`\`\``,
              });
            } catch {
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              });
            }
          } else {
            // Binary/image/PDF files
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        }
      }

      if (m.content) {
        parts.push({ text: m.content });
      }

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: parts.length > 0 ? parts : [{ text: ' ' }],
      };
    }
  );

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.85,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 65536,
    },
  };

  // If user uploaded a custom skill, inject its full instructions into systemInstruction
  if (customSkillPrompt && typeof customSkillPrompt === 'string' && customSkillPrompt.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: customSkillPrompt.trim() }],
    };
  }

  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch {
    return NextResponse.json({ error: 'Không thể kết nối Gemini API' }, { status: 502 });
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const err = await geminiRes.text().catch(() => '');
    let msg = 'Lỗi từ Gemini API';
    try {
      const parsed = JSON.parse(err);
      msg = parsed?.error?.message || msg;
    } catch {}
    return NextResponse.json({ error: msg }, { status: geminiRes.status });
  }

  // Stream SSE from Gemini → transform to plain text stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function processLine(line: string) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) return;
        const data = trimmed.slice(6).trim();
        if (!data || data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        } catch {
          // skip malformed JSON chunks
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            processLine(line);
          }
        }

        if (buffer.trim()) {
          processLine(buffer);
        }
      } catch {
        // Stream interrupted
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
