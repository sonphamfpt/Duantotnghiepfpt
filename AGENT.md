# AGENT.md – Nha Khoa GoodSmile

Tài liệu này cung cấp ngữ cảnh cho AI agent khi làm việc với codebase này.
Đọc kỹ trước khi thực hiện bất kỳ thay đổi nào.

---

## 🏥 Mô tả dự án

**GoodSmile Clinic** là hệ thống quản lý phòng khám nha khoa tích hợp Fullstack hoàn chỉnh.
- **Frontend:** SPA React 19 + TypeScript chạy cổng `http://localhost:5173`
- **Backend:** REST API Node.js Express + TypeScript chạy cổng `http://localhost:5000`
- **Database:** PostgreSQL (Prisma ORM) + Redis (Distributed Lock / Cache)
- **Auth:** JWT thực tế — token lưu trong `localStorage` dưới key `goodsmile_token`

---

## ⚡ Lệnh quan trọng

### Khởi động dự án
```bash
# Khởi động Frontend (Thư mục gốc)
npm run dev          # Vite Dev Server → http://localhost:5173

# Khởi động Backend (Thư mục /backend)
cd backend
npm run dev          # ts-node-dev Server → http://localhost:5000
npx prisma studio    # Trình quản lý CSDL trực quan → http://localhost:5555
```

### Seed dữ liệu mẫu
```bash
cd backend
npx prisma db seed   # Reset + seed toàn bộ database với dữ liệu mẫu
```

### Kiểm thử tự động
```bash
cd backend
npx ts-node src/test_api.ts        # 7 ca kiểm thử liên thông xác thực & đặt lịch
npx ts-node src/test_reports.ts    # Kiểm thử Module Báo cáo thống kê
npx ts-node src/test_websocket.ts  # Kiểm thử WebSocket real-time (Socket.io) E2E
```

### Kiểm tra biên dịch
```bash
# Frontend
npx tsc -b --noEmit

# Backend
npx tsc --noEmit
```

---

## 🏗️ Kiến trúc & Stack

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React 19 / TypeScript / Vite | Context API quản lý state toàn cục |
| Backend | Node.js Express / TypeScript | REST API cổng 5000 |
| Database | PostgreSQL | Schema + migration + seed qua Prisma |
| Auth | JWT (jsonwebtoken + bcrypt) | Token lưu localStorage, refresh qua `/api/auth/me` |
| Caching & Locks | Redis | Distributed lock chống đặt trùng lịch |
| Validations | Zod | Validate đầu vào ở cả FE và BE |
| Styling | TailwindCSS v4 | Custom design tokens trong `tailwind.config.js` |

---

## 📁 Cấu trúc Frontend

```
src/
├── context/
│   ├── AuthContext.tsx      # JWT Auth – login/logout/register/restore session
│   └── ClinicContext.tsx    # State toàn hệ thống + gọi tất cả REST API backend
├── types/clinic.ts          # Tất cả TypeScript interfaces – ĐỌC TRƯỚC khi code
├── services/mockData.ts     # Dữ liệu khởi tạo tĩnh – phần lớn đã thay bằng API
├── components/              # Shared components (BookingModal, DentalChart, Icon)
├── layouts/                 # MainLayout (public) & DashboardLayout (staff/patient)
└── pages/
    ├── public/              # Trang công khai (Home, Login, Đặt lịch, Bác sĩ...)
    ├── patient/             # Cổng bệnh nhân + 5 tabs
    ├── staff/               # 4 dashboard nhân viên + tabs riêng
    └── queue-tracking/      # Màn hình TV phòng chờ (/queue-board)
```

## 📁 Cấu trúc Backend

```
backend/src/
├── modules/
│   ├── auth/            # Đăng ký / Đăng nhập / Lấy thông tin người dùng
│   ├── appointments/    # Lịch hẹn khám bệnh
│   ├── queues/          # Hàng chờ khám (check-in, trạng thái, hoàn thành)
│   ├── medical-records/ # Bệnh án, sơ đồ răng, đơn thuốc
│   ├── treatment-plans/ # Phác đồ điều trị nhiều buổi
│   ├── invoices/        # Hóa đơn, thanh toán, nạp ví
│   ├── shifts/          # Ca trực bác sĩ, đổi ca, xử lý xung đột
│   └── reports/         # Thống kê doanh thu & hiệu suất (chỉ manager)
├── middlewares/
│   ├── authGuard.ts     # Xác minh JWT token
│   ├── roleGuard.ts     # Kiểm tra quyền theo role (requireRole)
│   └── errorHandler.ts  # Xử lý lỗi tập trung
└── config/
    ├── prisma.ts        # PrismaClient singleton
    └── env.ts           # Biến môi trường
```

---

## 🔐 Hệ thống phân quyền (Roles)

Xác thực **JWT thực tế** — KHÔNG còn mock role bypass.

| Role | Dashboard URL | Email seed | Mật khẩu |
|---|---|---|---|
| `patient` | `/patient` | `benhnhan@goodsmile.vn` | `12345678` |
| `receptionist` | `/dashboard/receptionist` | `receptionist@goodsmile.vn` | `12345678` |
| `dentist` | `/dashboard/dentist` | `nguyenhuong@goodsmile.vn` | `12345678` |
| `cashier` | `/dashboard/cashier` | `cashier@goodsmile.vn` | `12345678` |
| `manager` | `/dashboard/manager` | `manager@goodsmile.vn` | `12345678` |

### Route Guard
- `RoleGuardRoute` trong `App.tsx` kiểm tra đồng thời `isAuthenticated` **và** `role`
- Chưa đăng nhập → redirect `/login`
- Sai role → redirect về dashboard của role hiện tại
- Manager có thể xem mọi dashboard (khai báo trong `allowedRoles`)

---

## 🌐 Kết nối Frontend ↔ Backend

`ClinicContext.tsx` gọi tất cả API backend thực tế. **KHÔNG còn mock data** cho nghiệp vụ chính.

| Hàm Frontend | Endpoint Backend | Mô tả |
|---|---|---|
| `refreshAllData()` | GET nhiều endpoint | Đồng bộ dữ liệu mỗi 5 giây (polling) |
| `checkInPatient()` | `POST /api/queues/checkin` | Lễ tân check-in bệnh nhân |
| `startTreatment()` | `PUT /api/queues/:id/status` | Bác sĩ bắt đầu khám |
| `completeTreatment()` | `POST /api/medical-records` | Bác sĩ lưu bệnh án |
| `processPayment()` | `POST /api/invoices/:id/pay` | Thu ngân thanh toán |
| `rechargeWallet()` | `POST /api/invoices/patients/:id/recharge` | Nạp ví bệnh nhân |
| `swapShifts()` | `POST /api/shifts/swap` | Hoán đổi ca trực |
| `transferShift()` | `POST /api/shifts/transfer` | Chuyển giao ca trực |

### Quy tắc ID
Frontend hiển thị dạng chuỗi (`'P-8821'`, `'D-04'`), Backend lưu `BigInt`.
Trước khi gọi API, luôn strip prefix: `id.split('-')[1] || id`

---

## 📊 Luồng nghiệp vụ chính

```
Lễ tân check-in → POST /api/queues/checkin
    ↓ Queue status: Waiting
Bác sĩ bắt đầu → PUT /api/queues/:id/status { status: 'InChair' }
    ↓ Queue status: InChair
Bác sĩ lưu bệnh án → POST /api/medical-records
    ↓ Tự động tạo Invoice với discount theo hạng thành viên
Thu ngân thanh toán → POST /api/invoices/:id/pay
    ↓ Invoice: Paid | Tích điểm loyalty | Nâng tier nếu đủ điều kiện
```

---

## 🧩 Pattern Tab Routing

Tất cả dashboard dùng cùng pattern – **ĐỌC KỸ** trước khi thêm tab mới:

```tsx
// Trong DashboardXxx.tsx
const [searchParams] = useSearchParams();
const tab = searchParams.get('tab');

switch (tab) {
  case 'ten-tab': return <TenTabComponent />;
  default:        return <DefaultHome />;
}
```

Thêm tab mới cần cập nhật 2 chỗ:
1. `DashboardLayout.tsx` → `getNavItems()` – thêm nav link mới
2. Dashboard file tương ứng → thêm `case` trong switch

---

## ⚠️ Giá trị quan trọng sau khi Seed

Sau khi chạy `npx prisma db seed`:
- **Bác sĩ Nguyễn Hương** có `dentistId = 4` (DB), hiển thị `D-04`
- **Bệnh nhân mẫu Trần Nguyễn Minh** có `patientId = 8821` (DB do reset sequence), hiển thị `P-8821`
- **Services** có ID từ 1–N — dùng `S-XX` ở Frontend

---

## 💡 Quy tắc Styling

- Dùng Tailwind classes từ design system trong `tailwind.config.js` và `index.css`
- Token màu chính: `primary`, `secondary`, `surface`, `on-surface`, `outline-variant`
- **Không tự ý thêm màu hex/rgb** – dùng token đã định nghĩa
- Animations: `animate-in fade-in duration-200`, `animate-pulse`, `hover:scale-[1.01]`
- Custom scrollbar: class `custom-scrollbar`

---

## 🚫 KHÔNG ĐƯỢC LÀM

- ❌ Không dùng hàm `login(role)` mock cũ – đã bị xóa; chỉ dùng `loginWithCredentials()`
- ❌ Không cài thêm thư viện state management (Redux, Zustand, Jotai...)
- ❌ Không thay đổi `types/clinic.ts` mà không cập nhật `ClinicContext.tsx`
- ❌ Không xóa `addLog()` khi thực hiện action – mọi action cần có log
- ❌ Không hardcode text tiếng Anh vào UI – dự án hoàn toàn tiếng Việt
- ❌ Không dùng `any` type trong TypeScript trừ khi bất khả kháng
- ❌ Không gọi API từ component trực tiếp – mọi API call phải đi qua `ClinicContext.tsx`

---

## ✅ PHẢI LÀM KHI THÊM TÍNH NĂNG MỚI

### Thêm nghiệp vụ mới (Frontend)
1. Khai báo interface trong `types/clinic.ts` trước
2. Thêm state + hàm API call vào `ClinicContext.tsx`
3. Gọi `addLog()` sau mỗi action quan trọng
4. Dùng `useClinic()` hook để truy cập data

### Thêm endpoint mới (Backend)
1. Tạo `service.ts` → logic DB (Prisma)
2. Tạo `controller.ts` → xử lý request/response
3. Tạo `routes.ts` → gắn middleware `authGuard` + `requireRole` nếu cần
4. Đăng ký router trong `app.ts`
5. Dùng `serializeBigInt()` từ `utils/serialize.ts` trước khi `res.json()`

---

## 🦷 DentalChart Component

- Chuẩn **ISO FDI Notation** (32 răng, 4 góc phần tư Q1–Q4)
- Props: `teethState: ToothState[]`, `selectedTooth: number | null`, `onSelectTooth: (num) => void`
- 6 condition: `healthy | decay | missing | crown | bridge | treated`

---

## 🔢 ID Convention

| Entity | Format FE | Ví dụ | DB Type |
|---|---|---|---|
| Patient | `P-XXXX` | `P-8821` | `BigInt` |
| Dentist | `D-XX` | `D-04` | `BigInt` |
| Service | `S-XX` | `S-01` | `BigInt` |
| Appointment | `A-XXXX` | `A-01` | `BigInt` |
| Queue Ticket | `Q-XXXX` | `Q-03` | `BigInt` |
| Invoice | `INV-XXXX` | `INV-9021` | `BigInt` |
| Medical Record | `MR-XXXX` | `MR-01` | `BigInt` |
| Shift | `SH-XX` | `SH-01` | `BigInt` |

> 💡 **Quy tắc chuyển đổi ID:** `const rawId = id.split('-')[1] || id;` trước khi gửi lên API.

---

## 📋 Tiến độ Module (cập nhật 09/07/2026)

| Module | Frontend | Backend | Trạng thái |
|---|---|---|---|
| Xác thực & Phân quyền | ✅ JWT Auth + Role Guard | ✅ authGuard + roleGuard | ✅ Hoàn thành |
| Hàng chờ khám | ✅ ReceptionistDashboard | ✅ `/api/queues` | ✅ Hoàn thành |
| Lịch hẹn | ✅ Tab Appointments | ✅ `/api/appointments` | ✅ Hoàn thành |
| Ca trực bác sĩ | ✅ ManagerSchedule | ✅ `/api/shifts` | ✅ Hoàn thành |
| Bệnh án & Sơ đồ răng | ✅ DentistDashboard | ✅ `/api/medical-records` | ✅ Hoàn thành |
| Phác đồ điều trị | ✅ TreatmentPlan UI | ✅ `/api/treatment-plans` | ✅ Hoàn thành |
| Hóa đơn & Thanh toán | ✅ CashierBilling | ✅ `/api/invoices` | ✅ Hoàn thành |
| Phân hạng thành viên | ✅ Hiển thị tier/điểm | ✅ Tự động tính khi thanh toán | ✅ Hoàn thành |
| Báo cáo thống kê | ✅ ManagerRevenue | ✅ `/api/reports/dashboard` | ✅ Hoàn thành |
| Cổng bệnh nhân | ✅ 5 tabs đầy đủ | ✅ Gọi API thực | ✅ Hoàn thành |
| Landing Page công khai | ✅ 6 trang public | — | ✅ Hoàn thành |

---

## 🐛 Các lỗi đã gặp & cách khắc phục (Gotchas)

### 1. Prisma Enum với `@map` — KHÔNG dùng DB value khi gọi Prisma
Khi Prisma enum có `@map`, **phải dùng tên TypeScript**, KHÔNG dùng tên DB:

```typescript
// ❌ SAI — đây là DB value (snake_case)
sessionType: 'plan_init'

// ✅ ĐÚNG — đây là Prisma enum TypeScript name
import { SessionType } from '@prisma/client';
sessionType: SessionType.planInit
```

Áp dụng cho các enum:
| Enum | Prisma TS name | DB value (`@map`) |
|---|---|---|
| `SessionType` | `independent` | `independent` |
| `SessionType` | `planInit` | `plan_init` |
| `SessionType` | `planSession` | `plan_session` |
| `QueueStatus` | `Waiting` / `InChair` / `Completed` | tương ứng |

> ⚠️ **Lỗi điển hình:** `Type '"plan_init"' is not assignable to type 'SessionType'` — fix bằng cách import `SessionType` từ `@prisma/client` và dùng `SessionType.planInit`.

---

### 2. BigInt serialization — Luôn dùng `serializeBigInt()`
PostgreSQL trả về `BigInt` cho các ID. `JSON.stringify` không tự chuyển được `BigInt`.

```typescript
// Trong mọi controller trước khi res.json():
import { serializeBigInt } from '../../utils/serialize';

return res.json(serializeBigInt({ data: result }));
```

File: `backend/src/utils/serialize.ts`

---

### 3. Queue Checkin URL — dùng `/checkin` KHÔNG phải `/check-in`
```
✅ POST /api/queues/checkin
❌ POST /api/queues/check-in   ← URL này không tồn tại (404)
```

---

### 4. ID strip prefix khi gọi API
Frontend lưu ID dạng `'P-8821'`, `'D-04'`, `'Q-03'`. Trước khi gửi lên API phải strip:

```typescript
const rawId = id.split('-').pop() || id;
// 'P-8821' → '8821'
// 'D-04'   → '04'  → BigInt(4)
```

---

### 5. `node-fetch` trong test script — KHÔNG dùng
`node-fetch` gây lỗi ESM/CJS khi chạy với `ts-node`. Dùng `fetch` native (Node 18+):

```typescript
// ❌ import fetch from 'node-fetch';
// ✅ Dùng global fetch (Node 18+)
const res = await fetch('http://localhost:5000/api/...');
```

---

### 6. Phone number duplicate trong test script
Backend trả `409 Conflict` nếu SĐT đã tồn tại. Khi viết test script, tạo SĐT ngẫu nhiên:

```typescript
const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
```

---

## 🏷️ Phân hạng thành viên (Loyalty Tier)

Hệ thống tự động tính toán khi thanh toán xong (`POST /api/invoices/:id/pay`):

| Hạng | Điều kiện | Giảm giá |
|---|---|---|
| `Bronze` | Mặc định | 0% |
| `Silver` | ≥ 5 lượt khám | 5% |
| `Gold` | ≥ 15 lượt khám | 10% |
| `Platinum` | ≥ 30 lượt khám | 15% |

- Mỗi lần thanh toán thành công → tự động cộng `visitCount` và kiểm tra nâng tier
- Frontend hiển thị tier badge trong ProfileCard của bệnh nhân

---

## 📡 API Endpoints đầy đủ

### Auth
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Đăng ký bệnh nhân mới | Public |
| POST | `/api/auth/login` | Đăng nhập, nhận JWT | Public |
| GET | `/api/auth/me` | Lấy thông tin user từ token | JWT |

### Queues
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/queues` | Danh sách hàng chờ hôm nay | JWT |
| POST | `/api/queues/checkin` | Check-in bệnh nhân | JWT |
| PUT | `/api/queues/:id/status` | Cập nhật trạng thái (InChair/Completed) | JWT |

### Invoices
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/invoices` | Danh sách hóa đơn | JWT |
| GET | `/api/invoices/patients/:patientId` | Hóa đơn của bệnh nhân | JWT |
| POST | `/api/invoices/:id/pay` | Thanh toán hóa đơn | JWT |
| POST | `/api/invoices/patients/:patientId/recharge` | Nạp tiền vào ví | JWT |

### Reports
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/reports/dashboard` | Tổng hợp doanh thu & thống kê | JWT + manager |

### Medical Records
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/medical-records/patients/:patientId` | Bệnh án của bệnh nhân | JWT |
| POST | `/api/medical-records` | Tạo bệnh án mới | JWT |

### Shifts
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/shifts` | Lịch trực tháng hiện tại | JWT |
| POST | `/api/shifts/swap` | Yêu cầu hoán đổi ca | JWT |
| POST | `/api/shifts/transfer` | Chuyển giao ca trực | JWT |
| PUT | `/api/shifts/swap/:id/approve` | Quản lý duyệt đổi ca | JWT + manager |
| PUT | `/api/shifts/swap/:id/reject` | Quản lý từ chối đổi ca | JWT + manager |

