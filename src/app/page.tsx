import Link from 'next/link';
import { cookies } from 'next/headers';
import { Sparkles, MessageSquare, Zap, Lock } from 'lucide-react';

export default async function LandingPage() {
  const cookieStore = await cookies();
  const hasKey = !!cookieStore.get('baodevai_key')?.value;
  const ctaHref = hasKey ? '/chat' : '/login';

  return (
    <div className="min-h-screen bg-[#212121] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">BaoDevAI</span>
        </div>
        <Link
          href={ctaHref}
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          {hasKey ? 'Vào Chat →' : 'Bắt đầu'}
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Powered by Google Gemini API
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-none">
          BaoDevAI
        </h1>
        <p className="text-xl text-gray-400 max-w-xl mb-10 leading-relaxed">
          Trải nghiệm AI mạnh mẽ với Gemini. Dùng API key Google AI Studio của bạn — không cần đăng ký thêm.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={ctaHref}
            className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all text-sm"
          >
            {hasKey ? 'Tiếp tục chat →' : 'Bắt đầu miễn phí →'}
          </Link>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl border border-white/15 text-white font-medium hover:bg-white/5 transition-all text-sm"
          >
            Lấy API Key
          </a>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            { icon: MessageSquare, title: 'Chat thông minh', desc: 'Trò chuyện với Gemini 2.0 Flash & 1.5 Pro' },
            { icon: Zap, title: 'Streaming tức thì', desc: 'Phản hồi real-time, không chờ đợi' },
            { icon: Lock, title: 'Bảo mật API Key', desc: 'Key lưu httpOnly cookie, không lộ ra client' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-2xl border border-white/8 bg-white/3 text-left">
              <Icon className="w-5 h-5 text-blue-400 mb-3" />
              <div className="font-semibold text-white text-sm mb-1">{title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-600">
        © 2026 BaoDevAI
      </footer>
    </div>
  );
}
