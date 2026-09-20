'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, Eye, Download, FileText } from 'lucide-react';
import type { ChatMessage } from '@/lib/utils';

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
  onPreview?: (html: string) => void;
}

function CodeBlockComponent({
  language,
  code,
  onPreview,
}: {
  language: string;
  code: string;
  onPreview?: (html: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const lang = language || 'text';
  const isHtml = /^html?$/i.test(lang);
  const isPreviewable = isHtml || /^(css|svg)$/i.test(lang);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const ext =
      lang === 'javascript' || lang === 'js' ? 'js' :
      lang === 'typescript' || lang === 'ts' ? 'ts' :
      lang === 'python' || lang === 'py' ? 'py' :
      lang === 'html' ? 'html' :
      lang === 'css' ? 'css' :
      lang === 'json' ? 'json' :
      lang === 'jsx' ? 'jsx' :
      lang === 'tsx' ? 'tsx' :
      lang === 'java' ? 'java' :
      lang === 'c' ? 'c' :
      lang === 'cpp' ? 'cpp' :
      lang === 'go' ? 'go' :
      lang === 'rust' || lang === 'rs' ? 'rs' :
      lang === 'php' ? 'php' :
      lang === 'sql' ? 'sql' :
      lang === 'yaml' || lang === 'yml' ? 'yml' :
      lang === 'xml' ? 'xml' :
      lang === 'markdown' || lang === 'md' ? 'md' :
      lang === 'bash' || lang === 'sh' ? 'sh' :
      'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baodevai-code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(code);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-[#333] bg-[#1a1a1a] my-3 group/code">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252525] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[11px] font-mono text-gray-500 ml-1">{lang}</span>
        </div>
        <div className="flex items-center gap-1">
          {isPreviewable && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer"
              title="Xem trước"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
            title="Tải xuống"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Đã chép</span></>
            ) : (
              <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>
      <div className="p-3 overflow-x-auto text-[13px] font-mono text-gray-200 leading-relaxed">
        <pre className="!bg-transparent !border-none !p-0 !m-0"><code>{code}</code></pre>
      </div>
    </div>
  );
}

function UserFileBadge({ name, type }: { name: string; type: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/25 text-xs text-blue-300 mb-1">
      <FileText className="w-3 h-3" />
      <span className="truncate max-w-[150px]">{name}</span>
      <span className="text-blue-400/60 text-[10px]">({type})</span>
    </div>
  );
}

export function MessageBubble({ message, isStreaming, onPreview }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end mb-4 gap-1">
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {message.files.map((f, i) => (
              <UserFileBadge key={i} name={f.name} type={f.type} />
            ))}
          </div>
        )}
        <div className="max-w-[80%] bg-[#2f2f2f] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 text-sm text-gray-100 leading-relaxed pt-1">
        {message.content ? (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                code({ className, children, ...rest }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeStr = String(children).replace(/\n$/, '');
                  // If it's a fenced code block (has language class or multiline)
                  if (match || codeStr.includes('\n')) {
                    return (
                      <CodeBlockComponent
                        language={match?.[1] || 'text'}
                        code={codeStr}
                        onPreview={onPreview}
                      />
                    );
                  }
                  // Inline code
                  return <code className={className} {...rest}>{children}</code>;
                },
                pre({ children }) {
                  // Prevent double wrapping — CodeBlockComponent handles its own <pre>
                  return <>{children}</>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : null}
        {isStreaming && message.content && (
          <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}
