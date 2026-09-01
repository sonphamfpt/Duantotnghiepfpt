# 🦷 HỆ THỐNG QUẢN LÝ PHÒNG KHÁM NHA KHOA GOODSMILE
### GoodSmile Dental Clinic Management System
> **Đồ án tốt nghiệp** – Chuyên ngành Lập trình Web / Công nghệ thông tin – FPT Polytechnic

---

## 📖 1. Giới thiệu tổng quan

**GoodSmile Dental Clinic** là nền tảng quản lý phòng khám nha khoa toàn diện (Fullstack Solution), giải quyết trọn vẹn luồng nghiệp vụ từ khâu đặt lịch trực tuyến, tiếp đón hàng chờ thời gian thực, khám và điều trị chuyên sâu trên sơ đồ răng (Interactive Dental Chart), đến quản lý thanh toán, tích điểm thành viên và báo cáo thống kê quản trị.

---

## 🛠️ 2. Kiến trúc & Công nghệ sử dụng

| Tầng | Công nghệ / Thư viện | Vai trò |
|---|---|---|
| **Frontend** | **React 19**, **TypeScript**, **Vite** | Single Page Application (SPA), render hiệu năng cao |
| **Giao diện** | **Tailwind CSS v4**, **React Icons** | Design system hiện đại, tương thích đa thiết bị |
| **Realtime** | **Socket.io Client** | Đồng bộ trạng thái hàng chờ màn hình TV phòng chờ |
| **Backend** | **Node.js**, **Express**, **TypeScript** | RESTful API, phân tầng Controller - Service - Route |
| **Database & ORM** | **PostgreSQL**, **Prisma ORM** | Cơ sở dữ liệu quan hệ, Schema migration & seeding |
| **Cache & Khóa** | **Redis** | Distributed Lock (chống đặt trùng lịch hẹn) & Caching |
| **Xác thực** | **JWT (JSON Web Token)**, **Bcrypt** | Bảo mật xác thực, phân quyền theo Role (RBAC) |
| **Thanh toán** | **VNPay Sandbox Gateway** | Tích hợp cổng thanh toán trực tuyến quét mã VNPAY-QR |

---

## 🌟 3. Các phân hệ chức năng chính

```
                                  ┌────────────────────────┐
                                  │   BỆNH NHÂN (PATIENT)  │
                                  │ Đặt lịch / Hồ sơ cá nhân│
                                  └───────────┬────────────┘
                                              │ Đặt lịch online
                                              ▼
┌───────────────────────┐         ┌────────────────────────┐         ┌────────────────────────┐
│ MÀN HÌNH TV PHÒNG CHỜ │ ◄───────┤   LỄ TÂN (RECEPTION)   ├────────►│  BÁC SĨ (CLINICAL)     │
│  Realtime Queue Board │ Socket  │ Check-in / Tiếp đón    │         │ Sơ đồ răng / Kê đơn    │
└───────────────────────┘         └────────────────────────┘         └───────────┬────────────┘
                                                                                 │ Tạo bệnh án
                                                                                 ▼
┌───────────────────────┐         ┌────────────────────────┐         ┌────────────────────────┐
│  QUẢN LÝ (MANAGER)    │         │   THU NGÂN (CASHIER)   │◄────────┤    HÓA ĐƠN & VÍ        │
│ Báo cáo / Ca trực     │         │ Thanh toán / VNPay / Ví│         │ Chiết khấu theo hạng   │
└───────────────────────┘         └────────────────────────┘         └────────────────────────┘
```

1. **Cổng thông tin & Bệnh nhân (`/patient`):**
   - Đặt lịch khám trực tuyến theo bác sĩ, ngày giờ, dịch vụ (có kiểm tra slot trống theo thời gian thực).
   - Tra cứu hồ sơ bệnh án, lịch sử điều trị, hình ảnh X-quang/đơn thuốc.
   - Quản lý ví điện tử nội bộ, nạp tiền trực tuyến qua VNPay, tích điểm nâng hạng thành viên (Standard, Gold, Platinum, Diamond).
   - Đánh giá chất lượng dịch vụ và phản hồi của phòng khám.

2. **Phân hệ Lễ tân & Tiếp đón (`/dashboard/receptionist`):**
   - Check-in bệnh nhân theo lịch hẹn hoặc khách vãng lai (Walk-in).
   - Cấp số thứ tự và điều phối bệnh nhân vào phòng khám.
   - Quản lý danh sách lịch hẹn trong ngày, tiếp nhận đổi lịch/hủy lịch.

3. **Màn hình hiển thị TV phòng chờ (`/queue-board`):**
   - Cập nhật thời gian thực (Realtime via Socket.io) danh sách bệnh nhân đang đợi và bệnh nhân đang trong ghế khám.

4. **Phân hệ Bác sĩ chuyên môn (`/dashboard/dentist`):**
   - Quản lý hàng đợi bệnh nhân tại phòng khám của bác sĩ.
   - **Sơ đồ răng tương tác (Interactive Dental Chart)**: Đánh dấu tình trạng từng vị trí răng (sâu răng, mất răng, bọc sứ, implant...).
   - Lập phác đồ điều trị nhiều giai đoạn (Treatment Plan), ghi chép bệnh án và kê đơn thuốc mẫu.

5. **Phân hệ Thu ngân & Kế toán (`/dashboard/cashier`):**
   - Tự động tiếp nhận hóa đơn phát sinh sau khi bác sĩ hoàn thành điều trị.
   - Tự động áp dụng giảm giá theo hạng thành viên và trừ tiền ví bệnh nhân (nếu có).
   - Hỗ trợ đa dạng phương thức: Tiền mặt, Thẻ POS, Chuyển khoản, Cổng thanh toán trực tuyến VNPay.

6. **Phân hệ Quản trị viên (`/dashboard/manager`):**
   - Báo cáo thống kê doanh thu phòng khám, số lượt khám, top dịch vụ bán chạy.
   - Quản lý phân ca trực bác sĩ theo tuần, hỗ trợ hoán đổi ca và chuyển giao ca trực tự động giải quyết xung đột lịch hẹn.
   - Quản lý danh mục dịch vụ, bảng giá, danh mục thuốc và nhật ký hệ thống (System Logs).

---

## 🔑 4. Danh sách tài khoản kiểm thử (Demo Test Accounts)

> 💡 **Mật khẩu mặc định cho TẤT CẢ các tài khoản kiểm thử:** `12345678`

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Đường dẫn truy cập | Ghi chú nhiệm vụ |
|---|---|---|---|---|
| 👑 **Quản trị viên (Manager)** | `manager@goodsmile.vn` | `12345678` | `/dashboard/manager` | Xem toàn quyền, doanh thu, ca trực |
| 👩‍💼 **Lễ tân (Receptionist)** | `receptionist@goodsmile.vn` | `12345678` | `/dashboard/receptionist` | Tiếp đón, check-in, hàng chờ |
| 👨‍⚕️ **Bác sĩ (Dentist)** | `nguyenhuong@goodsmile.vn` | `12345678` | `/dashboard/dentist` | Khám bệnh, sơ đồ răng, bệnh án |
| 👨‍⚕️ *Bác sĩ Lê Minh* | `leminh@goodsmile.vn` | `12345678` | `/dashboard/dentist` | Bác sĩ chỉnh nha |
| 👨‍⚕️ *Bác sĩ Hoàng Nam* | `hoangnam@goodsmile.vn` | `12345678` | `/dashboard/dentist` | Bác sĩ Implant |
| 💰 **Thu ngân (Cashier)** | `cashier@goodsmile.vn` | `12345678` | `/dashboard/cashier` | Thanh toán hóa đơn, nạp ví |
| 🧑 **Bệnh nhân (Patient)** | `benhnhan@goodsmile.vn` | `12345678` | `/patient` | Đặt lịch khám, xem hồ sơ, ví tiền |

---

## 💳 5. Thông tin thẻ Test thanh toán VNPay Sandbox

Khi thanh toán hóa đơn hoặc nạp tiền ví qua VNPay, quý Thầy/Cô sử dụng thông tin thẻ thử nghiệm sau:
* **Ngân hàng:** `NCB`
* **Số thẻ:** `97041985261714059`
* **Tên chủ thẻ:** `NGUYEN VAN A`
* **Ngày phát hành:** `07/15`
* **Mã OTP xác thực:** `123456`

*(Chi tiết xem thêm tại tài liệu: [Docs/VNPAY_DEMO_ACCOUNT.md](Docs/VNPAY_DEMO_ACCOUNT.md))*

---

## ⚡ 6. Hướng dẫn cài đặt & Khởi chạy dự án

### 📋 Yêu cầu môi trường
* **Node.js**: Phiên bản 20.x trở lên
* **PostgreSQL**: Phiên bản 15+ (hoặc chạy qua Docker)
* **Redis**: Phiên bản 7+ (hoặc chạy qua Docker)

---

### 🔹 BƯỚC 1: Cài đặt và chạy BACKEND

1. **Mở Terminal di chuyển vào thư mục backend:**
   ```bash
   cd backend
   ```

2. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```

3. **Cấu hình file môi trường `.env`:**
   * Tạo file `.env` từ file mẫu `.env.example`:
     ```bash
     cp .env.example .env
     ```
   * Kiểm tra thông tin kết nối PostgreSQL và Redis trong file `backend/.env`:
     ```ini
     PORT=5000
     DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goodsmile_clinic?schema=public"
     REDIS_URL="redis://localhost:6379"
     JWT_SECRET="supersecretjwtkey123!"
     ```
   *(Nếu dùng Docker Compose, bạn chỉ cần chạy: `docker compose up -d goodsmile-db goodsmile-cache`)*

4. **Khởi tạo cấu trúc Database & Nạp toàn bộ dữ liệu mẫu (Seed Data):**
   ```bash
   # Tạo bảng theo Prisma Schema
   npx prisma migrate dev --name init

   # Nạp toàn bộ dữ liệu mẫu (Tài khoản, bác sĩ, bệnh nhân, lịch hẹn, bảng giá...)
   npx prisma db seed
   ```

5. **Khởi chạy Backend Server:**
   ```bash
   npm run dev
   ```
   * REST API Server sẽ lắng nghe tại: `http://localhost:5000`

---

### 🔹 BƯỚC 2: Cài đặt và chạy FRONTEND

1. **Mở một cửa sổ Terminal mới tại thư mục gốc của dự án (`Nha khoa goodsmile`):**
   ```bash
   npm install
   ```

2. **Cấu hình file môi trường `.env` cho Frontend (nếu cần đổi cổng API):**
   ```bash
   cp .env.example .env
   ```
   * Mặc định: `VITE_API_BASE_URL=http://localhost:5000`

3. **Khởi chạy Frontend App:**
   ```bash
   npm run dev
   ```
   * Ứng dụng Web sẽ mở tại: `http://localhost:5173`

---

## 📁 7. Cấu trúc thư mục dự án

```
Nha khoa goodsmile/
├── Docs/                              # Tài liệu kỹ thuật & tài khoản thẻ VNPay demo
│   └── VNPAY_DEMO_ACCOUNT.md
├── backend/                           # Source code Backend (Node.js + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma              # 28 Prisma Models & quan hệ CSDL
│   │   ├── seed.ts                    # Script nạp dữ liệu mẫu tự động
│   │   ├── export-seed.ts             # Script xuất dữ liệu DB ra seed-data.json
│   │   └── seed-data.json             # File JSON chứa toàn bộ dữ liệu mẫu
│   ├── src/
│   │   ├── config/                    # Cấu hình Prisma, Redis, VNPay, Socket, Env
│   │   ├── middlewares/               # JWT AuthGuard, RoleGuard, ErrorHandler
│   │   ├── modules/                   # Các module nghiệp vụ (auth, appointments, queues, medical-records, invoices, shifts...)
│   │   └── server.ts                  # Entrypoint Express + Socket.io Server
│   ├── package.json
│   └── docker-compose.yml             # Docker PostgreSQL & Redis
├── src/                               # Source code Frontend (React 19 + TypeScript + Vite)
│   ├── components/                    # UI Components tái sử dụng (DentalChart, BookingModal...)
│   ├── context/                       # AuthContext (JWT) & ClinicContext (State & API calls)
│   ├── layouts/                       # MainLayout (Public) & DashboardLayout (Portal)
│   ├── pages/
│   │   ├── public/                    # Trang chủ, Đăng nhập, Đăng ký, Dịch vụ, Đội ngũ bác sĩ
│   │   ├── patient/                   # Cổng thông tin cá nhân của bệnh nhân
│   │   ├── staff/                     # Các Dashboard riêng biệt: Lễ tân, Bác sĩ, Thu ngân, Quản lý
│   │   └── queue-tracking/            # Màn hình hiển thị TV phòng chờ (/queue-board)
│   ├── services/                      # Axios/Fetch API client kết nối Backend
│   └── types/                         # TypeScript Type definitions
├── package.json
├── tailwind.config.js
└── README.md
```

---

## 🎓 8. Kịch bản đề xuất khi Thuyết trình & Báo cáo Demo

Quý Thầy/Cô và Hội đồng có thể trải nghiệm toàn bộ chu trình khám chữa bệnh thực tế theo các bước:

1. **Khách hàng đặt lịch khám:** Vào trang chủ `http://localhost:5173/` -> Chọn mục **Đặt lịch** -> Chọn Bác sĩ **Nguyễn Hương** -> Chọn dịch vụ -> Chọn khung giờ trống -> Xác nhận đặt lịch.
2. **Lễ tân tiếp đón & Check-in:** Đăng nhập `receptionist@goodsmile.vn` -> Vào tab **Hàng chờ hôm nay** -> Bấm **Check-in** cho bệnh nhân vừa đặt lịch.
3. **Màn hình TV phòng chờ:** Mở trang `http://localhost:5173/queue-board` -> Quan sát số thứ tự bệnh nhân vừa được đưa vào danh sách **Đang chờ khám**.
4. **Bác sĩ khám & Điều trị:** Đăng nhập `nguyenhuong@goodsmile.vn` -> Nhấn **Bắt đầu khám** -> Thao tác chẩn đoán trên **Sơ đồ răng (Dental Chart)** -> Kê đơn thuốc -> Bấm **Hoàn thành điều trị**.
5. **Thu ngân xuất hóa đơn & Thu tiền:** Đăng nhập `cashier@goodsmile.vn` -> Mở danh sách hóa đơn chờ thanh toán -> Chọn phương thức **VNPay Sandbox** hoặc **Tiền mặt / Ví** -> Xác nhận thanh toán -> Hệ thống tự động tích điểm nâng hạng thành viên cho bệnh nhân.
6. **Báo cáo & Quản lý:** Đăng nhập `manager@goodsmile.vn` -> Quan sát biểu đồ doanh thu ngày, thống kê hiệu suất bác sĩ và quản lý phân ca trực.

---

> ⭐️ *Đồ án được xây dựng với tinh thần học hỏi nghiêm túc, tuân thủ kiến trúc phân tầng sạch và đảm bảo tính ứng dụng cao trong thực tế.*
