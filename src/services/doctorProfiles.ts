/**
 * NOTE: Dữ liệu bác sĩ (học vấn, bằng cấp, châm ngôn, lịch sử công tác, thế mạnh điều trị...)
 * hiện đã được chuyển sang lưu trữ 100% trong CSDL PostgreSQL (bảng dentists, dentist_education,
 * dentist_certifications, dentist_clinical_strengths, dentist_work_history).
 * 
 * Frontend lấy dữ liệu động qua API GET /api/dentists và ClinicContext.
 */

export interface DoctorProfileDetail {
  specialty: string;
  degree: string;
  education: string[];
  experience: number;
  cases: string;
  clinicalStrengths: string[];
  certifications: string[];
  universityLogo: string;
  bio: string;
  motto: string;
  workHistory: string[];
}

export const DOCTOR_PROFILES: Record<string, DoctorProfileDetail> = {};
