# 🌟 Bảo Dev — AI Tools & API Platform

> **Nền tảng AI và API dành cho developer — đơn giản, nhanh chóng và dễ tích hợp.**
> Bảo mật chuẩn Google OAuth 2.0, cấp phát API Key tức thì và hỗ trợ sẵn SDK phổ biến.

---

## 📑 Mục lục
1. [Giới thiệu](#-giới-thiệu)
2. [Tính năng nổi bật](#-tính-năng-nổi-bật)
3. [Tech Stack](#-tech-stack)
4. [Kiến trúc Bảo mật](#-kiến-trúc-bảo-mật)
5. [Hướng dẫn cài đặt và chạy Local](#-hướng-dẫn-cài-đặt-và-chạy-local)
   - [Bước 1: Cài đặt Dependencies](#bước-1-cài-đặt-dependencies)
   - [Bước 2: Tạo Google OAuth Credentials](#bước-2-tạo-google-oauth-credentials)
   - [Bước 3: Cấu hình Database (PostgreSQL / Supabase)](#bước-3-cấu-hình-database-postgresql--supabase)
   - [Bước 4: Cấu hình File Môi trường `.env`](#bước-4-cấu-hình-file-môi-trường-env)
   - [Bước 5: Khởi tạo Database Schema](#bước-5-khởi-tạo-database-schema)
   - [Bước 6: Chạy Development Server](#bước-6-chạy-development-server)
6. [Hướng dẫn Deploy lên Vercel](#-hướng-dẫn-deploy-lên-vercel)
7. [API Reference & SDK Guide](#-api-reference--sdk-guide)

---

## 🚀 Giới thiệu

**Bảo Dev** là nền tảng cung cấp API và AI Gateway thông minh, cho phép các lập trình viên:
- Đăng nhập an toàn tuyệt đối bằng **Google OAuth 2.0 chính thức** (không bao giờ lưu hoặc yêu cầu mật khẩu).
- Quản lý các khóa **API Key** được mã hóa bằng thuật toán băm **SHA-256**.
- Hiển thị secret key một lần duy nhất khi tạo (One-time Reveal) để đảm bảo bảo mật.
- Gọi các Endpoint chuẩn RESTful `/api/v1/chat` và `/api/v1/models` với HTTP Header `Authorization: Bearer <API_KEY>`.
- Tra cứu tài liệu tích hợp đầy đủ mã nguồn cho cURL, Node.js (JavaScript/TypeScript) và Python.

---

## ⚡ Tính năng nổi bật

- **Landing Page Hiện Đại**: Thiết kế phong cách Dark Developer/AI, giao diện Glassmorphism mượt mà, responsive 100% trên PC, máy tính bảng và mobile.
- **Xác thực Google OAuth 2.0**: Luồng đăng nhập chính chủ từ Google, tự động đồng bộ hồ sơ người dùng vào cơ sở dữ liệu.
- **Bảo mật API Key Đa lớp**:
  - Key được tạo với tiền tố nhận dạng `bd_live_...` và chuỗi entropy ngẫu nhiên 24 bytes.
  - Cơ sở dữ liệu chỉ lưu trữ bản băm **SHA-256** (`keyHash`), hoàn toàn không lưu trữ plaintext.
  - Chức năng **Revoke** (thu hồi tức thì) và **Delete** (xóa vĩnh viễn) có hộp thoại xác nhận an toàn.
  - Kiểm tra quyền sở hữu (*Server-side ownership verification*) ngăn chặn triệt để tấn công IDOR.
- **API Endpoint Chuẩn Hóa**:
  - Endpoint `/api/v1/chat`: Sinh phản hồi AI, kiểm tra rate limit và tính toán token tiêu thụ.
  - Endpoint `/api/v1/models`: Danh sách các mô hình AI khả dụng.
  - Chuẩn định dạng JSON với mã theo dõi `requestId` duy nhất cho mọi request.
- **Route Protection**: Middleware bảo vệ toàn diện các trang `/dashboard/*`, tự động chuyển hướng người dùng chưa đăng nhập về `/login`.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components & Server Actions)
- **Ngôn ngữ**: TypeScript
- **Styling**: Tailwind CSS, Glassmorphism, Lucide Icons
- **Authentication**: Auth.js / NextAuth v5 (Google OAuth Provider)
- **Database & ORM**: PostgreSQL (Supabase / Neon / Vercel Postgres / Railway) + Prisma ORM
- **AI Integration**: Google GenAI SDK (`@google/genai`)

---

## 🔒 Kiến trúc Bảo mật

1. **Google OAuth 2.0 Official**: Tuyệt đối không thu thập mật khẩu Google, cookie hay access token thủ công. Website chỉ nhận hồ sơ công khai (ID, email, tên, avatar) sau khi Google xác thực thành công.
2. **One-Time Key Display**: API Key thô chỉ hiển thị duy nhất 1 lần khi người dùng bấm tạo. Khi đóng cửa sổ, người dùng chỉ nhìn thấy tiền tố (ví dụ: `bd_live_7a8b...1f90`).
3. **Mã hóa SHA-256**: Mọi thao tác xác thực API đều lấy Bearer token gửi lên, băm bằng `crypto.createHash('sha256')` rồi so khớp với `keyHash` trong database.
4. **Server-Side Authorization**: Mọi thao tác truy xuất hoặc thu hồi API Key đều lấy định danh từ `auth()` session ở server, không tin cậy bất kỳ tham số `userId` nào từ client.
5. **Rate Limiting**: Giới hạn 60 requests/phút cho mỗi API Key nhằm bảo vệ hạ tầng khỏi lạm dụng và DDoS.

---

## 💻 Hướng dẫn cài đặt và chạy Local

### Bước 1: Cài đặt Dependencies
Mở terminal trong thư mục dự án:
```bash
npm install --legacy-peer-deps
```

### Bước 2: Tạo Google OAuth Credentials
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một Project mới (hoặc chọn project hiện có).
3. Vào mục **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
4. Chọn Application type là **Web application**.
5. Đặt tên: `Bảo Dev Local`.
6. Tại mục **Authorized redirect URIs**, thêm:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Nhấn **Create** và sao chép **Client ID** và **Client Secret**.

### Bước 3: Cấu hình Database (PostgreSQL / Supabase)
Bạn có thể sử dụng cơ sở dữ liệu PostgreSQL miễn phí từ [Supabase](https://supabase.com/) hoặc [Neon](https://neon.tech/):
1. Tạo một Database mới trên Supabase hoặc Neon.
2. Sao chép chuỗi kết nối **Connection String** (Transaction pooler hoặc Direct connection).

### Bước 4: Cấu hình File Môi trường `.env`
Tạo file `.env` tại thư mục gốc của dự án:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require"

AUTH_SECRET="tao_chuoi_bi_mat_32_ky_tu_ngau_nhien_tai_day"
NEXTAUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"

# (Tùy chọn) Gemini API Key nếu muốn AI sinh nội dung thực tế
GEMINI_API_KEY=""
```

### Bước 5: Khởi tạo Database Schema
Đồng bộ cấu trúc bảng `users` và `api_keys` vào database của bạn:
```bash
npx prisma db push
```
*(Nếu muốn xem dữ liệu qua giao diện trực quan, bạn có thể chạy `npx prisma studio`)*

### Bước 6: Chạy Development Server
```bash
npm run dev
```
Mở trình duyệt và truy cập `http://localhost:3000` để trải nghiệm nền tảng **Bảo Dev**!

---

## 🌐 Hướng dẫn Deploy lên Vercel

1. Đẩy mã nguồn lên kho lưu trữ GitHub của bạn.
2. Truy cập [Vercel](https://vercel.com/) và import repository vừa tạo.
3. Trong phần **Environment Variables**, thêm các biến sau:
   - `DATABASE_URL`: Chuỗi kết nối PostgreSQL (Supabase / Neon / Vercel Postgres).
   - `AUTH_SECRET`: Chuỗi bí mật 32 ký tự.
   - `NEXTAUTH_URL`: Domain Vercel của bạn (ví dụ: `https://baodev.vercel.app`).
   - `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
   - `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.
   - `GEMINI_API_KEY`: (Tùy chọn).
4. Nhấn **Deploy**.
5. **Cập nhật Redirect URI trên Google Cloud Console**:
   - Truy cập lại [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Mở OAuth 2.0 Client ID bạn đã tạo.
   - Thêm Redirect URI chính thức của domain Vercel:
     ```
     https://<YOUR-PROJECT-NAME>.vercel.app/api/auth/callback/google
     ```
   - Nhấn **Save**.

---

## 📡 API Reference & SDK Guide

### Endpoint: `POST /api/v1/chat`

#### Headers
| Header | Giá trị |
| :--- | :--- |
| `Authorization` | `Bearer bd_live_...` |
| `Content-Type` | `application/json` |

#### Request Body
```json
{
  "prompt": "Viết hàm phân trang bằng TypeScript",
  "model": "bao-dev-gpt-flash"
}
```

#### Response Thành Công (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "chatcmpl_1740001890",
    "object": "chat.completion",
    "model": "bao-dev-gpt-flash",
    "message": {
      "role": "assistant",
      "content": "Đây là câu trả lời từ Bảo Dev AI..."
    },
    "usage": {
      "promptTokens": 12,
      "completionTokens": 45,
      "totalTokens": 57
    }
  },
  "requestId": "req_8a9bc_1740001890"
}
```

#### Response Lỗi (HTTP 401/403)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key or key does not exist"
  }
}
```

---

## 📄 Bản quyền

© 2026 **Bảo Dev**. All rights reserved.
