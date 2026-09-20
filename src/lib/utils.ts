import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // base64
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  files?: UploadedFile[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export function truncateTitle(text: string, maxLen = 40): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export function groupConversationsByDate(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = Date.now();
  const ONE_DAY = 86_400_000;
  const groups: Record<string, Conversation[]> = {
    'Hôm nay': [],
    'Hôm qua': [],
    '7 ngày trước': [],
    '30 ngày trước': [],
    'Cũ hơn': [],
  };

  for (const c of convs) {
    const diff = now - c.updatedAt;
    if (diff < ONE_DAY) groups['Hôm nay'].push(c);
    else if (diff < 2 * ONE_DAY) groups['Hôm qua'].push(c);
    else if (diff < 7 * ONE_DAY) groups['7 ngày trước'].push(c);
    else if (diff < 30 * ONE_DAY) groups['30 ngày trước'].push(c);
    else groups['Cũ hơn'].push(c);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
