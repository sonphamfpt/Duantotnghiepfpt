import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api/authApi';
import { Icon } from '../../components/Icon';

export const ProfileSettings: React.FC = () => {
  const { role, user, updateUserAvatar, refreshUser } = useAuth();

  // ── Avatar state ──
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Personal Info state (Role-based) ──
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.patientProfile?.dateOfBirth || '');
  const [gender, setGender] = useState(user?.patientProfile?.gender || 'Nam');
  const [address, setAddress] = useState(user?.patientProfile?.address || '');
  const [criticalAllergy, setCriticalAllergy] = useState(user?.patientProfile?.criticalAllergy || '');
  const [medicalCondition, setMedicalCondition] = useState(user?.patientProfile?.medicalCondition || '');

  const [specialty, setSpecialty] = useState(user?.dentistProfile?.specialty || '');
  const [degree, setDegree] = useState(user?.dentistProfile?.degree || '');
  const [experienceYears, setExperienceYears] = useState<number | string>(user?.dentistProfile?.experienceYears ?? '');
  const [bio, setBio] = useState(user?.dentistProfile?.bio || '');
  const [motto, setMotto] = useState(user?.dentistProfile?.motto || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Password state ──
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      if (user.patientProfile) {
        setDateOfBirth(user.patientProfile.dateOfBirth || '');
        setGender(user.patientProfile.gender || 'Nam');
        setAddress(user.patientProfile.address || '');
        setCriticalAllergy(user.patientProfile.criticalAllergy || '');
        setMedicalCondition(user.patientProfile.medicalCondition || '');
      }
      if (user.dentistProfile) {
        setSpecialty(user.dentistProfile.specialty || '');
        setDegree(user.dentistProfile.degree || '');
        setExperienceYears(user.dentistProfile.experienceYears ?? '');
        setBio(user.dentistProfile.bio || '');
        setMotto(user.dentistProfile.motto || '');
      }
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarMsg(null);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setAvatarMsg(null);
    try {
      const res = await authApi.uploadAvatar(avatarFile);
      if (res.success && res.data?.avatarUrl) {
        updateUserAvatar(res.data.avatarUrl);
        setAvatarMsg({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (err: any) {
      setAvatarMsg({ type: 'error', text: err.message || 'Upload thất bại, vui lòng thử lại.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const payload: Record<string, any> = {
        fullName,
        email,
      };

      if (role === 'patient') {
        payload.dateOfBirth = dateOfBirth;
        payload.gender = gender;
        payload.address = address;
        payload.criticalAllergy = criticalAllergy;
        payload.medicalCondition = medicalCondition;
      } else if (role === 'dentist') {
        payload.specialty = specialty;
        payload.degree = degree;
        payload.experienceYears = experienceYears;
        payload.bio = bio;
        payload.motto = motto;
      }

      const res = await authApi.updateProfile(payload);
      setProfileMsg({ type: 'success', text: res.message || 'Cập nhật thông tin cá nhân thành công!' });
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Cập nhật thất bại, vui lòng thử lại.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Vui lòng điền đầy đủ các trường mật khẩu.' });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu mới và xác nhận không khớp.' });
      return;
    }
    setChangingPwd(true);
    try {
      await authApi.changePassword(currentPwd, newPwd);
      setPwdMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || 'Đổi mật khẩu thất bại.' });
    } finally {
      setChangingPwd(false);
    }
  };

  const currentAvatar = avatarPreview || user?.avatar || '';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-bold text-on-surface">Cài đặt tài khoản</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Quản lý thông tin cá nhân, sơ yếu lý lịch và bảo mật tài khoản</p>
      </div>

      {/* ── Avatar Section ── */}
      <section className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/50 bg-gradient-to-r from-primary/5 to-transparent">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Icon name="account_circle" className="text-primary text-[20px]" />
            Ảnh đại diện
          </h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative shrink-0">
            <img
              src={currentAvatar}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-md"
            />
            {avatarPreview && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                Xem trước
              </span>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors cursor-pointer"
              title="Chọn ảnh mới"
            >
              <Icon name="photo_camera" className="text-[16px]" />
            </button>
          </div>

          {/* Upload controls */}
          <div className="flex-1 space-y-3 w-full">
            <div>
              <p className="text-sm font-semibold text-on-surface">{user?.name}</p>
              <p className="text-xs text-on-surface-variant">{user?.roleName}</p>
              {user?.phone && <p className="text-xs text-on-surface-variant">📱 {user.phone}</p>}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Icon name="upload" className="text-[16px]" />
                Chọn ảnh từ máy
              </button>
              {avatarFile && (
                <button
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {uploadingAvatar ? (
                    <Icon name="progress_activity" className="text-[16px] animate-spin" />
                  ) : (
                    <Icon name="check" className="text-[16px]" />
                  )}
                  {uploadingAvatar ? 'Đang lưu...' : 'Lưu ảnh'}
                </button>
              )}
              {avatarPreview && (
                <button
                  onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}
                  className="px-4 py-2 text-error border border-error/30 text-xs font-semibold rounded-xl hover:bg-error-container/30 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              )}
            </div>
            <p className="text-[10px] text-on-surface-variant">Hỗ trợ JPG, PNG, WEBP, GIF — tối đa 5MB</p>

            {avatarMsg && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${
                avatarMsg.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <Icon name={avatarMsg.type === 'success' ? 'check_circle' : 'error'} className="text-[16px]" />
                {avatarMsg.text}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Role-Based Personal Info Section ── */}
      <section className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/50 bg-gradient-to-r from-primary/5 to-transparent flex justify-between items-center">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Icon name="badge" className="text-primary text-[20px]" />
            Thông tin cá nhân ({user?.roleName})
          </h2>
          <span className="text-xs text-primary font-semibold flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full">
            <Icon name="edit" className="text-[14px]" />
            Chỉnh sửa theo Role
          </span>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                required
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Địa chỉ Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vd: user@example.com"
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
              />
            </div>

            {/* Phone (Readonly) */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Số điện thoại (Tài khoản)</label>
              <input
                type="text"
                value={user?.phone || ''}
                disabled
                className="w-full px-4 py-2.5 border border-outline-variant/60 rounded-xl text-sm bg-surface-container-low text-on-surface-variant cursor-not-allowed font-medium"
              />
            </div>

            {/* Role specific fields */}
            {role === 'patient' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Ngày sinh</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Giới tính</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Địa chỉ liên hệ</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Dị ứng đặc biệt (nếu có)</label>
                  <input
                    type="text"
                    value={criticalAllergy}
                    onChange={e => setCriticalAllergy(e.target.value)}
                    placeholder="vd: Dị ứng Penicillin, Tylenol..."
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Tiền sử bệnh lý (nếu có)</label>
                  <input
                    type="text"
                    value={medicalCondition}
                    onChange={e => setMedicalCondition(e.target.value)}
                    placeholder="vd: Cao huyết áp, Tiểu đường..."
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>
              </>
            )}

            {role === 'dentist' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Chuyên khoa nha khoa</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={e => setSpecialty(e.target.value)}
                    placeholder="vd: Chỉnh nha & Niềng răng thẩm mỹ"
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Học vị / Bằng cấp</label>
                  <input
                    type="text"
                    value={degree}
                    onChange={e => setDegree(e.target.value)}
                    placeholder="vd: Bác sĩ CKI - ĐH Y Dược"
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Số năm kinh nghiệm</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={e => setExperienceYears(e.target.value)}
                    placeholder="vd: 8"
                    min={0}
                    max={60}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Châm ngôn làm việc (Motto)</label>
                  <input
                    type="text"
                    value={motto}
                    onChange={e => setMotto(e.target.value)}
                    placeholder="vd: Nụ cười đẹp nhất là nụ cười tự tin nhất"
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">Tóm tắt tiểu sử & Quá trình công tác (Bio)</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Giới thiệu về chuyên môn và quá trình đào tạo công tác..."
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface resize-none"
                  />
                </div>
              </>
            )}
          </div>

          {profileMsg && (
            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${
              profileMsg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <Icon name={profileMsg.type === 'success' ? 'check_circle' : 'error'} className="text-[16px]" />
              {profileMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {savingProfile ? (
              <Icon name="progress_activity" className="text-[18px] animate-spin" />
            ) : (
              <Icon name="save" className="text-[18px]" />
            )}
            {savingProfile ? 'Đang lưu...' : 'Lưu thông tin cá nhân'}
          </button>
        </form>
      </section>

      {/* ── Change Password Section ── */}
      <section className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/50 bg-gradient-to-r from-primary/5 to-transparent">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Icon name="lock_reset" className="text-primary text-[20px]" />
            Đổi mật khẩu
          </h2>
        </div>
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Mật khẩu hiện tại</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-4 py-2.5 pr-10 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
              />
              <button type="button" onClick={() => setShowCurrent(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer">
                <Icon name={showCurrent ? 'visibility_off' : 'visibility'} className="text-[18px]" />
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="w-full px-4 py-2.5 pr-10 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
              />
              <button type="button" onClick={() => setShowNew(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer">
                <Icon name={showNew ? 'visibility_off' : 'visibility'} className="text-[18px]" />
              </button>
            </div>
            {newPwd && (
              <div className="mt-1.5 flex gap-1">
                {[4, 6, 8, 10].map(len => (
                  <div key={len} className={`flex-1 h-1 rounded-full transition-colors ${
                    newPwd.length >= len ? 'bg-primary' : 'bg-outline-variant'
                  }`} />
                ))}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface ${
                  confirmPwd && confirmPwd !== newPwd ? 'border-error' : 'border-outline-variant'
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer">
                <Icon name={showConfirm ? 'visibility_off' : 'visibility'} className="text-[18px]" />
              </button>
            </div>
            {confirmPwd && confirmPwd !== newPwd && (
              <p className="text-xs text-error mt-1">Mật khẩu xác nhận không khớp</p>
            )}
          </div>

          {pwdMsg && (
            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${
              pwdMsg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <Icon name={pwdMsg.type === 'success' ? 'check_circle' : 'error'} className="text-[16px]" />
              {pwdMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={changingPwd}
            className="w-full py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {changingPwd ? (
              <Icon name="progress_activity" className="text-[18px] animate-spin" />
            ) : (
              <Icon name="lock_reset" className="text-[18px]" />
            )}
            {changingPwd ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </section>
    </div>
  );
};
