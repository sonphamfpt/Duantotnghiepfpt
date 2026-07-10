# 🦷 Hướng dẫn Thiết lập & Chạy Backend Nha Khoa GoodSmile

Tài liệu này hướng dẫn cách cài đặt, khởi chạy dự án Backend dành cho tất cả các thành viên trong nhóm.

---

## 🛠️ Yêu cầu cài đặt trước (Prerequisites)

Mỗi thành viên cần cài đặt sẵn trên máy:
1. **Node.js** (Khuyên dùng v20 hoặc mới hơn).
2. **Docker Desktop** (Dùng để chạy PostgreSQL và Redis nhanh chóng, không cần cài đặt CSDL thủ công vào máy).

---

## ⚡ Các bước khởi chạy nhanh (Quick Start)

Khi bạn tải code mới về từ GitHub, hãy mở Terminal trong thư mục `backend/` và chạy tuần tự các lệnh sau:

### BƯỚC 1: Cài đặt thư viện Node.js
```bash
npm install
```

### BƯỚC 2: Tạo file cấu hình môi trường `.env`
1. Copy file `.env.example` đổi tên thành `.env`:
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` ra, kiểm tra các cấu hình kết nối. Mặc định dự án đang cấu hình cổng PostgreSQL của Docker là `5433` để tránh đụng độ nếu máy bạn đã lỡ cài Postgres cục bộ:
   ```ini
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/goodsmile_clinic?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="supersecretjwtkey123!"
   ```

### BƯỚC 3: Khởi động Docker CSDL & Cache
Mở ứng dụng **Docker Desktop** trên máy tính lên. Sau đó chạy lệnh sau trong Terminal để bật Postgres & Redis:
```bash
docker compose up -d goodsmile-db goodsmile-cache
```

### BƯỚC 4: Tạo cấu trúc bảng & Nạp dữ liệu mẫu
1. **Tạo bảng tự động**:
   ```bash
   npx prisma migrate dev --name init
   ```
2. **Nạp dữ liệu mẫu & Trigger chống trùng lịch**:
   ```bash
   npx prisma db seed
   ```
   *(Lệnh này tự động tạo tài khoản bác sĩ mẫu, bệnh nhân, dịch vụ và cài đặt trigger chống trùng lịch vào Postgres).*

### BƯỚC 5: Khởi chạy API Server
```bash
npm run dev
```
* Server sẽ chạy tại: `http://localhost:5000`
* Kiểm tra xem server hoạt động chưa bằng cách mở trình duyệt truy cập: `http://localhost:5000/`

---

## 🐳 Hướng dẫn sử dụng Docker cơ bản cho nhóm

Cả nhóm chỉ cần nhớ một vài lệnh Docker Compose đơn giản sau (luôn chạy trong thư mục `backend/`):

1. **Khởi động Database & Redis** (Mở đầu buổi làm việc):
   ```bash
   docker compose up -d goodsmile-db goodsmile-cache
   ```
   *Lưu ý: Thêm cờ `-d` để nó chạy ngầm, giải phóng terminal.*

2. **Kiểm tra trạng thái các container** (Khi gặp lỗi không kết nối được DB):
   ```bash
   docker compose ps
   ```

3. **Xem logs của Database/Redis** để debug:
   ```bash
   docker compose logs -f goodsmile-db
   ```

4. **Tắt Database & Redis** (Kết thúc buổi làm việc):
   ```bash
   docker compose down
   ```
   *Lưu ý: Dữ liệu của bạn sẽ không bị mất vì đã được Docker lưu trữ an toàn trong Volume.*

---

## 🧪 Các API Lịch Hẹn Đang Hỗ Trợ

### 1. Lấy slot trống của bác sĩ
* **Method**: `GET`
* **URL**: `/api/appointments/dentists/:dentistId/available-slots`
* **Query Params**:
  * `date`: Ngày khám dạng `YYYY-MM-DD` (Ví dụ: `2026-07-02`)
  * `serviceId`: ID dịch vụ cần khám (Ví dụ: `1`)

### 2. Đặt lịch hẹn mới (Có khóa Redis chống trùng)
* **Method**: `POST`
* **URL**: `/api/appointments`
* **Body (JSON)**:
  ```json
  {
    "patientId": "1",
    "dentistId": "1",
    "serviceId": "1",
    "startTime": "2026-07-02T08:30:00.000Z",
    "bookingChannel": "Online",
    "patientNotes": "Khám răng định kỳ"
  }
  ```

### 3. Hủy lịch hẹn (Tự động khóa nếu hủy nhiều)
* **Method**: `PATCH`
* **URL**: `/api/appointments/:id/cancel`
* **Body (JSON)**:
  ```json
  {
    "cancelReason": "Tôi bận việc đột xuất"
  }
  ```
