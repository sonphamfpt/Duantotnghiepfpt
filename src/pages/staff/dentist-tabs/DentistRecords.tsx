import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { useSearchParams } from 'react-router-dom';
import { useClinic } from '../../../context/ClinicContext';
import { DentalChart, ToothSvg } from '../../../components/DentalChart';
import { ToothState } from '../../../types/clinic';

const TYPE_CONFIG = {
  pdf: { icon: 'picture_as_pdf', color: 'text-red-700 bg-red-50 border border-red-200', label: 'PDF' },
  image: { icon: 'image', color: 'text-emerald-700 bg-emerald-50 border border-emerald-200', label: 'Hình ảnh' },
  prescription: { icon: 'description', color: 'text-sky-700 bg-sky-50 border border-sky-200', label: 'Đơn thuốc' },
};

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  decay: { label: 'Sâu răng', color: 'text-amber-700 bg-amber-100 border-amber-300' },
  treated: { label: 'Đã điều trị tủy', color: 'text-primary bg-primary-container border-primary/30' },
  missing: { label: 'Mất răng', color: 'text-error bg-error-container border-error/30' },
  crown: { label: 'Bọc sứ', color: 'text-purple-700 bg-purple-100 border-purple-300' },
  bridge: { label: 'Cầu răng', color: 'text-indigo-700 bg-indigo-100 border-indigo-300' },
  implant: { label: 'Cấy ghép Implant', color: 'text-sky-800 bg-sky-100 border-sky-400' },
  healthy: { label: 'Khỏe mạnh', color: 'text-secondary bg-secondary-container border-secondary/30' },
};

export const DentistRecords: React.FC = () => {
  const { medicalRecords, patients, fetchPatientRecords } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId');

  const getEMRDetail = (notes: string | undefined, key: string, fallback: string = '') => {
    if (!notes || !notes.includes('|')) return fallback;
    const part = notes.split('|').find(p => p.trim().startsWith(key + ':'));
    if (!part) return fallback;
    return part.replace(key + ':', '').trim();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(urlPatientId);
  const [activeSection, setActiveSection] = useState<'timeline' | 'files' | 'teeth'>('timeline');
  const [viewRecord, setViewRecord] = useState<any | null>(null); // For image lightbox
  const [viewEMRRecord, setViewEMRRecord] = useState<typeof medicalRecords[0] | null>(null); // For EMR A4 replica
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotateDegree, setRotateDegree] = useState<number>(0);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

  useEffect(() => {
    setSelectedPatientId(urlPatientId);
  }, [urlPatientId]);

  const fetchedRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (selectedPatientId && fetchedRef.current !== selectedPatientId) {
      fetchedRef.current = selectedPatientId;
      setIsLoadingRecords(true);
      fetchPatientRecords(selectedPatientId).finally(() => {
        setIsLoadingRecords(false);
      });
    }
  }, [selectedPatientId, fetchPatientRecords]);

  const selectPatient = (id: string) => {
    setSelectedPatientId(id);
    fetchedRef.current = null;
    setIsLoadingRecords(true);
    setSearchParams(prev => {
      prev.set('patientId', id);
      return prev;
    });
  };

  const clearPatient = () => {
    setSelectedPatientId(null);
    setSearchParams(prev => {
      prev.delete('patientId');
      return prev;
    });
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientRecords = medicalRecords.filter(r => r.patientId === selectedPatientId);

  // State lưu trữ tài liệu / ảnh X-quang do Bác sĩ tải lên theo bệnh nhân (Mặc định rỗng {})
  const [uploadedFilesMap, setUploadedFilesMap] = useState<Record<string, any[]>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPatientId || !e.target.files || e.target.files.length === 0) return;
    
    const newFilesList: any[] = [];
    Array.from(e.target.files).forEach((file, index) => {
      const isImg = file.type.startsWith('image/');
      const fileUrl = isImg ? URL.createObjectURL(file) : '';
      newFilesList.push({
        id: `FILE-${Date.now()}-${index}`,
        type: isImg ? 'image' : 'pdf',
        category: isImg ? 'xray' : 'document',
        title: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toLocaleDateString('vi-VN'),
        url: fileUrl,
        uploadedBy: 'Bác sĩ điều trị',
      });
    });

    setUploadedFilesMap(prev => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), ...newFilesList]
    }));
    
    alert(`🎉 Đã tải lên thành công ${newFilesList.length} tài liệu/phim X-quang!`);
    e.target.value = '';
  };

  const handleDeleteFile = (fileId: string) => {
    if (!selectedPatientId) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa tài liệu này khỏi hồ sơ bệnh nhân?')) {
      setUploadedFilesMap(prev => ({
        ...prev,
        [selectedPatientId]: (prev[selectedPatientId] || []).filter(f => f.id !== fileId)
      }));
    }
  };

  const patientFiles = React.useMemo(() => {
    if (!selectedPatientId) return [];
    const customFiles = uploadedFilesMap[selectedPatientId] || [];
    
    // Tổng hợp file đính kèm thực tế từ các ca khám
    const recordFiles: any[] = [];
    patientRecords.forEach(rec => {
      if (rec.files) {
        rec.files.forEach((f: any) => {
          if (!customFiles.some(c => c.id === f.id)) {
            recordFiles.push({ ...f, date: rec.date });
          }
        });
      }
      if (rec.type === 'image' && rec.url) {
        if (!customFiles.some(c => c.id === rec.id) && !recordFiles.some(c => c.id === rec.id)) {
          recordFiles.push({
            id: rec.id,
            type: 'image' as const,
            title: rec.title || 'Ảnh phim X-quang',
            size: rec.size || '1.5 MB',
            url: rec.url,
            date: rec.date
          });
        }
      }
    });

    return [...customFiles, ...recordFiles];
  }, [selectedPatientId, uploadedFilesMap, patientRecords]);

  const sections = [
    { key: 'timeline' as const, label: 'Lịch sử điều trị', icon: 'timeline' },
    { key: 'files' as const, label: 'Tài liệu & X-quang', icon: 'folder_shared' },
    { key: 'teeth' as const, label: 'Sơ đồ răng', icon: 'dentistry' },
  ];

  const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  // Aggregate all tooth conditions from records
  const toothMap: Record<number, string> = {};
  patientRecords.forEach(r => {
    r.teethMap?.forEach(t => {
      let cond = t.condition;
      if (t.treatment && (t.treatment.includes('[Implant]') || t.treatment.toLowerCase().includes('implant'))) {
        cond = 'implant';
      }
      toothMap[t.toothNumber] = cond;
    });
  });

  const mergedTeethMap = toothMap;

  const TOOTH_COLORS: Record<string, string> = {
    decay: 'bg-amber-100 border-amber-400',
    treated: 'bg-primary-container border-primary',
    missing: 'bg-error-container border-error',
    crown: 'bg-purple-100 border-purple-400',
    healthy: 'bg-white border-outline-variant',
  };

  return (
    <div className="p-stack-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">Hồ sơ bệnh án EMR</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Tra cứu và quản lý hồ sơ lâm sàng điện tử của tất cả bệnh nhân</p>
      </div>

      {!selectedPatient ? (
        /* View 1: Patient List Table (Full Width) */
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col clinical-shadow animate-in fade-in duration-200">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Tìm bệnh nhân theo tên, mã hoặc SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="text-xs text-on-surface-variant font-medium">
              Tìm thấy <strong>{filteredPatients.length}</strong> bệnh nhân
            </div>
          </div>

          {/* Patient Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container text-on-surface-variant font-bold text-xs uppercase tracking-wider border-b border-outline-variant">
                <tr>
                  <th className="p-4 w-16 text-center">STT</th>
                  <th className="p-4">Mã bệnh nhân</th>
                  <th className="p-4">Họ và tên</th>
                  <th className="p-4">Thông tin cá nhân</th>
                  <th className="p-4">Tiền sử bệnh lý</th>
                  <th className="p-4 text-center">Hồ sơ lưu trữ</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredPatients.map((p, idx) => {
                  const recordCount = medicalRecords.filter(r => r.patientId === p.id).length;
                  return (
                    <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors group">
                      <td className="p-4 text-center font-medium text-on-surface-variant">{idx + 1}</td>
                      <td className="p-4 font-bold text-primary text-xs">{p.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-xs">
                            {p.name.split(' ').pop()?.charAt(0)}
                          </div>
                          <span className="font-bold text-on-surface">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-on-surface">{p.phone}</p>
                        <p className="text-xs text-on-surface-variant">
                          {p.age != null ? `${p.age} tuổi` : 'Chưa rõ tuổi'}
                          {p.gender ? ` • ${p.gender}` : ''}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {p.criticalAllergy !== 'Không' ? (
                            <span className="text-[10px] bg-error-container text-error px-2.5 py-0.5 rounded-full font-bold">
                              ⚠ Dị ứng: {p.criticalAllergy}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-semibold">
                              Không dị ứng
                            </span>
                          )}
                          {p.condition && p.condition !== 'Bình thường' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                              {p.condition}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-bold bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full border border-outline-variant/30">
                          {recordCount} hồ sơ
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => selectPatient(p.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs bg-primary text-white hover:bg-primary/95 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Icon name="visibility" className="text-[16px]" />
                          Xem hồ sơ EMR
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPatients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Icon name="search_off" className="text-[48px] text-outline mb-3" />
                <p className="text-on-surface font-bold">Không tìm thấy bệnh nhân nào</p>
                <p className="text-on-surface-variant text-sm mt-1">Vui lòng thử từ khóa hoặc mã số khác</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* View 2: Patient EMR Details (Full Width Workspace) */
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Back button and navigation bar */}
          <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant p-4 rounded-2xl shadow-sm">
            <button
              onClick={clearPatient}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-surface-container border border-outline-variant text-on-surface hover:text-primary rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              Quay lại danh sách bệnh nhân
            </button>
            <div className="text-xs text-on-surface-variant font-semibold">
              Đang xem hồ sơ: <span className="text-primary font-bold">{selectedPatient.name} ({selectedPatient.id})</span>
            </div>
          </div>

          {/* Patient summary card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-[#003a73] p-5 text-on-primary flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
                {selectedPatient.name.split(' ').pop()?.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-headline-sm text-headline-sm">{selectedPatient.name}</h3>
                <p className="text-sm opacity-80">
                  {selectedPatient.id}
                  {selectedPatient.age != null ? ` • ${selectedPatient.age} tuổi` : ''}
                  {selectedPatient.gender ? ` • ${selectedPatient.gender}` : ''}
                  {` • ${selectedPatient.phone}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">Ví thành viên: ₫{selectedPatient.balance.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 bg-slate-50/50">
              {[
                { label: 'Dị ứng', value: selectedPatient.criticalAllergy, alert: selectedPatient.criticalAllergy !== 'Không' },
                { label: 'Bệnh lý nền', value: selectedPatient.condition || 'Bình thường', alert: false },
                { label: 'Hồ sơ lưu trữ', value: patientFiles.length > 0 ? `${patientRecords.length} bệnh án • ${patientFiles.length} tệp` : `${patientRecords.length} bệnh án EMR`, alert: false },
              ].map((item, idx) => (
                <div key={item.label} className={`py-4 px-6 text-center flex flex-col justify-center ${item.alert ? 'bg-red-50/60' : ''} ${idx < 2 ? 'border-r border-slate-100' : ''}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${item.alert ? 'text-red-600' : 'text-slate-500'}`}>{item.label}</p>
                  <p className={`text-base font-extrabold mt-1 ${item.alert ? 'text-red-700' : 'text-slate-800'}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 border-b border-outline-variant">
            {sections.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`px-5 py-3 text-label-md font-bold flex items-center gap-2 border-b-2 -mb-px transition-all cursor-pointer ${activeSection === s.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <Icon name={s.icon} className="text-[18px]" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Timeline (now Table view) */}
          {activeSection === 'timeline' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-100/50 overflow-hidden flex flex-col">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-4 px-4 w-16 text-center">STT</th>
                      <th className="py-4 px-4">Ngày khám</th>
                      <th className="py-4 px-4">Nội dung / Dịch vụ</th>
                      <th className="py-4 px-4">Loại hồ sơ</th>
                      <th className="py-4 px-4">Trạng thái</th>
                      <th className="py-4 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patientRecords.map((rec, idx) => {
                      const typeConf = TYPE_CONFIG[rec.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.pdf;
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-5 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="py-5 px-4 font-bold text-slate-700">{rec.date}</td>
                          <td className="py-5 px-4">
                            <div className="max-w-[280px] truncate font-extrabold text-slate-800" title={rec.title}>
                              {rec.title}
                            </div>
                            {rec.notes && (
                              <p className="text-xs text-slate-500 max-w-[280px] truncate mt-1 font-medium" title={rec.notes}>
                                {rec.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-5 px-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full ${typeConf.color}`}>
                              <Icon name={typeConf.icon} className="text-[13px]" />
                              {typeConf.label}
                            </span>
                          </td>
                          <td className="py-5 px-4">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-200">
                              <Icon name="lock" className="text-[13px]" />
                              Đã ký số
                            </span>
                          </td>
                          <td className="py-5 px-4 text-right">
                            <button
                              onClick={() => setViewEMRRecord(rec)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border border-primary/20 text-primary bg-primary/5 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                            >
                              <Icon name="visibility" className="text-[14px]" />
                              Xem chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isLoadingRecords && (
                <div className="p-8 space-y-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 bg-slate-200 rounded-lg w-24"></div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoadingRecords && patientRecords.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="history" className="text-[60px] text-outline" />
                  <p className="text-on-surface-variant mt-3 font-semibold">Chưa có lịch sử điều trị</p>
                </div>
              )}
            </div>
          )}

          {/* Files / X-Ray Upload Tab */}
          {activeSection === 'files' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Toolbar Header */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Icon name="folder_shared" className="text-primary text-[20px]" />
                    Thư viện Ảnh X-quang & Tài liệu Lâm sàng
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Danh sách phim X-quang (Panorama, Cận chóp, CT 3D) và tài liệu đính kèm của bệnh nhân <strong>{selectedPatient?.name}</strong>
                  </p>
                </div>
              </div>

              {/* Files Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {patientFiles.map((file) => {
                  const isImage = file.type === 'image' || file.url;
                  return (
                    <div
                      key={file.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      {/* Image Preview Thumbnail */}
                      {isImage ? (
                        <div
                          onClick={() => {
                            setViewRecord(file);
                            setZoomScale(1);
                            setRotateDegree(0);
                          }}
                          className="w-full h-44 rounded-xl bg-slate-900 overflow-hidden relative mb-3 cursor-pointer group/img border border-slate-200 shadow-inner"
                        >
                          <img
                            src={file.url || 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80'}
                            alt={file.title}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 opacity-90 group-hover/img:opacity-100"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 backdrop-blur-[2px]">
                            <Icon name="zoom_in" className="text-2xl" />
                            <span className="text-xs font-bold">Xem phim X-quang</span>
                          </div>
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-black rounded-md uppercase tracking-wider shadow-sm">
                            Phim X-Quang
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-24 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-3">
                          <Icon name="picture_as_pdf" className="text-4xl" />
                        </div>
                      )}

                      {/* File details */}
                      <div className="space-y-1">
                        <h5 className="font-bold text-slate-800 text-xs line-clamp-1" title={file.title}>
                          {file.title}
                        </h5>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                          <span>{file.date} • {file.size || '1.2 MB'}</span>
                          {file.uploadedBy && <span className="text-primary font-bold">{file.uploadedBy}</span>}
                        </div>
                      </div>

                      {/* Card Action bar */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (isImage) {
                              setViewRecord(file);
                              setZoomScale(1);
                              setRotateDegree(0);
                            } else {
                              alert(`Đang mở file: ${file.title}`);
                            }
                          }}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Icon name={isImage ? "zoom_in" : "open_in_new"} className="text-sm" />
                          {isImage ? 'Phóng to phim' : 'Mở file'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => alert(`Tải xuống: ${file.title}`)}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Tải file"
                          >
                            <Icon name="download" className="text-base" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tài liệu"
                          >
                            <Icon name="delete" className="text-base" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {patientFiles.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Icon name="folder_open" className="text-3xl" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">Chưa có ảnh phim X-quang hay tài liệu đính kèm nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Bệnh nhân <strong>{selectedPatient?.name}</strong> chưa có phim chụp X-quang hay file xét nghiệm nào được lưu trong các lần khám trước.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Teeth map */}
          {activeSection === 'teeth' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-outline-variant p-6 shadow-sm">
                <DentalChart
                  teethState={Object.entries(mergedTeethMap).map(([num, cond]) => ({
                    toothNumber: Number(num),
                    condition: cond as ToothState['condition'],
                    treatment: patientRecords.flatMap(r => r.teethMap || []).find(t => t.toothNumber === Number(num))?.treatment
                  }))}
                  selectedTooth={selectedTooth}
                  onSelectTooth={(toothNum) => setSelectedTooth(selectedTooth === toothNum ? null : toothNum)}
                  patientAge={selectedPatient?.age}
                />
              </div>

              {Object.keys(mergedTeethMap).length > 0 && (
                <div className="mt-5 pt-4 border-t border-outline-variant bg-white rounded-2xl border border-outline-variant p-6 shadow-sm">
                  <p className="text-xs font-bold text-on-surface-variant uppercase mb-2">Tổng hợp tình trạng răng</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(mergedTeethMap).map(([toothNum, cond]) => (
                      <span key={toothNum} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${CONDITION_LABELS[cond]?.color || 'bg-surface-container border-outline-variant text-on-surface-variant'}`}>
                        R.{toothNum}: {CONDITION_LABELS[cond]?.label || cond}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* View EMR record modal */}
      {viewEMRRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewEMRRecord(null)}>
          <div className="bg-slate-100 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Icon name="folder_shared" className="text-primary text-[22px]" />
                <div>
                  <h3 className="font-bold text-sm">Chi tiết Hồ sơ Bệnh án EMR</h3>
                  <p className="text-[10px] text-slate-400">Mã hồ sơ: #{viewEMRRecord.id} • Ngày lập: {viewEMRRecord.date}</p>
                </div>
              </div>
              <button onClick={() => setViewEMRRecord(null)} className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer flex items-center justify-center">
                <Icon name="close" />
              </button>
            </div>

            {/* Split Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left side: Clinical Details & Teeth map */}
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm">
                    <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                      <Icon name="clinical_notes" className="text-[16px] text-primary" />
                      Thông tin chẩn đoán
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Hồ sơ / Điều trị chính</p>
                        <p className="font-bold text-sm text-slate-900">{viewEMRRecord.title}</p>
                      </div>

                      {viewEMRRecord.notes && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ghi chú & Đơn thuốc</p>
                          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed font-medium">
                            {viewEMRRecord.notes.includes('|') ? (
                              <div className="space-y-2">
                                {viewEMRRecord.notes.split('|').map((part, pIdx) => {
                                  const trimmed = part.trim();
                                  if (trimmed.startsWith('Dị ứng:')) {
                                    return <p key={pIdx}><strong>Dị ứng:</strong> <span className="text-error font-bold">{trimmed.replace('Dị ứng:', '').trim()}</span></p>;
                                  }
                                  if (trimmed.startsWith('Bệnh lý nền:')) {
                                    return <p key={pIdx}><strong>Bệnh lý nền:</strong> <span className="text-amber-800 font-bold">{trimmed.replace('Bệnh lý nền:', '').trim()}</span></p>;
                                  }
                                  if (trimmed.startsWith('Tuổi:')) {
                                    return <p key={pIdx}><strong>Tuổi:</strong> {trimmed.replace('Tuổi:', '').trim()}</p>;
                                  }
                                  if (trimmed.startsWith('Ngày sinh:')) {
                                    const dobVal = trimmed.replace('Ngày sinh:', '').trim();
                                    let ageStr = '';
                                    if (dobVal) {
                                      const dob = new Date(dobVal);
                                      const today = new Date();
                                      let age = today.getFullYear() - dob.getFullYear();
                                      const m = today.getMonth() - dob.getMonth();
                                      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                                      ageStr = ` (${age} tuổi)`;
                                    }
                                    return <p key={pIdx}><strong>Ngày sinh:</strong> {dobVal ? new Date(dobVal).toLocaleDateString('vi-VN') : 'Chưa nhập'}{ageStr}</p>;
                                  }
                                  if (trimmed.startsWith('Giới tính:')) {
                                    return <p key={pIdx}><strong>Giới tính:</strong> {trimmed.replace('Giới tính:', '').trim()}</p>;
                                  }
                                  if (trimmed.startsWith('Địa chỉ:')) {
                                    return <p key={pIdx}><strong>Địa chỉ:</strong> {trimmed.replace('Địa chỉ:', '').trim()}</p>;
                                  }
                                  if (trimmed.startsWith('Bệnh sử:')) {
                                    return <p key={pIdx} className="border-t border-amber-200/40 pt-2 mt-2"><strong>Bệnh sử / Lý do khám:</strong> <span className="italic">{trimmed.replace('Bệnh sử:', '').trim()}</span></p>;
                                  }
                                  if (trimmed.startsWith('Chẩn đoán:')) {
                                    return <p key={pIdx} className="border-t border-amber-200/40 pt-2 mt-2"><strong>Chẩn đoán (ICD-10):</strong> <span className="font-bold text-primary">{trimmed.replace('Chẩn đoán:', '').trim()}</span></p>;
                                  }
                                  if (trimmed.toLowerCase().includes('đơn thuốc:')) {
                                    return (
                                      <div key={pIdx} className="border-t border-amber-200/40 pt-2 mt-2">
                                        <p className="font-bold text-[10px] text-amber-800 uppercase tracking-wider mb-1">Đơn thuốc:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                          {trimmed.replace(/đơn thuốc:/i, '').split(';').map((drug, dIdx) => (
                                            <li key={dIdx}>{drug.trim()}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  }
                                  return <p key={pIdx} className="border-t border-amber-200/40 pt-2 mt-2">{trimmed}</p>;
                                })}
                              </div>
                            ) : (
                              <p className="whitespace-pre-line">{viewEMRRecord.notes}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Bác sĩ thực hiện</p>
                          <p className="font-bold text-slate-800">{viewEMRRecord.dentistName}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Kích thước lưu trữ</p>
                          <p className="font-bold text-slate-800">{viewEMRRecord.size}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teeth Map recorded on that day */}
                  {viewEMRRecord.teethMap && viewEMRRecord.teethMap.length > 0 && (
                    <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm">
                      <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
                        <Icon name="dentistry" className="text-[16px] text-primary" />
                        Sơ đồ răng điều trị ngày {viewEMRRecord.date}
                      </h4>

                      {/* Mini Tooth map */}
                      {(() => {
                        const hasChildTeeth = viewEMRRecord.teethMap?.some(t => t.toothNumber >= 50);
                        const upperRightTeeth = hasChildTeeth ? [55, 54, 53, 52, 51] : [18, 17, 16, 15, 14, 13, 12, 11];
                        const upperLeftTeeth = hasChildTeeth ? [61, 62, 63, 64, 65] : [21, 22, 23, 24, 25, 26, 27, 28];
                        const lowerRightTeeth = hasChildTeeth ? [85, 84, 83, 82, 81] : [48, 47, 46, 45, 44, 43, 42, 41];
                        const lowerLeftTeeth = hasChildTeeth ? [71, 72, 73, 74, 75] : [31, 32, 33, 34, 35, 36, 37, 38];

                        return (
                          <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 space-y-4">
                            {/* Upper */}
                            <div className="flex justify-center items-center gap-1 select-none">
                              {/* Q1 */}
                              <div className="flex gap-0.5 justify-end pr-2 border-r border-slate-300">
                                {upperRightTeeth.map(tooth => {
                                  const match = viewEMRRecord.teethMap?.find(t => t.toothNumber === tooth);
                                  const cond = match?.condition || 'healthy';
                                  return (
                                    <div key={tooth} title={`Răng ${tooth}: ${match?.treatment || CONDITION_LABELS[cond]?.label || 'Bình thường'}`}>
                                      <ToothSvg number={tooth} condition={cond} isSelected={false} width="18" height="28" textSize="text-[8px]" />
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Q2 */}
                              <div className="flex gap-0.5 justify-start pl-2">
                                {upperLeftTeeth.map(tooth => {
                                  const match = viewEMRRecord.teethMap?.find(t => t.toothNumber === tooth);
                                  const cond = match?.condition || 'healthy';
                                  return (
                                    <div key={tooth} title={`Răng ${tooth}: ${match?.treatment || CONDITION_LABELS[cond]?.label || 'Bình thường'}`}>
                                      <ToothSvg number={tooth} condition={cond} isSelected={false} width="18" height="28" textSize="text-[8px]" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="border-t border-dashed border-slate-200 my-1 text-center relative">
                              <span className="bg-white px-2 py-0.5 text-[8px] text-slate-400 font-bold border border-slate-200 rounded-full absolute -top-2.5 left-1/2 -translate-x-1/2">ĐƯỜNG GIỮA HÀM</span>
                            </div>

                            {/* Lower */}
                            <div className="flex justify-center items-center gap-1 select-none pt-1">
                              {/* Q4 */}
                              <div className="flex gap-0.5 justify-end pr-2 border-r border-slate-300">
                                {lowerRightTeeth.map(tooth => {
                                  const match = viewEMRRecord.teethMap?.find(t => t.toothNumber === tooth);
                                  const cond = match?.condition || 'healthy';
                                  return (
                                    <div key={tooth} title={`Răng ${tooth}: ${match?.treatment || CONDITION_LABELS[cond]?.label || 'Bình thường'}`}>
                                      <ToothSvg number={tooth} condition={cond} isSelected={false} width="18" height="28" textSize="text-[8px]" />
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Q3 */}
                              <div className="flex gap-0.5 justify-start pl-2">
                                {lowerLeftTeeth.map(tooth => {
                                  const match = viewEMRRecord.teethMap?.find(t => t.toothNumber === tooth);
                                  const cond = match?.condition || 'healthy';
                                  return (
                                    <div key={tooth} title={`Răng ${tooth}: ${match?.treatment || CONDITION_LABELS[cond]?.label || 'Bình thường'}`}>
                                      <ToothSvg number={tooth} condition={cond} isSelected={false} width="18" height="28" textSize="text-[8px]" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Detailed tooth conditions table */}
                      <div className="mt-3 space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                        {viewEMRRecord.teethMap.map((t, idx) => {
                          const showCustomTreatmentNote = t.treatment &&
                            !t.treatment.includes('Gói Chăm Sóc') &&
                            !t.treatment.includes('Răng Nhựa') &&
                            !t.treatment.toLowerCase().includes('mất răng');
                          return (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="font-bold text-slate-700">Răng số {t.toothNumber}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CONDITION_LABELS[t.condition]?.color || ''}`}>
                                  {CONDITION_LABELS[t.condition]?.label}
                                </span>
                                {showCustomTreatmentNote && (
                                  <span className="text-slate-500 font-medium truncate max-w-[120px]">({t.treatment})</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Print/Download helper buttons */}
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow cursor-pointer"
                  >
                    <Icon name="download" className="text-[18px]" />Tải PDF bệnh án (Lưu file)
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="py-2.5 px-4 border border-outline-variant hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Icon name="print" className="text-[18px]" />In hồ sơ
                  </button>
                </div>
              </div>

              {/* Right side: Signed PDF Document view (A4 sheet replica) */}
              <div className="lg:col-span-7 bg-slate-400/20 rounded-xl border border-slate-300 p-4 lg:p-6 flex justify-center items-start overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="bg-white max-w-[595px] w-full p-6 lg:p-8 shadow-lg rounded border border-slate-300 text-slate-700 text-xs font-medium space-y-6 relative text-left">

                  {/* Signed Watermark */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none select-none border-8 border-green-700 p-6 rounded-full text-center rotate-12">
                    <span className="text-4xl font-extrabold text-green-700 tracking-wider">ĐÃ KÝ SỐ EMR</span>
                    <br />
                    <span className="text-xl font-bold text-green-700">GOOD SMILE CLINIC</span>
                  </div>

                  {/* PDF Header */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-sm font-black text-primary">NHA KHOA GOOD SMILE</h2>
                      <p className="text-[9px] text-slate-500 mt-0.5">Địa chỉ: 123 Đường Ba Tháng Hai, Quận 10, TP.HCM</p>
                      <p className="text-[9px] text-slate-500">Hotline: 1900 6789 | Email: contact@goodsmile.vn</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-600 whitespace-nowrap">MÃ SỐ BỆNH ÁN: EMR-{viewEMRRecord.id}</p>
                      <p className="text-[9px] text-slate-400 whitespace-nowrap">Ngày lưu trữ: {viewEMRRecord.date}</p>
                    </div>
                  </div>

                  <h1 className="text-center text-sm font-black uppercase text-slate-900 tracking-wider">HỒ SƠ BỆNH ÁN ĐIỆN TỬ</h1>

                  {/* Patient Info */}
                  {selectedPatient && (
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200/50">
                      <p className="text-[9px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Thông tin hành chính</p>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-slate-700">
                        <p className="col-span-2"><strong>Họ và tên bệnh nhân:</strong> {selectedPatient.name}</p>
                        <p><strong>Mã bệnh nhân:</strong> {selectedPatient.id}</p>
                        <p><strong>Ngày sinh:</strong> {(() => {
                          const dobVal = getEMRDetail(viewEMRRecord.notes, 'Ngày sinh');
                          if (!dobVal) return selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa nhập';
                          return new Date(dobVal).toLocaleDateString('vi-VN');
                        })()}</p>
                        <p><strong>Giới tính:</strong> {getEMRDetail(viewEMRRecord.notes, 'Giới tính') || selectedPatient.gender || 'Chưa nhập'}</p>
                        <p><strong>Số điện thoại:</strong> {selectedPatient.phone}</p>
                        <p><strong>Bệnh lý toàn thân:</strong> {getEMRDetail(viewEMRRecord.notes, 'Bệnh lý nền') || selectedPatient.condition || 'Bình thường'}</p>
                        <p className="col-span-2"><strong>Địa chỉ:</strong> {getEMRDetail(viewEMRRecord.notes, 'Địa chỉ') || selectedPatient.address || 'Chưa nhập'}</p>
                        <p className="col-span-2"><strong>Dị ứng:</strong> <span className={(getEMRDetail(viewEMRRecord.notes, 'Dị ứng') || selectedPatient.criticalAllergy) !== 'Không' ? 'text-error font-bold' : ''}>{getEMRDetail(viewEMRRecord.notes, 'Dị ứng') || selectedPatient.criticalAllergy}</span></p>
                      </div>
                    </div>
                  )}

                  {/* Treatment details */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-primary uppercase border-b border-slate-200 pb-1 text-left">Chẩn đoán và Thủ thuật điều trị</p>
                    <div className="space-y-1.5 text-left">
                      <p><strong>Dịch vụ chính thực hiện:</strong> {viewEMRRecord.title}</p>
                      {(viewEMRRecord.type === 'image' || (viewEMRRecord.files && viewEMRRecord.files.some(f => f.type === 'image'))) && (
                        <div className="space-y-2 mt-4 text-left">
                          <p className="text-[9px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Hình ảnh đính kèm</p>
                          {viewEMRRecord.files && viewEMRRecord.files.filter(f => f.type === 'image').length > 0 && (
                            <div className="grid grid-cols-2 gap-3 pt-1 text-left mb-2">
                              {viewEMRRecord.files.filter(file => file.type === 'image').map(file => (
                                <div key={file.id} className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-300">
                                    <img
                                      src={file.url || (file.id === 'F-112' || file.title?.toLowerCase().includes('niềng răng') ? '/braces_progress.png' : '/xray_panorama.png')}
                                      alt={file.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-[10px] text-slate-800 truncate" title={file.title}>{file.title}</p>
                                    <p className="text-[8px] text-slate-400 font-mono">{file.size} • IMAGE</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center h-[180px]">
                            <img
                              src={viewEMRRecord.url || (viewEMRRecord.files && viewEMRRecord.files.find(f => f.type === 'image')?.url) || (viewEMRRecord.id === 'MR-02' ? '/braces_progress.png' : '/xray_panorama.png')}
                              alt="Clinical Scan"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        </div>
                      )}
                      {viewEMRRecord.teethMap && viewEMRRecord.teethMap.length > 0 && (
                        <div className="pl-3 border-l-2 border-primary/50 text-[11px] text-slate-600 space-y-1">
                          <p className="font-semibold text-slate-700 text-xs">Chi tiết răng điều trị:</p>
                          {viewEMRRecord.teethMap.map((t, idx) => {
                            const showCustomTreatmentNote = t.treatment &&
                              !t.treatment.includes('Gói Chăm Sóc') &&
                              !t.treatment.includes('Răng Nhựa') &&
                              !t.treatment.toLowerCase().includes('mất răng');
                            return (
                              <p key={idx}>• Răng số {t.toothNumber}: {CONDITION_LABELS[t.condition]?.label} {showCustomTreatmentNote ? `— ${t.treatment}` : ''}</p>
                            );
                          })}
                        </div>
                      )}
                      {viewEMRRecord.notes && (
                        <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 text-left space-y-1">
                          <p className="font-bold text-slate-600 mb-1 text-[10px] uppercase">Ghi chú lâm sàng:</p>
                          {viewEMRRecord.notes.includes('|') ? (
                            viewEMRRecord.notes.split('|').map((part, idx) => {
                              const trimmed = part.trim();
                              if (trimmed.startsWith('Dị ứng:') || trimmed.startsWith('Bệnh lý nền:') || trimmed.toLowerCase().startsWith('đơn thuốc:')) return null;
                              if (trimmed.startsWith('Bệnh sử:')) return <p key={idx} className="italic">"{trimmed.replace('Bệnh sử:', '').trim()}"</p>;
                              if (trimmed.startsWith('Chẩn đoán:')) return <p key={idx}><strong>ICD-10:</strong> <span className="font-bold text-primary">{trimmed.replace('Chẩn đoán:', '').trim()}</span></p>;
                              return <p key={idx} className="italic">{trimmed}</p>;
                            })
                          ) : (
                            <p className="italic">"{viewEMRRecord.notes}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PDF prescription if it contains prescription */}
                  {viewEMRRecord.notes && viewEMRRecord.notes.toLowerCase().includes('đơn thuốc:') && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Toa thuốc điều trị chỉ định</p>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[9px] font-bold">
                            <th className="py-1.5">Tên thuốc</th>
                            <th className="py-1.5 text-center w-16">SL</th>
                            <th className="py-1.5">Hướng dẫn sử dụng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {viewEMRRecord.notes.split('|').filter(part => part.toLowerCase().includes('đơn thuốc:')).map((rxPart, rxIdx) => {
                            const rawDrugs = rxPart.replace(/đơn thuốc:/i, '').trim().split(';');
                            return rawDrugs.map((drug, drugIdx) => {
                              const match = drug.match(/(.*?)\s*\((.*?)\)\s*-\s*(.*)/);
                              if (match) {
                                return (
                                  <tr key={`${rxIdx}-${drugIdx}`}>
                                    <td className="py-1.5 font-bold text-slate-800">{match[1]}</td>
                                    <td className="py-1.5 text-center">{match[2]}</td>
                                    <td className="py-1.5 italic text-slate-600">{match[3]}</td>
                                  </tr>
                                );
                              }
                              return (
                                <tr key={`${rxIdx}-${drugIdx}`}>
                                  <td colSpan={3} className="py-1.5 italic text-slate-600">{drug.trim()}</td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Official sign area */}
                  <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-[10px]">
                    <div>
                      <p className="uppercase font-bold text-slate-400">Người bệnh / Người giám hộ</p>
                      <p className="text-[8px] text-slate-400 italic">(Đã ký điện tử qua cổng Patient App)</p>
                      <div className="h-14 flex items-center justify-center">
                        <span className="text-green-600 text-xs font-bold border border-green-200 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Icon name="check_circle" className="text-[14px]" />
                          ĐÃ XÁC NHẬN
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{selectedPatient?.name}</p>
                    </div>
                    <div>
                      <p className="uppercase font-bold text-slate-400">Bác sĩ điều trị ký</p>
                      <p className="text-[8px] text-slate-400 italic">(Ký và đóng dấu số điện tử E-Signature)</p>
                      <div className="h-14 flex flex-col items-center justify-center relative">
                        <span className="font-serif text-primary text-sm font-extrabold italic border-b border-primary/50 leading-none pb-0.5">
                          {viewEMRRecord.dentistName?.replace('Bác sĩ ', '') || ''}
                        </span>
                        <span className="text-[7px] text-green-700 bg-green-50 px-1 border border-green-200 rounded mt-1 font-mono uppercase tracking-widest scale-90">DIGITALLY SIGNED</span>
                      </div>
                      <p className="font-bold text-slate-800">{viewEMRRecord.dentistName || ''}</p>
                    </div>
                  </div>

                  {/* Verification footer */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[8px] text-slate-400 font-mono">
                    <span className="flex items-center gap-0.5 whitespace-nowrap">
                      <Icon name="verified_user" className="text-[10px] text-green-600" />
                      Xác thực số: EMR-SECURE-SHA256
                    </span>
                    <span className="truncate max-w-[260px]" title="5a9f2d8e7b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d">
                      SHA-256: 5a9f2d8e7b1a2c3d4e5f6a7b8c9...
                    </span>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* File Lightbox Viewer Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setViewRecord(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-900 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="photo_camera_back" className="text-primary text-[20px]" />
                {viewRecord.type === 'image' ? 'Trình xem ảnh y khoa X-Quang' : 'Tài liệu EMR đính kèm'}
              </h3>
              <button onClick={() => setViewRecord(null)} className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer text-white flex items-center justify-center">
                <Icon name="close" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center flex-1 overflow-y-auto custom-scrollbar">
              {viewRecord.type === 'image' ? (
                <div className="w-full space-y-4">
                  {/* Medical tools bar */}
                  <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl border border-outline-variant/60">
                    <span className="text-[11px] font-bold text-slate-600 pl-2">Công cụ phim chụp:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setZoomScale(prev => Math.min(prev + 0.2, 2.5))}
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Phóng to"
                      >
                        <Icon name="zoom_in" className="text-[14px]" />
                        Phóng to
                      </button>
                      <button
                        onClick={() => setZoomScale(prev => Math.max(prev - 0.2, 0.6))}
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Thu nhỏ"
                      >
                        <Icon name="zoom_out" className="text-[14px]" />
                        Thu nhỏ
                      </button>
                      <button
                        onClick={() => setRotateDegree(prev => (prev + 90) % 360)}
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Xoay ảnh"
                      >
                        <Icon name="rotate_right" className="text-[14px]" />
                        Xoay 90°
                      </button>
                      <button
                        onClick={() => { setZoomScale(1); setRotateDegree(0); }}
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Đặt lại"
                      >
                        <Icon name="restart_alt" className="text-[14px]" />
                        Đặt lại
                      </button>
                    </div>
                  </div>

                  {/* Lightbox canvas */}
                  <div className="w-full bg-slate-955 rounded-2xl h-[300px] flex items-center justify-center relative overflow-hidden border border-slate-800 shadow-inner select-none">
                    <img
                      src={viewRecord.url || (viewRecord.id === 'F-112' || viewRecord.title?.toLowerCase().includes('niềng răng') ? '/braces_progress.png' : '/xray_panorama.png')}
                      alt={viewRecord.title}
                      style={{
                        transform: `scale(${zoomScale}) rotate(${rotateDegree}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
                    />

                    {/* Corner overlay info */}
                    <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded text-[9px] text-white/80 font-mono tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                      IMAGING SCAN SOURCE: GOODSMILE DENTAL
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/70 px-2.5 py-1 rounded text-[9px] text-white/80 font-mono">
                      SCALE: {Math.round(zoomScale * 100)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-slate-900 rounded-2xl h-[250px] flex flex-col items-center justify-center relative overflow-hidden mb-6 shadow-inner">
                  <Icon name="description" className="text-white/20 text-[100px]" />
                </div>
              )}

              <div className="w-full text-left mt-4">
                <h4 className="font-extrabold text-on-surface text-base">{viewRecord.title}</h4>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mt-1">Dung lượng: {viewRecord.size} • Định dạng: {viewRecord.type.toUpperCase()}</p>
                <p className="text-[11px] text-on-surface-variant mt-2 italic">Ghi chú: Đây là phim chụp X-quang chẩn đoán y khoa chính thức, dùng để đánh giá lộ trình xương răng trong bệnh án EMR của bệnh nhân.</p>
              </div>

              <div className="flex gap-2 w-full mt-6">
                <button
                  onClick={() => alert(`Tải xuống: ${viewRecord.title}`)}
                  className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-bold cursor-pointer hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md text-xs"
                >
                  <Icon name="download" className="text-[18px]" />
                  Tải File Về Máy
                </button>
                <button
                  onClick={() => setViewRecord(null)}
                  className="px-6 py-3 border border-outline-variant text-slate-700 hover:bg-slate-100 rounded-xl font-bold cursor-pointer active:scale-95 transition-all text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
