-- Migration: Gộp 4 bảng phụ của bác sĩ thành dentist_profile_items
-- Chạy trên Supabase / PostgreSQL

-- 1. Tạo bảng mới
CREATE TABLE dentist_profile_items (
  id           BIGSERIAL PRIMARY KEY,
  dentist_id   BIGINT NOT NULL REFERENCES dentists(dentist_id) ON DELETE CASCADE,
  section      VARCHAR(50) NOT NULL CHECK (section IN ('education', 'certification', 'clinical_strength', 'work_history')),
  period_text  VARCHAR(100) NULL,
  description  TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_dentist_profile_items_dentist ON dentist_profile_items(dentist_id);
CREATE INDEX idx_dentist_profile_items_section ON dentist_profile_items(dentist_id, section);

-- 2. Di chuyển dữ liệu từ 4 bảng cũ
INSERT INTO dentist_profile_items (dentist_id, section, period_text, description, sort_order)
SELECT dentist_id, 'education', NULL, description, sort_order
FROM dentist_education;

INSERT INTO dentist_profile_items (dentist_id, section, period_text, description, sort_order)
SELECT dentist_id, 'certification', NULL, description, sort_order
FROM dentist_certifications;

INSERT INTO dentist_profile_items (dentist_id, section, period_text, description, sort_order)
SELECT dentist_id, 'clinical_strength', period_text, description, sort_order
FROM dentist_clinical_strengths;

INSERT INTO dentist_profile_items (dentist_id, section, period_text, description, sort_order)
SELECT dentist_id, 'work_history', period_text, description, sort_order
FROM dentist_work_history;

-- 3. Xóa 4 bảng cũ
DROP TABLE dentist_education;
DROP TABLE dentist_certifications;
DROP TABLE dentist_clinical_strengths;
DROP TABLE dentist_work_history;
