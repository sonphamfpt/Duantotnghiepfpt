import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { staffApi, clinicApi } from '../../../services/api';
import { EditDoctorModal } from '../../../components/EditDoctorModal';

interface StaffMember {
  id: string;
  dentistId?: string;
  name: string;
  role: 'dentist' | 'receptionist' | 'cashier' | 'manager';
  roleName: string;
  phone: string;
  email: string;
  avatar: string;
  status: 'Active' | 'Inactive';
  permissions: {
    admission: boolean;
    clinical: boolean;
    checkout: boolean;
    settings: boolean;
  };
}

interface CreatedAccountInfo {
  name: string;
  phone: string;
  email?: string;
  password: string;
  roleName: string;
}

export const ManagerRbac: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [selectedDentistIdForEdit, setSelectedDentistIdForEdit] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | 'password' | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'dentist' | 'receptionist' | 'cashier' | 'manager'>('dentist');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchStaffList = async () => {
    setLoading(true);
    try {
      const response = await staffApi.getStaff();
      if (response.success && response.data) {
        setStaffList(response.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách nhân sự:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP0123456789!@#';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pwd);
  };

  const handleCopy = (text: string, field: 'phone' | 'email' | 'password') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const togglePermission = async (id: string, key: keyof StaffMember['permissions']) => {
    try {
      const res = await staffApi.togglePermission(id, key);
      if (res.success) {
        setStaffList((prev) =>
          prev.map((member) => {
            if (member.id === id) {
              return {
                ...member,
                permissions: {
                  ...member.permissions,
                  [key]: !member.permissions[key]
                }
              };
            }
            return member;
          })
        );
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật phân quyền:', err);
      alert('Không thể cập nhật phân quyền nhân sự.');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await staffApi.toggleStatus(id);
      if (res.success) {
        setStaffList((prev) =>
          prev.map((member) => {
            if (member.id === id) {
              const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active';
              return { ...member, status: nextStatus };
            }
            return member;
          })
        );
      }
    } catch (err) {
      console.error('Lỗi khi thay đổi trạng thái:', err);
      alert('Không thể thay đổi trạng thái hoạt động.');
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');

    if (!newName.trim() || !newPhone.trim() || !newPassword.trim()) {
      alert('Vui lòng điền họ tên, số điện thoại đăng nhập và mật khẩu!');
      return;
    }

    const cleanPhone = newPhone.trim();
    if (!/^[0-9]{9,11}$/.test(cleanPhone)) {
      setPhoneError('Số điện thoại phải bao gồm 9-11 chữ số.');
      return;
    }

    try {
      const res = await staffApi.createStaff({
        name: newName.trim(),
        role: newRole,
        phone: cleanPhone,
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
      });

      if (res.success) {
        alert('Tạo tài khoản nhân sự mới thành công!');
        fetchStaffList();

        const roleNames: Record<string, string> = {
          dentist: 'Bác sĩ nha khoa',
          receptionist: 'Lễ tân tiếp nhận',
          cashier: 'Nhân viên thu ngân',
          manager: 'Quản lý phòng khám'
        };

        setCreatedAccount({
          name: newName.trim(),
          phone: cleanPhone,
          email: newEmail.trim().toLowerCase(),
          password: newPassword.trim(),
          roleName: roleNames[newRole],
        });

        // Reset form
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('dentist');
        setPhoneError('');
        setShowAddStaffModal(false);
      }
    } catch (err: any) {
      console.error(err);
      setPhoneError(err.message || 'Lỗi khi tạo tài khoản nhân sự.');
    }
  };

  const getRoleBadge = (role: StaffMember['role']) => {
    switch (role) {
      case 'dentist':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'receptionist':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cashier':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="groups" className="text-purple-600 font-bold" />
          <div>
            <h3 className="font-bold text-on-surface">Nhân Sự & Phân Quyền</h3>
            <p className="text-xs text-on-surface-variant">Quản lý sơ đồ tài khoản nhân viên và thay đổi quyền truy cập phân hệ</p>
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowAddStaffModal(true)}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-primary-container transition-all cursor-pointer shadow-md"
          >
            <Icon name="person_add" className="text-sm" />
            Thêm Nhân Sự Mới
          </button>
        </div>
      </div>

      {/* Staff directory table */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Thành viên</th>
                <th className="px-6 py-3.5">Vai trò</th>
                <th className="px-6 py-3.5">SĐT & Email đăng nhập</th>
                <th className="px-6 py-3.5 text-center">Trạng thái</th>
                <th className="px-6 py-3.5 text-center">Đón tiếp</th>
                <th className="px-6 py-3.5 text-center">Lâm sàng</th>
                <th className="px-6 py-3.5 text-center">Tính tiền</th>
                <th className="px-6 py-3.5 text-center">Cấu hình</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-xs">
              {staffList.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover border" />
                      <div>
                        <h4 className="font-bold text-on-surface text-xs">{member.name}</h4>
                        <span className="text-[10px] text-outline font-bold font-data-mono">{member.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getRoleBadge(member.role)}`}>
                      {member.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                        <Icon name="phone font-bold" className="text-xs text-amber-700" />
                        {member.phone || 'Chưa cập nhật'}
                      </span>
                      {member.email && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {member.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(member.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${member.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      title="Click để khoá/kích hoạt tài khoản"
                    >
                      {member.status === 'Active' ? 'HOẠT ĐỘNG' : 'TẠM KHOÁ'}
                    </button>
                  </td>
                  {/* Permissions checkboxes */}
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={member.permissions.admission}
                      onChange={() => togglePermission(member.id, 'admission')}
                      className="w-4 h-4 text-purple-600 border-outline-variant rounded focus:ring-purple-600 focus:ring-1 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={member.permissions.clinical}
                      onChange={() => togglePermission(member.id, 'clinical')}
                      className="w-4 h-4 text-purple-600 border-outline-variant rounded focus:ring-purple-600 focus:ring-1 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={member.permissions.checkout}
                      onChange={() => togglePermission(member.id, 'checkout')}
                      className="w-4 h-4 text-purple-600 border-outline-variant rounded focus:ring-purple-600 focus:ring-1 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={member.permissions.settings}
                      onChange={() => togglePermission(member.id, 'settings')}
                      className="w-4 h-4 text-purple-600 border-outline-variant rounded focus:ring-purple-600 focus:ring-1 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {member.role === 'dentist' && member.dentistId && (
                        <button
                          onClick={() => setSelectedDentistIdForEdit(member.dentistId!)}
                          className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg transition-all cursor-pointer text-[10px] font-extrabold flex items-center gap-1"
                          title="Sửa thông tin học vấn, bằng cấp, kinh nghiệm bác sĩ"
                        >
                          <Icon name="edit_note" className="text-sm" />
                          <span>Sửa Hồ Sơ ({member.dentistId})</span>
                        </button>
                      )}
                      <button
                        onClick={() => alert(`Lịch sử truy cập của ${member.name} đã được lưu tại log file của Manager.`)}
                        className="p-1 border border-outline text-on-surface-variant hover:text-purple-600 rounded transition-all cursor-pointer"
                        title="Lịch sử đăng nhập"
                      >
                        <Icon name="history_edu" className="text-sm block" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Doctor Modal ── */}
      {selectedDentistIdForEdit && (
        <EditDoctorModal
          isOpen={Boolean(selectedDentistIdForEdit)}
          dentistId={selectedDentistIdForEdit}
          onClose={() => setSelectedDentistIdForEdit(null)}
          onSuccess={() => {
            fetchStaffList();
          }}
        />
      )}

      {/* ── Add Staff Modal ── */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-outline-variant max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal header */}
            <div className="px-6 py-4 bg-primary text-on-primary flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
                <Icon name="person_add" />
                Khai Báo Nhân Sự Mới
              </h3>
              <button onClick={() => { setShowAddStaffModal(false); setPhoneError(''); }} className="text-on-primary hover:text-white cursor-pointer">
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                  Họ tên nhân viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Thị Hằng"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                  Chức danh & Phân hệ mặc định *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-primary"
                >
                  <option value="dentist">Bác sĩ nha khoa</option>
                  <option value="receptionist">Lễ tân tiếp nhận</option>
                  <option value="cashier">Nhân viên thu ngân</option>
                  <option value="manager">Quản trị hệ thống / Giám đốc</option>
                </select>
              </div>

              {/* Divider */}
              <div className="border-t border-outline-variant pt-3">
                <p className="text-[10px] uppercase font-extrabold text-purple-600 mb-3 flex items-center gap-1">
                  <Icon name="key" className="text-sm" />
                  Thông tin tài khoản đăng nhập
                </p>

                {/* Phone number */}
                <div className="mb-3">
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                    Số điện thoại đăng nhập *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0909000010"
                    value={newPhone}
                    onChange={(e) => { setNewPhone(e.target.value); setPhoneError(''); }}
                    className={`w-full bg-surface-container-low border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary ${phoneError ? 'border-error bg-error-container/20' : 'border-outline-variant'
                      }`}
                  />
                  {phoneError && (
                    <p className="text-[10px] text-error font-semibold mt-1 flex items-center gap-1">
                      <Icon name="error" className="text-sm" />{phoneError}
                    </p>
                  )}
                </div>

                {/* Email (Optional) */}
                <div className="mb-3">
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                    Email liên hệ (Tùy chọn)
                  </label>
                  <input
                    type="email"
                    placeholder="Ví dụ: hang.nguyen@goodsmile.vn"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                    Mật khẩu *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Tối thiểu 6 ký tự"
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-9 text-xs font-semibold focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                      >
                        <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-sm" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generatePassword}
                      title="Tạo mật khẩu ngẫu nhiên"
                      className="px-3 py-2 border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <Icon name="casino" className="text-sm" />
                      Tạo tự động
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => { setShowAddStaffModal(false); setPhoneError(''); }}
                  className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-bold cursor-pointer hover:bg-surface-container transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Icon name="person_add" className="text-sm" />
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Created Account Success Modal ── */}
      {createdAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-outline-variant max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Success header */}
            <div className="bg-emerald-500 text-white px-6 py-5 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="check_circle" className="text-[36px]" />
              </div>
              <h3 className="font-headline-sm text-headline-sm">Tạo tài khoản thành công!</h3>
              <p className="text-sm text-white/80 mt-1">Nhân sự có thể đăng nhập ngay bằng SĐT</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Staff info */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant space-y-3">
                <p className="text-[10px] uppercase font-extrabold text-on-surface-variant tracking-wider">Thông tin tài khoản</p>

                <div>
                  <p className="text-[10px] text-on-surface-variant mb-0.5">Họ tên nhân viên</p>
                  <p className="font-bold text-on-surface text-sm">{createdAccount.name}</p>
                  <p className="text-[10px] text-on-surface-variant font-bold text-purple-700">{createdAccount.roleName}</p>
                </div>

                {/* Phone row */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-700 mb-1 flex items-center gap-1">
                    <Icon name="phone" className="text-xs" />
                    Số điện thoại đăng nhập *
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono font-extrabold text-amber-900 truncate">
                      {createdAccount.phone}
                    </code>
                    <button
                      onClick={() => handleCopy(createdAccount.phone, 'phone')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${copiedField === 'phone'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                        }`}
                      title="Sao chép SĐT"
                    >
                      <Icon name={copiedField === 'phone' ? 'check' : 'content_copy'} className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Password row */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-600 mb-1">Mật khẩu *</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono font-bold text-on-surface truncate">
                      {createdAccount.password}
                    </code>
                    <button
                      onClick={() => handleCopy(createdAccount.password, 'password')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${copiedField === 'password'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                        }`}
                      title="Sao chép mật khẩu"
                    >
                      <Icon name={copiedField === 'password' ? 'check' : 'content_copy'} className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                <Icon name="warning" className="text-amber-500 text-sm shrink-0 mt-0.5" />
                <span>Hãy ghi lại thông tin tài khoản và bàn giao cho nhân viên. Mật khẩu không thể xem lại sau khi đóng cửa sổ này.</span>
              </div>

              <button
                onClick={() => { setCreatedAccount(null); setCopiedField(null); }}
                className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                Đã lưu thông tin, Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
