import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { clinicApi } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';

interface EditDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dentistId: string; // ví dụ D-01
  onSuccess: () => void;
}

export const EditDoctorModal: React.FC<EditDoctorModalProps> = ({
  isOpen,
  onClose,
  dentistId,
  onSuccess,
}) => {
  const { showAlert } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [casesHandled, setCasesHandled] = useState('');
  const [motto, setMotto] = useState('');
  const [bio, setBio] = useState('');

  // Dynamic Array Lists
  const [education, setEducation] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [clinicalStrengths, setClinicalStrengths] = useState<string[]>([]);
  const [workHistory, setWorkHistory] = useState<{ periodText: string; description: string }[]>([]);

  useEffect(() => {
    if (isOpen && dentistId) {
      fetchDentistDetail();
    }
  }, [isOpen, dentistId]);

  const fetchDentistDetail = async () => {
    setLoading(true);
    try {
      const res = await clinicApi.getDentistDetail(dentistId);
      if (res.success && res.data) {
        const d = res.data;
        setName(d.name || '');
        setDegree(d.degree || '');
        setSpecialty(d.specialty || '');
        setExperienceYears(d.experienceYears || 5);
        setCasesHandled(d.casesHandled || '');
        setMotto(d.motto || '');
        setBio(d.bio || '');
        setEducation(d.education || []);
        setCertifications(d.certifications || []);
        setClinicalStrengths(d.clinicalStrengths || []);
        setWorkHistory(d.workHistory || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết bác sĩ:', err);
      showAlert({
        title: 'Không thể tải dữ liệu',
        message: 'Không thể tải thông tin chi tiết của bác sĩ. Vui lòng thử lại sau.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        degree: degree.trim(),
        specialty: specialty.trim(),
        experienceYears: Number(experienceYears),
        casesHandled: casesHandled.trim(),
        motto: motto.trim(),
        bio: bio.trim(),
        education: education.filter(e => e.trim() !== ''),
        certifications: certifications.filter(c => c.trim() !== ''),
        clinicalStrengths: clinicalStrengths.filter(s => s.trim() !== ''),
        workHistory: workHistory.filter(w => w.description.trim() !== ''),
      };

      const res = await clinicApi.updateDentist(dentistId, payload);
      if (res.success) {
        showAlert({
          title: 'Cập nhật thành công',
          message: `Đã cập nhật đầy đủ thông tin chuyên môn, chứng chỉ quốc tế và lịch sử công tác của bác sĩ ${name} (${dentistId}) thành công!`,
          type: 'success',
        });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Lỗi cập nhật bác sĩ:', err);
      showAlert({
        title: 'Cập nhật thất bại',
        message: err.message || 'Lỗi hệ thống khi cập nhật hồ sơ bác sĩ.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-3xl flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="edit_note" className="text-2xl" />
            <div>
              <h3 className="font-extrabold text-base">Chỉnh Sửa Hồ Sơ Bác Sĩ</h3>
              <p className="text-xs text-blue-100 font-medium">Mã số: {dentistId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold">
            <Icon name="sync" className="text-3xl animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Đang tải dữ liệu hồ sơ CSDL...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
            
            {/* ── Thông tin cá nhân cơ bản ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase text-blue-700 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <Icon name="badge" className="text-base" />
                Thông tin chung & Chức danh
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên Bác sĩ *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Học vị / Bằng cấp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Thạc Sĩ - Bác Sĩ, Bác Sĩ CKI..."
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chuyên khoa đảm nhận *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Trưởng khoa Chỉnh Nha & Phục Hình"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số năm KN</label>
                    <input
                      type="number"
                      min={0}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số ca đã thực hiện</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 3,500+ ca"
                      value={casesHandled}
                      onChange={(e) => setCasesHandled(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Châm ngôn làm việc (Motto)</label>
                <input
                  type="text"
                  placeholder="Triết lý điều trị của bác sĩ..."
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiểu sử & Giới thiệu chi tiết</label>
                <textarea
                  rows={3}
                  placeholder="Giới thiệu về kinh nghiệm, phong cách điều trị..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>
            </div>

            {/* ── Quá trình Đào tạo (Education) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-extrabold uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                  <Icon name="school" className="text-base" />
                  Quá Trình Đào Tạo ({education.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setEducation([...education, ''])}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Icon name="add" className="text-sm" /> Thêm dòng
                </button>
              </div>

              {education.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Học vấn #${idx + 1}`}
                    value={item}
                    onChange={(e) => {
                      const updated = [...education];
                      updated[idx] = e.target.value;
                      setEducation(updated);
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                    className="text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    <Icon name="delete" className="text-base" />
                  </button>
                </div>
              ))}
            </div>

            {/* ── Thế Mạnh Lâm Sàng (Clinical Strengths) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-extrabold uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                  <Icon name="verified" className="text-base" />
                  Thế Mạnh Lâm Sàng ({clinicalStrengths.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setClinicalStrengths([...clinicalStrengths, ''])}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Icon name="add" className="text-sm" /> Thêm dòng
                </button>
              </div>

              {clinicalStrengths.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Thế mạnh #${idx + 1}`}
                    value={item}
                    onChange={(e) => {
                      const updated = [...clinicalStrengths];
                      updated[idx] = e.target.value;
                      setClinicalStrengths(updated);
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setClinicalStrengths(clinicalStrengths.filter((_, i) => i !== idx))}
                    className="text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    <Icon name="delete" className="text-base" />
                  </button>
                </div>
              ))}
            </div>

            {/* ── Chứng Chỉ Y Khoa (Certifications) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-extrabold uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                  <Icon name="workspace_premium" className="text-base" />
                  Chứng Chỉ Quốc Tế ({certifications.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setCertifications([...certifications, ''])}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Icon name="add" className="text-sm" /> Thêm dòng
                </button>
              </div>

              {certifications.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Chứng chỉ #${idx + 1}`}
                    value={item}
                    onChange={(e) => {
                      const updated = [...certifications];
                      updated[idx] = e.target.value;
                      setCertifications(updated);
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                    className="text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    <Icon name="delete" className="text-base" />
                  </button>
                </div>
              ))}
            </div>

            {/* ── Lịch Sử Công Tác (Work History) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-extrabold uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                  <Icon name="work_history" className="text-base" />
                  Lịch Sử Công Tác ({workHistory.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setWorkHistory([...workHistory, { periodText: '', description: '' }])}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Icon name="add" className="text-sm" /> Thêm dòng
                </button>
              </div>

              {workHistory.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Thời gian (VD: 2018 - 2022)"
                    value={item.periodText}
                    onChange={(e) => {
                      const updated = [...workHistory];
                      updated[idx].periodText = e.target.value;
                      setWorkHistory(updated);
                    }}
                    className="w-1/3 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Bệnh viện / Chức vụ công tác"
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...workHistory];
                      updated[idx].description = e.target.value;
                      setWorkHistory(updated);
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setWorkHistory(workHistory.filter((_, i) => i !== idx))}
                    className="text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    <Icon name="delete" className="text-base" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Icon name="save" className="text-base" />
                <span>{submitting ? 'Đang lưu...' : 'Lưu Thay Đổi CSDL'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
