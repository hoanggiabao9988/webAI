import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-white">
      <h2 className="text-4xl font-bold mb-4">404 - Không tìm thấy trang</h2>
      <p className="text-slate-400 mb-6">Không thể tìm thấy tài nguyên bạn yêu cầu.</p>
      <Link href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg">
        Về trang chủ
      </Link>
    </div>
  );
}
