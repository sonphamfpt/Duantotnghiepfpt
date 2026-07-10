-- ════════════════════════════════════════════════════════════════
-- SQL Migrations — Nha khoa GoodSmile
-- Hỗ trợ: Exclusion constraints & Triggers tự động
-- ════════════════════════════════════════════════════════════════

-- 1. Cài đặt extension btree_gist để hỗ trợ ràng buộc EXCLUDE trên kiểu dữ liệu BIGINT/INT và TIMESTAMP
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Ràng buộc loại trừ: Chống trùng lịch của cùng Bác sĩ (chỉ áp dụng với lịch hẹn hợp lệ)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_dentist_no_overlap;
ALTER TABLE appointments ADD CONSTRAINT appointments_dentist_no_overlap
EXCLUDE USING gist (
  dentist_id WITH =,
  tsrange(start_time, end_time) WITH &&
) WHERE (status NOT IN ('Cancelled', 'NoShow'));

-- 3. Ràng buộc loại trừ: Chống trùng lịch của cùng Phòng khám (chỉ áp dụng với lịch hẹn hợp lệ và phòng khám được chỉ định)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_room_no_overlap;
ALTER TABLE appointments ADD CONSTRAINT appointments_room_no_overlap
EXCLUDE USING gist (
  room_id WITH =,
  tsrange(start_time, end_time) WITH &&
) WHERE (status NOT IN ('Cancelled', 'NoShow') AND room_id IS NOT NULL);

-- 4. Trigger tự động tính toán appointments.end_time dựa trên services.duration_minutes + buffer_minutes
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
DECLARE
    v_duration INT;
    v_buffer INT;
BEGIN
    -- Lấy thời lượng và thời gian chuẩn bị của dịch vụ
    SELECT duration_minutes, buffer_minutes INTO v_duration, v_buffer
    FROM services
    WHERE service_id = NEW.service_id;

    -- Giá trị mặc định nếu dịch vụ không tồn tại
    IF v_duration IS NULL THEN
        v_duration := 30;
    END IF;
    IF v_buffer IS NULL THEN
        v_buffer := 5;
    END IF;

    -- end_time = start_time + (duration_minutes + buffer_minutes)
    NEW.end_time := NEW.start_time + (v_duration + v_buffer) * INTERVAL '1 minute';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_appointment_end_time ON appointments;
CREATE TRIGGER trg_calculate_appointment_end_time
BEFORE INSERT OR UPDATE OF start_time, service_id ON appointments
FOR EACH ROW
EXECUTE FUNCTION calculate_appointment_end_time();


