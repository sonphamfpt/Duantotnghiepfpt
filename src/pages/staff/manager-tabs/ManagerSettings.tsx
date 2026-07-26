import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { clinicApi } from '../../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Room { roomId: number; name: string; isActive: boolean; dentistId?: string; }

interface OperatingHour {
  weekday: number;
  openTime: string;
  closeTime: string;
  lunchStart: string | null;
  lunchEnd: string | null;
  isClosed: boolean;
}

interface MembershipTier {
  tierId: number;
  code: string;
  name: string;
  minPoints: number;
  discountPercent: number;
}

const DAY_NAMES = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const TIER_COLORS: Record<string, string> = {
  STANDARD:  'bg-slate-100 text-slate-700 border-slate-300',
  GOLD:      'bg-amber-50 text-amber-700 border-amber-300',
  PLATINUM:  'bg-sky-50 text-sky-700 border-sky-300',
  DIAMOND:   'bg-purple-50 text-purple-700 border-purple-300',
};

// ─── Sub-Tab: Dịch vụ ─────────────────────────────────────────────────────────

const ServicesTab: React.FC = () => {
  const { updateServicePrice, addService, toggleServiceActive } = useClinic();
  const [allServices, setAllServices] = useState<any[]>([]);
  const [loadingSvc, setLoadingSvc] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState('0');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [saving, setSaving] = useState(false);

  // Tải TẤT CẢ dịch vụ (kể cả đã tắt) để manager quản lý được đầy đủ
  const fetchAllServices = useCallback(async () => {
    setLoadingSvc(true);
    try {
      const res = await clinicApi.getAllServices();
      if (res.data) setAllServices(res.data);
    } catch {
      // fallback: nếu không có quyền hoặc lỗi mạng
    } finally {
      setLoadingSvc(false);
    }
  }, []);

  useEffect(() => { fetchAllServices(); }, [fetchAllServices]);

  // Sắp xếp đưa dịch vụ mới thêm (ID/Ngày tạo mới nhất) lên ĐẦU TIÊN
  const sortedServices = useMemo(() => {
    return [...allServices].sort((a, b) => {
      const numA = parseInt(a.id?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.id?.replace(/\D/g, '') || '0', 10);
      if (numA !== numB) return numB - numA;
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [allServices]);

  const handleSavePrice = async (id: string) => {
    const price = parseInt(editingPrice);
    if (isNaN(price) || price <= 0) { alert('Giá tiền không hợp lệ!'); return; }
    setSaving(true);
    await updateServicePrice(id, price);
    setEditingId(null);
    setSaving(false);
    await fetchAllServices(); // refresh local list
  };

  const handleToggle = async (id: string) => {
    await toggleServiceActive(id);
    await fetchAllServices(); // refresh local list ngay sau khi toggle
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice || !newDuration) return;
    setSaving(true);
    await addService({ name: newName, price: parseInt(newPrice), durationMin: parseInt(newDuration) });
    setNewName(''); setNewPrice(''); setNewDuration('30'); setShowAdd(false);
    setSaving(false);
    await fetchAllServices(); // refresh local list
  };

  if (loadingSvc) {
    return (
      <div className="flex items-center justify-center py-16 text-on-surface-variant">
        <span className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-3" />
        Đang tải danh sách dịch vụ...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1 hover:opacity-90 transition cursor-pointer shadow-sm">
          <Icon name="add" className="text-sm" /> Thêm dịch vụ mới
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedServices.map(service => (
          <div key={service.id} className={`bg-slate-50 p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between transition-all ${service.isActive ? 'border-outline-variant/50 hover:border-purple-600' : 'border-outline-variant/30 opacity-60'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${service.isActive ? 'bg-purple-600' : 'bg-slate-300'}`} />
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-outline-variant font-data-mono uppercase">ID: {service.id}</span>
              <h4 className="font-bold text-xs text-on-surface leading-snug min-h-8">{service.name}</h4>
              {editingId === service.id ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <input type="number" value={editingPrice} onChange={e => setEditingPrice(e.target.value)} className="w-24 bg-white border border-outline-variant rounded px-2 py-1 text-xs font-bold font-data-mono focus:outline-none" />
                  <button onClick={() => handleSavePrice(service.id)} disabled={saving} className="p-1 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700 cursor-pointer disabled:opacity-50">Lưu</button>
                  <button onClick={() => setEditingId(null)} className="p-1 bg-slate-400 text-white rounded text-[10px] cursor-pointer">✕</button>
                </div>
              ) : (
                <div className="flex justify-between items-baseline pt-1">
                  <p className="text-xs font-extrabold text-purple-700">₫{service.price.toLocaleString()}</p>
                  {service.isActive && <button onClick={() => { setEditingId(service.id); setEditingPrice(service.price.toString()); }} className="text-[9px] text-primary hover:underline font-bold cursor-pointer">Sửa giá</button>}
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-outline-variant/30 mt-3 text-[9px] text-on-surface-variant flex justify-between items-center">
              <span>⏱ {service.durationMin} phút</span>
              {/* Toggle switch – bật / tắt dịch vụ */}
              <button
                onClick={() => handleToggle(service.id)}
                title={service.isActive ? 'Nhấn để tắt dịch vụ này' : 'Nhấn để bật lại dịch vụ này'}
                className="flex items-center gap-1.5 cursor-pointer select-none group"
              >
                <span className={`text-[9px] font-bold transition-colors ${service.isActive ? 'text-secondary' : 'text-slate-400'}`}>
                  {service.isActive ? 'Đang bật' : 'Đã tắt'}
                </span>
                {/* pill track */}
                <span className={`relative inline-flex w-8 h-4 rounded-full transition-colors duration-300 shadow-inner ${service.isActive ? 'bg-secondary' : 'bg-slate-300 group-hover:bg-slate-400'}`}>
                  {/* thumb */}
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-300 ${service.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Service Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl border border-outline-variant max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-primary text-on-primary flex justify-between items-center rounded-t-xl">
              <h3 className="font-bold text-sm flex items-center gap-2"><Icon name="add_box" /> Thêm Dịch Vụ Mới</h3>
              <button onClick={() => setShowAdd(false)} className="text-on-primary cursor-pointer"><Icon name="close" /></button>
            </div>
            <form onSubmit={handleAddService} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Tên dịch vụ *</label>
                <input type="text" required placeholder="Ví dụ: Lấy cao răng siêu âm" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Giá (VNĐ) *</label>
                  <input type="number" required value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Thời gian (Phút) *</label>
                  <input type="number" required value={newDuration} onChange={e => setNewDuration(e.target.value)} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-bold cursor-pointer">Hủy</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Xác Nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-Tab: Phòng khám ──────────────────────────────────────────────────────

const RoomsTab: React.FC = () => {
  const { dentists } = useClinic();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDoctorId, setEditingDoctorId] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicApi.getRooms();
      if (res.data) setRooms(res.data);
    } catch { /* ignore - may not exist yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleSaveName = async (roomId: number) => {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      const docObj = dentists.find(d => d.id === editingDoctorId);
      await clinicApi.updateRoom(roomId, {
        name: editingName.trim(),
        dentistId: editingDoctorId || undefined,
        dentistName: docObj ? docObj.name : undefined,
      });
      await fetchRooms();
    } catch { alert('Lỗi khi cập nhật phòng khám.'); }
    finally { setEditingId(null); setSaving(false); }
  };

  const handleToggle = async (roomId: number, current: boolean) => {
    try {
      await clinicApi.updateRoom(roomId, { isActive: !current });
      await fetchRooms();
    } catch { alert('Lỗi khi thay đổi trạng thái phòng.'); }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setSaving(true);
    try {
      const docObj = dentists.find(d => d.id === newDoctorId);
      await clinicApi.createRoom({
        name: newRoomName.trim(),
        dentistId: newDoctorId || undefined,
        dentistName: docObj ? docObj.name : undefined,
      });
      setNewRoomName('');
      setNewDoctorId('');
      setShowAdd(false);
      await fetchRooms();
    } catch { alert('Lỗi khi thêm phòng mới.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-16"><Icon name="progress_activity" className="text-[32px] text-primary animate-spin" /></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1 hover:opacity-90 cursor-pointer shadow-sm">
          <Icon name="add" className="text-sm" /> Thêm phòng mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => {
          const assignedDoc = dentists.find(d => d.id === room.dentistId || d.room === room.name);
          return (
            <div key={room.roomId} className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${room.isActive ? 'border-outline-variant hover:border-primary/50' : 'border-outline-variant/30 opacity-60'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${room.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {room.isActive ? '● Hoạt động' : '○ Ngừng'}
                </span>
                <span className="text-[10px] font-data-mono text-outline">ID: {room.roomId}</span>
              </div>

              {editingId === room.roomId ? (
                <div className="space-y-2">
                  <input value={editingName} onChange={e => setEditingName(e.target.value)} className="w-full border border-primary rounded px-2 py-1 text-xs font-bold focus:outline-none" autoFocus placeholder="Tên phòng" />
                  <select value={editingDoctorId} onChange={e => setEditingDoctorId(e.target.value)} className="w-full border border-outline-variant rounded px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer">
                    <option value="">-- Chọn BS cố định --</option>
                    {dentists.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.role.split('&')[0]})</option>
                    ))}
                  </select>
                  <div className="flex gap-1.5 pt-1">
                    <button onClick={() => handleSaveName(room.roomId)} disabled={saving} className="px-3 py-1 bg-green-600 text-white rounded text-[10px] font-bold cursor-pointer disabled:opacity-50 flex-1">Lưu</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-400 text-white rounded text-[10px] cursor-pointer">✕ Hủy</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon name="meeting_room" className="text-primary text-[20px]" />
                    <h4 className="font-bold text-sm text-on-surface flex-1">{room.name}</h4>
                    <button onClick={() => { setEditingId(room.roomId); setEditingName(room.name); setEditingDoctorId(assignedDoc?.id || ''); }} className="text-outline hover:text-primary transition-colors cursor-pointer" title="Chỉnh sửa phòng & Bác sĩ phụ trách">
                      <Icon name="edit" className="text-[16px]" />
                    </button>
                  </div>

                  {/* Hiển thị bác sĩ cố định phụ trách phòng */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Icon name="badge" className="text-xs text-purple-600" /> BS Cố định:
                    </span>
                    {assignedDoc ? (
                      <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                        <img src={assignedDoc.avatar} alt={assignedDoc.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                        <span className="text-[11px] font-black text-purple-900">{assignedDoc.name.replace('Bác sĩ ', 'BS. ')}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chưa phân công</span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleToggle(room.roomId, room.isActive)}
                className={`mt-4 w-full py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${room.isActive ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
              >
                {room.isActive ? 'Tạm ngừng phòng' : 'Kích hoạt lại'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Room Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-6 py-4 bg-primary text-on-primary flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2"><Icon name="add_box" /> Thêm Phòng Khám Mới</h3>
              <button onClick={() => setShowAdd(false)} className="cursor-pointer hover:opacity-80"><Icon name="close" /></button>
            </div>
            <form onSubmit={handleAddRoom} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Tên phòng *</label>
                <input type="text" required autoFocus value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="VD: Phòng khám số 4" className="w-full border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Bác sĩ cố định phụ trách (Không bắt buộc)</label>
                <select
                  value={newDoctorId}
                  onChange={e => setNewDoctorId(e.target.value)}
                  className="w-full border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer bg-slate-50"
                >
                  <option value="">-- Chọn bác sĩ cố định --</option>
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.role.split('&')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-outline rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition-all">Hủy</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:opacity-95 cursor-pointer shadow-md disabled:opacity-50 transition-all">
                  {saving ? 'Đang lưu...' : 'Tạo phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-Tab: Giờ hoạt động ───────────────────────────────────────────────────

const OperatingHoursTab: React.FC = () => {
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<OperatingHour>>({});
  const [saving, setSaving] = useState(false);

  const fetchHours = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicApi.getOperatingHours();
      if (res.data) setHours(res.data);
    } catch { /* API may not exist yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHours(); }, [fetchHours]);

  const handleSave = async () => {
    if (editingDay === null) return;
    setSaving(true);
    try {
      await clinicApi.updateOperatingHour(editingDay, editForm);
      await fetchHours();
      setEditingDay(null);
    } catch { alert('Lỗi khi lưu giờ hoạt động.'); }
    finally { setSaving(false); }
  };

  const formatTime = (t: string | null) => t ? t.slice(0, 5) : '—';

  if (loading) return (
    <div className="flex justify-center py-16"><Icon name="progress_activity" className="text-[32px] text-primary animate-spin" /></div>
  );

  if (hours.length === 0) return (
    <div className="flex flex-col items-center py-16 gap-3 text-outline">
      <Icon name="schedule" className="text-[48px]" />
      <p className="text-sm font-semibold">Chưa có dữ liệu giờ hoạt động</p>
      <p className="text-xs">API /rooms/operating-hours chưa được cấu hình.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {hours.map(h => (
        <div key={h.weekday} className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${h.isClosed ? 'opacity-60 border-outline-variant/40' : 'border-outline-variant'}`}>
          {editingDay === h.weekday ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-sm text-on-surface w-24">{DAY_NAMES[h.weekday]}</h4>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={editForm.isClosed ?? h.isClosed} onChange={e => setEditForm(f => ({ ...f, isClosed: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                  Đóng cửa ngày này
                </label>
              </div>
              {!(editForm.isClosed ?? h.isClosed) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: 'Giờ mở cửa', key: 'openTime', val: editForm.openTime ?? h.openTime },
                    { label: 'Giờ đóng cửa', key: 'closeTime', val: editForm.closeTime ?? h.closeTime },
                    { label: 'Bắt đầu nghỉ trưa', key: 'lunchStart', val: editForm.lunchStart ?? h.lunchStart ?? '' },
                    { label: 'Kết thúc nghỉ trưa', key: 'lunchEnd', val: editForm.lunchEnd ?? h.lunchEnd ?? '' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">{field.label}</label>
                      <input type="time" value={field.val || ''} onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value || null }))} className="w-full border border-outline-variant rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingDay(null)} className="px-3 py-1.5 border border-outline rounded-lg text-xs font-bold cursor-pointer">Hủy</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${h.isClosed ? 'bg-slate-400' : 'bg-green-500'}`} />
                <h4 className="font-bold text-sm text-on-surface w-24">{DAY_NAMES[h.weekday]}</h4>
                {h.isClosed ? (
                  <span className="text-xs text-outline italic">Đóng cửa</span>
                ) : (
                  <div className="flex gap-4 text-xs text-on-surface-variant">
                    <span>🕐 {formatTime(h.openTime)} — {formatTime(h.closeTime)}</span>
                    {h.lunchStart && <span>🍱 {formatTime(h.lunchStart)} — {formatTime(h.lunchEnd)}</span>}
                  </div>
                )}
              </div>
              <button onClick={() => { setEditingDay(h.weekday); setEditForm({}); }} className="text-outline hover:text-primary transition-colors cursor-pointer">
                <Icon name="edit" className="text-[18px]" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Sub-Tab: Hạng thành viên ─────────────────────────────────────────────────

const MembershipTiersTab: React.FC = () => {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ discountPercent: string; minPoints: string }>({ discountPercent: '0', minPoints: '0' });
  const [saving, setSaving] = useState(false);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicApi.getMembershipTiers();
      if (res.data) setTiers(res.data);
    } catch { /* API may not exist yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const handleSave = async (tierId: number) => {
    setSaving(true);
    try {
      await clinicApi.updateMembershipTier(tierId, {
        discountPercent: parseFloat(editForm.discountPercent),
        minPoints: parseInt(editForm.minPoints),
      });
      await fetchTiers();
      setEditingId(null);
    } catch { alert('Lỗi khi cập nhật hạng thành viên.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-16"><Icon name="progress_activity" className="text-[32px] text-primary animate-spin" /></div>
  );

  if (tiers.length === 0) return (
    <div className="flex flex-col items-center py-16 gap-3 text-outline">
      <Icon name="workspace_premium" className="text-[48px]" />
      <p className="text-sm font-semibold">Chưa có dữ liệu hạng thành viên</p>
      <p className="text-xs">API /patients/tiers chưa được cấu hình.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {tiers.map(tier => {
        const colorClass = TIER_COLORS[tier.code] || 'bg-slate-100 text-slate-700 border-slate-300';
        return (
          <div key={tier.tierId} className={`rounded-2xl border-2 p-5 shadow-sm ${colorClass}`}>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="workspace_premium" className="text-[24px]" />
              <h3 className="font-extrabold text-base">{tier.name}</h3>
            </div>

            {editingId === tier.tierId ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">% Giảm giá</label>
                  <input type="number" step="0.5" min="0" max="100" value={editForm.discountPercent} onChange={e => setEditForm(f => ({ ...f, discountPercent: e.target.value }))} className="w-full border border-current/30 rounded-lg px-3 py-1.5 font-bold focus:outline-none bg-white/50" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">Số lần khám tối thiểu</label>
                  <input type="number" min="0" value={editForm.minPoints} onChange={e => setEditForm(f => ({ ...f, minPoints: e.target.value }))} className="w-full border border-current/30 rounded-lg px-3 py-1.5 font-bold focus:outline-none bg-white/50" placeholder="VD: 3" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 border border-current/30 rounded-lg text-[10px] font-bold cursor-pointer">Hủy</button>
                  <button onClick={() => handleSave(tier.tierId)} disabled={saving} className="flex-1 py-1.5 bg-current/20 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50">
                    {saving ? '...' : 'Lưu'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold opacity-70">Giảm giá</span>
                  <span className="text-xl font-extrabold">{tier.discountPercent}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold opacity-70">Số lần khám</span>
                  <span className="text-sm font-bold">{tier.minPoints.toLocaleString()} lần</span>
                </div>
                <button
                  onClick={() => { setEditingId(tier.tierId); setEditForm({ discountPercent: String(tier.discountPercent), minPoints: String(tier.minPoints) }); }}
                  className="mt-3 w-full py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border border-current/30 hover:bg-current/10 transition-colors"
                >
                  Chỉnh sửa
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SETTING_TABS = [
  { key: 'services',   label: 'Dịch vụ',          icon: 'medical_services' },
  { key: 'hours',      label: 'Giờ hoạt động',     icon: 'schedule' },
  { key: 'tiers',      label: 'Hạng thành viên',   icon: 'workspace_premium' },
] as const;

type SettingTab = typeof SETTING_TABS[number]['key'];

export const ManagerSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingTab>('services');

  const renderTab = () => {
    switch (activeTab) {
      case 'services': return <ServicesTab />;
      case 'hours':    return <OperatingHoursTab />;
      case 'tiers':    return <MembershipTiersTab />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Cấu Hình & Cài Đặt</h2>
        <p className="text-on-surface-variant text-xs font-semibold mt-0.5">
          Quản lý bảng giá dịch vụ, giờ hoạt động phòng khám và chương trình hạng thành viên.
        </p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 border border-outline-variant w-fit">
        {SETTING_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm border border-outline-variant/50'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Icon name={tab.icon} className="text-[16px]" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {renderTab()}
    </div>
  );
};
