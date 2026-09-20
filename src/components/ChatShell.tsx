'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, MessageSquare, Trash2, ChevronDown,
  SendHorizontal, Sparkles, Square, Menu, X,
  Paperclip, FileText, RotateCw, ExternalLink, Eye,
  Wand2, Upload, FileCode, Check
} from 'lucide-react';
import { cn, generateId, truncateTitle, groupConversationsByDate } from '@/lib/utils';
import type { Conversation, ChatMessage, UploadedFile } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';

export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  content: string;
  fileName: string;
  createdAt: number;
}

const MODELS = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

const STORAGE_KEY = 'baodevai_conversations';
const SKILLS_STORAGE_KEY = 'baodevai_uploaded_skills';

const VALID_MODEL_IDS = new Set(MODELS.map((m) => m.id));
const FALLBACK_MODEL = MODELS[0].id;

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: Conversation[] = JSON.parse(raw);
    return parsed.map((c) => ({
      ...c,
      model: VALID_MODEL_IDS.has(c.model) ? c.model : FALLBACK_MODEL,
    }));
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

function loadCustomSkills(): CustomSkill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SKILLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomSkills(skills: CustomSkill[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skills));
}

export function ChatShell() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS[0].id);
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [viewingSkill, setViewingSkill] = useState<CustomSkill | null>(null);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skillFileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    setConversations(loadConversations());
    setCustomSkills(loadCustomSkills());
  }, []);

  const activeConv = conversations.find((c) => c.id === activeId) || null;
  const activeSkill = customSkills.find((s) => s.id === activeSkillId) || null;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const createNewChat = useCallback(() => {
    setActiveId(null);
    setInput('');
    setAttachedFiles([]);
    setSidebarOpen(false);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    scrollToBottom();
  }, [scrollToBottom]);

  const deleteConversation = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(updated);
      return updated;
    });
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Upload file for chat context (images, code files, etc.)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'text/plain',
            data: base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Upload Skill File (.md, .txt, .json, .prompt)
  const handleSkillFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        let name = file.name.replace(/\.[^/.]+$/, '');
        let description = `Kỹ năng tải lên từ ${file.name}`;
        let content = text;

        // Parse optional YAML frontmatter: --- name: ... description: ... ---
        const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (fmMatch) {
          const fm = fmMatch[1];
          content = fmMatch[2].trim();
          const nameMatch = fm.match(/name:\s*["']?([^"'\r\n]+)["']?/i);
          const descMatch = fm.match(/description:\s*["']?([^"'\r\n]+)["']?/i);
          if (nameMatch) name = nameMatch[1].trim();
          if (descMatch) description = descMatch[1].trim();
        }

        const newSkill: CustomSkill = {
          id: generateId(),
          name,
          description,
          content,
          fileName: file.name,
          createdAt: Date.now(),
        };

        setCustomSkills((prev) => {
          const updated = [newSkill, ...prev];
          saveCustomSkills(updated);
          return updated;
        });

        // Automatically activate the newly uploaded skill
        setActiveSkillId(newSkill.id);
      };
      reader.readAsText(file);
    });

    e.target.value = '';
    setShowSkillMenu(false);
  };

  const deleteSkill = (skillId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomSkills((prev) => {
      const updated = prev.filter((s) => s.id !== skillId);
      saveCustomSkills(updated);
      return updated;
    });
    if (activeSkillId === skillId) {
      setActiveSkillId(null);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = useCallback(async () => {
    const text = inputRef.current.trim();
    if ((!text && attachedFiles.length === 0) || streaming) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
      files: attachedFiles.length > 0 ? attachedFiles : undefined,
    };
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    let convId = activeId;
    let currentConvs = conversations;

    if (!convId) {
      convId = generateId();
      const newConv: Conversation = {
        id: convId,
        title: truncateTitle(text || (attachedFiles[0]?.name ?? 'Cuộc trò chuyện mới')),
        messages: [userMsg, assistantMsg],
        model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      currentConvs = [newConv, ...conversations];
      setConversations(currentConvs);
      setActiveId(convId);
    } else {
      currentConvs = conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMsg, assistantMsg], updatedAt: Date.now() }
          : c
      );
      setConversations(currentConvs);
    }

    setInput('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setStreaming(true);
    scrollToBottom();

    const messagesToSend = [
      ...(currentConvs.find((c) => c.id === convId)?.messages.slice(0, -1) || []),
    ].map((m) => ({
      role: m.role,
      content: m.content,
      files: m.files,
    }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          model,
          customSkillPrompt: activeSkill?.content,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Lỗi kết nối' }));
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: `❌ ${err.error}` } : m
                  ),
                }
              : c
          );
          saveConversations(updated);
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        const finalText = fullText;
        const finalConvId = convId;
        const finalAssistantId = assistantMsg.id;

        setConversations((prev) => {
          return prev.map((c) =>
            c.id === finalConvId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === finalAssistantId ? { ...m, content: finalText } : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          );
        });
        scrollToBottom();
      }

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: fullText } : m
                ),
                updatedAt: Date.now(),
              }
            : c
        );
        saveConversations(updated);
        return updated;
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: '❌ Đã xảy ra lỗi.' } : m
                  ),
                }
              : c
          );
          saveConversations(updated);
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }, [activeId, conversations, model, activeSkill, streaming, attachedFiles, scrollToBottom]);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const grouped = groupConversationsByDate(conversations);
  const modelLabel = MODELS.find((m) => m.id === model)?.label || model;
  const messages = activeConv?.messages || [];

  const openPreviewInNewTab = () => {
    if (!previewCode) return;
    const blob = new Blob([previewCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const Sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo + New Chat */}
      <div className="p-3 space-y-1">
        <a href="/" className="flex items-center gap-2 px-2 py-2 mb-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">BaoDevAI</span>
        </a>
        <button
          onClick={createNewChat}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-all group cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Chat mới
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2">
        {grouped.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <MessageSquare className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Chưa có cuộc trò chuyện</p>
          </div>
        ) : (
          grouped.map(({ label, items }) => (
            <div key={label} className="mb-4">
              <div className="px-3 py-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</div>
              {items.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={cn(
                    'group flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-all cursor-pointer',
                    activeId === conv.id
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  )}
                >
                  <span className="flex-1 truncate text-sm">{conv.title}</span>
                  <span
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-left cursor-pointer"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#212121]">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={skillFileInputRef}
        onChange={handleSkillFileUpload}
        accept=".md,.txt,.json,.yaml,.yml,.prompt"
        className="hidden"
      />

      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-64 bg-[#171717] border-r border-white/5 flex-shrink-0">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-[#171717] border-r border-white/5 flex flex-col">
            {Sidebar}
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Selectors container */}
          <div className="flex items-center gap-2 mx-auto md:mx-0">
            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowModelMenu(!showModelMenu);
                  setShowSkillMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs sm:text-sm text-white transition-all border border-white/8 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {modelLabel}
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {showModelMenu && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-[#2f2f2f] border border-white/10 rounded-xl p-1 shadow-xl min-w-[180px]">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setModel(m.id); setShowModelMenu(false); }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left cursor-pointer',
                        model === m.id ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300 hover:bg-white/8'
                      )}
                    >
                      {m.label}
                      {model === m.id && <span className="ml-auto text-blue-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Uploaded Skills selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSkillMenu(!showSkillMenu);
                  setShowModelMenu(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all border cursor-pointer',
                  activeSkill
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/8'
                )}
                title="Quản lý & kích hoạt Skill bạn tải lên"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="max-w-[120px] sm:max-w-[160px] truncate">
                  {activeSkill ? activeSkill.name : 'Kỹ năng (Chưa bật)'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {showSkillMenu && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-[#2f2f2f] border border-white/10 rounded-xl p-2 shadow-2xl min-w-[300px]">
                  <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-white/8">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Skill của bạn ({customSkills.length})
                    </span>
                    <button
                      onClick={() => skillFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-[11px] transition-all cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      Tải lên
                    </button>
                  </div>

                  {/* Option: No skill */}
                  <button
                    onClick={() => {
                      setActiveSkillId(null);
                      setShowSkillMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left mb-1 cursor-pointer',
                      activeSkillId === null ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    )}
                  >
                    <span>Mặc định (Không dùng skill)</span>
                    {activeSkillId === null && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  {/* Uploaded skills list */}
                  {customSkills.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-white/10 rounded-xl my-1 bg-white/2">
                      <FileCode className="w-6 h-6 text-gray-500 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-300 font-medium mb-0.5">Chưa có skill nào được tải lên</p>
                      <p className="text-[11px] text-gray-500 mb-2">Tải file .md, .txt hoặc .json để AI làm theo quy tắc của bạn</p>
                      <button
                        onClick={() => skillFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Tải file Skill lên ngay
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto space-y-1">
                      {customSkills.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSkillId(s.id);
                            setShowSkillMenu(false);
                          }}
                          className={cn(
                            'group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all text-left cursor-pointer',
                            activeSkillId === s.id
                              ? 'bg-purple-600/30 text-purple-200 font-medium'
                              : 'text-gray-300 hover:bg-white/5'
                          )}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="truncate font-medium">{s.name}</div>
                            <div className="text-[10px] text-gray-500 truncate">{s.description}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingSkill(s);
                              }}
                              className="p-1 rounded text-gray-500 hover:text-blue-400 hover:bg-white/5 transition-all"
                              title="Xem nội dung skill"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => deleteSkill(s.id, e)}
                              className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all"
                              title="Xóa skill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {activeSkillId === s.id && (
                              <Check className="w-3.5 h-3.5 text-purple-400 ml-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Preview toggle indicator if preview is open */}
          {previewCode && (
            <button
              onClick={() => setPreviewCode(null)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs hover:bg-blue-500/20 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Đang mở Preview
            </button>
          )}

          <div className="w-10 md:hidden" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">BaoDevAI</h2>
              <p className="text-gray-400 text-sm mb-6">
                Trợ lý AI Gemini thông minh. Bạn có thể đính kèm file, tải lên file Skill tùy chỉnh hoặc yêu cầu tạo web để xem live preview.
              </p>

              {/* Upload Skill Quick Card */}
              <div className="w-full p-4 rounded-2xl border border-white/10 bg-white/3 text-left mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Tải lên file Kỹ năng (Skill) của bạn</h4>
                      <p className="text-[11px] text-gray-400">File SKILL.md, .txt hoặc .json chứa hướng dẫn để huấn luyện AI</p>
                    </div>
                  </div>
                  <button
                    onClick={() => skillFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all cursor-pointer flex-shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Tải file Skill
                  </button>
                </div>

                {customSkills.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-gray-500">Skill đã có:</span>
                    {customSkills.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSkillId(activeSkillId === s.id ? null : s.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border',
                          activeSkillId === s.id
                            ? 'bg-purple-600/30 text-purple-200 border-purple-500/40'
                            : 'bg-white/5 text-gray-400 border-white/8 hover:text-white'
                        )}
                      >
                        ⚡ {s.name} {activeSkillId === s.id && '✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-1">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
                  onPreview={(code) => setPreviewCode(code)}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            {/* Active Skill Indicator */}
            {activeSkill && (
              <div className="flex items-center justify-between px-3 py-1 mb-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300">
                <div className="flex items-center gap-1.5 truncate">
                  <Wand2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="font-semibold">Đang áp dụng Skill:</span>
                  <span className="truncate">{activeSkill.name}</span>
                </div>
                <button
                  onClick={() => setActiveSkillId(null)}
                  className="text-purple-400 hover:text-white transition-colors cursor-pointer text-[11px] ml-2 flex-shrink-0"
                >
                  Tắt skill ✕
                </button>
              </div>
            )}

            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2f2f2f] border border-white/10 text-xs text-gray-200"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      onClick={() => removeAttachedFile(idx)}
                      className="ml-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative bg-[#2f2f2f] rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
              <div className="flex items-end pl-3 pr-3 py-2">
                {/* File upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={streaming}
                  className="p-2 mb-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30"
                  title="Đính kèm file hoặc hình ảnh gửi cho AI"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    activeSkill
                      ? `Nhắn tin (theo quy tắc skill ${activeSkill.name})...`
                      : 'Nhắn tin hoặc gửi file cho BaoDevAI...'
                  }
                  rows={1}
                  disabled={streaming}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none leading-relaxed max-h-[200px] disabled:opacity-50"
                />

                <div className="mb-1">
                  {streaming ? (
                    <button
                      onClick={handleStop}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4 text-white" fill="white" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() && attachedFiles.length === 0}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <SendHorizontal className="w-4 h-4 text-black" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-gray-600 mt-2">
              BaoDevAI có thể mắc lỗi. Kiểm tra thông tin quan trọng.
            </p>
          </div>
        </div>
      </div>

      {/* Live Preview Panel on the right */}
      {previewCode && (
        <div className="w-full md:w-[480px] lg:w-[620px] bg-[#1e1e1e] border-l border-white/10 flex flex-col flex-shrink-0 z-40 transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 bg-[#252525]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Xem trước Web/App</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Tải lại preview"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={openPreviewInNewTab}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Mở trong tab mới"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewCode(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer"
                title="Đóng preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Iframe View */}
          <div className="flex-1 bg-white relative">
            <iframe
              key={previewKey}
              srcDoc={previewCode}
              title="Live Preview"
              sandbox="allow-scripts allow-modals allow-forms"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* View Skill Modal */}
      {viewingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-2xl bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4 border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white text-base">{viewingSkill.name}</h3>
                <span className="text-xs text-gray-500">({viewingSkill.fileName})</span>
              </div>
              <button
                onClick={() => setViewingSkill(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-3">{viewingSkill.description}</p>

            <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-[#141414] border border-white/8 text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
              {viewingSkill.content}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/8">
              <button
                onClick={() => {
                  setActiveSkillId(viewingSkill.id);
                  setViewingSkill(null);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all cursor-pointer"
              >
                Kích hoạt Skill này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
