import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../../components/Icon';
import { fetchAllMedicines, addMedicine, toggleMedicine, updateMedicine, Medicine } from '../../../services/api/medicineApi';
import { useConfirm } from '../../../context/ConfirmContext';

// ─── Component trang quản lý danh mục thuốc mẫu ──────────────────────────────
const MedicineManagement: React.FC = () => {
  const { showAlert, showConfirm } = useConfirm();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  // Modal Thêm/Sửa
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDose, setFormDose] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formNote, setFormNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadMedicines = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAllMedicines();
      setMedicines(data);
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể tải danh sách thuốc.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { loadMedicines(); }, [loadMedicines]);

  const openAddModal = () => {
    setEditingId(null);
    setFormName(''); setFormDose(''); setFormDuration(''); setFormNote('');
    setShowModal(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditingId(med.id);
    setFormName(med.name);
    setFormDose(med.defaultDose || '');
    setFormDuration(med.defaultDuration || '');
    setFormNote(med.defaultNote || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      await showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập tên thuốc.', type: 'warning' });
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await updateMedicine(editingId, {
          name: formName.trim(),
          defaultDose: formDose.trim() || undefined,
          defaultDuration: formDuration.trim() || undefined,
          defaultNote: formNote.trim() || undefined,
        });
        setMedicines(prev => prev.map(m => m.id === editingId ? { ...m, ...updated } : m));
        await showAlert({ title: 'Thành công', message: `Đã cập nhật thuốc "${updated.name}".`, type: 'success' });
      } else {
        const newMed = await addMedicine({
          name: formName.trim(),
          defaultDose: formDose.trim() || undefined,
          defaultDuration: formDuration.trim() || undefined,
          defaultNote: formNote.trim() || undefined,
        });
        setMedicines(prev => [newMed, ...prev]);
        await showAlert({ title: 'Thành công', message: `Đã thêm thuốc "${newMed.name}" vào danh mục.`, type: 'success' });
      }
      setShowModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Không thể lưu thuốc. Vui lòng thử lại.';
      await showAlert({ title: 'Lỗi', message: msg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (med: Medicine) => {
    const action = med.isActive ? 'ẩn' : 'hiện lại';
    const confirmed = await showConfirm({
      title: med.isActive ? 'Ẩn thuốc' : 'Hiện lại thuốc',
      message: `Bạn có chắc muốn ${action} thuốc "${med.name}" không?`,
      type: med.isActive ? 'warning' : 'info',
      confirmLabel: med.isActive ? 'Ẩn thuốc' : 'Hiện lại',
      cancelLabel: 'Hủy',
    });
    if (!confirmed) return;

    try {
      const result = await toggleMedicine(med.id);
      setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, isActive: result.isActive } : m));
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể cập nhật trạng thái thuốc.', type: 'error' });
    }
  };

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(searchText.toLowerCase())
  );
  const activeMeds = filtered.filter(m => m.isActive);
  const hiddenMeds = filtered.filter(m => !m.isActive);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="text-2xl">💊</span>
            Danh mục thuốc mẫu
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Quản lý danh sách thuốc thường dùng khi kê đơn. Tổng: <strong>{medicines.length}</strong> thuốc ({medicines.filter(m => m.isActive).length} đang dùng, {medicines.filter(m => !m.isActive).length} đã ẩn)
          </p>
        </div>
        <button
          id="btn-add-medicine"
          onClick={openAddModal}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors shadow"
        >
          <Icon name="add" className="text-base" />
          Thêm thuốc
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base" />
        <input
          id="medicine-search"
          type="text"
          placeholder="Tìm thuốc theo tên..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {searchText && (
          <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
            <Icon name="close" className="text-base" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-variant gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách thuốc...</span>
        </div>
      ) : (
        <>
          {/* Danh sách thuốc ACTIVE */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Đang sử dụng ({activeMeds.length})
            </h3>
            {activeMeds.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant text-sm border border-dashed border-outline-variant rounded-2xl">
                {searchText ? 'Không tìm thấy thuốc phù hợp.' : 'Chưa có thuốc nào trong danh mục.'}
              </div>
            ) : (
              <div className="grid gap-2">
                {activeMeds.map(med => (
                  <MedicineCard key={med.id} med={med} onEdit={() => openEditModal(med)} onToggle={() => handleToggle(med)} />
                ))}
              </div>
            )}
          </div>

          {/* Danh sách thuốc đã ẩn */}
          {hiddenMeds.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                Đã ẩn ({hiddenMeds.length})
              </h3>
              <div className="grid gap-2 opacity-60">
                {hiddenMeds.map(med => (
                  <MedicineCard key={med.id} med={med} onEdit={() => openEditModal(med)} onToggle={() => handleToggle(med)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Thêm/Sửa thuốc */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !isSaving && setShowModal(false)}>
          <div
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-on-surface">
                {editingId ? '✏️ Chỉnh sửa thuốc' : '➕ Thêm thuốc mới'}
              </h3>
              <button disabled={isSaving} onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="close" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Tên thuốc <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-medicine-name"
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="VD: Amoxicillin 500mg"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Gợi ý liều dùng</label>
                <input
                  id="input-medicine-dose"
                  type="text"
                  value={formDose}
                  onChange={e => setFormDose(e.target.value)}
                  placeholder="VD: 1 viên × 3 lần/ngày"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Thời gian dùng</label>
                <input
                  id="input-medicine-duration"
                  type="text"
                  value={formDuration}
                  onChange={e => setFormDuration(e.target.value)}
                  placeholder="VD: 5 ngày"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Ghi chú cho bệnh nhân</label>
                <textarea
                  id="input-medicine-note"
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="VD: Uống sau ăn. Không uống rượu."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={isSaving}
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-variant transition-colors"
              >
                Hủy
              </button>
              <button
                id="btn-save-medicine"
                disabled={isSaving || !formName.trim()}
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</>
                ) : (
                  <><Icon name="save" className="text-base" /> {editingId ? 'Cập nhật' : 'Thêm thuốc'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Card thuốc ────────────────────────────────────────────────────────────────
const MedicineCard: React.FC<{
  med: Medicine;
  onEdit: () => void;
  onToggle: () => void;
}> = ({ med, onEdit, onToggle }) => (
  <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${med.isActive ? 'bg-surface border-outline-variant hover:border-primary/30' : 'bg-surface-variant/50 border-outline-variant/50'}`}>
    {/* Icon */}
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${med.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
      💊
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className={`font-semibold text-sm ${med.isActive ? 'text-on-surface' : 'text-on-surface-variant line-through'}`}>
          {med.name}
        </p>
        {!med.isActive && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Đã ẩn</span>
        )}
      </div>
      {(med.defaultDose || med.defaultDuration) && (
        <p className="text-xs text-on-surface-variant mt-0.5">
          {[med.defaultDose, med.defaultDuration].filter(Boolean).join(' · ')}
        </p>
      )}
      {med.defaultNote && (
        <p className="text-xs text-on-surface-variant/70 mt-0.5 italic truncate">{med.defaultNote}</p>
      )}
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={onEdit}
        title="Chỉnh sửa"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors"
      >
        <Icon name="edit" className="text-sm" />
      </button>
      <button
        onClick={onToggle}
        title={med.isActive ? 'Ẩn thuốc' : 'Hiện lại'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          med.isActive
            ? 'text-on-surface-variant hover:bg-red-50 hover:text-red-500'
            : 'text-on-surface-variant hover:bg-green-50 hover:text-green-600'
        }`}
      >
        <Icon name={med.isActive ? 'visibility_off' : 'visibility'} className="text-sm" />
      </button>
    </div>
  </div>
);

export default MedicineManagement;
