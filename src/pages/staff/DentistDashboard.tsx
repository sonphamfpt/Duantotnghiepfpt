import React, { useState } from 'react';
import { Icon } from '../../components/Icon';
import { useSearchParams } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { DentalChart } from '../../components/DentalChart';
import { ToothState } from '../../types/clinic';

// Tab imports
import { DentistQueue } from './dentist-tabs/DentistQueue';
import { DentistRecords } from './dentist-tabs/DentistRecords';
import { DentistSchedule } from './dentist-tabs/DentistSchedule';

const AVAILABLE_DRUGS = [
  { id: 'D-01', name: 'Paracetamol 500mg', type: 'Viên', defaultInstruction: 'Uống 1 viên mỗi 6 giờ khi đau, sau ăn.' },
  { id: 'D-02', name: 'Amoxicillin 500mg', type: 'Viên', defaultInstruction: 'Uống 1 viên sau ăn, ngày 2 lần (sáng/tối).' },
  { id: 'D-03', name: 'Ibuprofen 400mg', type: 'Viên', defaultInstruction: 'Uống 1 viên khi đau buốt nhiều, tối đa 3 lần/ngày.' },
  { id: 'D-04', name: 'Metronidazole 250mg', type: 'Viên', defaultInstruction: 'Uống 1 viên sau ăn, ngày 3 lần.' },
  { id: 'D-05', name: 'Nước súc miệng Givalex 125ml', type: 'Chai', defaultInstruction: 'Súc miệng 2-3 lần/ngày, pha loãng với nước ấm.' },
  { id: 'D-06', name: 'Alpha Chymotrypsin 4.2mg', type: 'Viên', defaultInstruction: 'Ngậm dưới lưỡi 2 viên, ngày 3 lần.' },
];

const TEMPLATE_PRESETS: Record<string, Array<{ name: string; quantity: number; unit: string; instruction: string }>> = {
  'Sau điều trị sâu răng / Hàn răng': [
    { name: 'Paracetamol 500mg', quantity: 10, unit: 'Viên', instruction: 'Uống 1 viên mỗi 6 giờ khi đau buốt.' }
  ],
  'Chăm sóc sau nhổ răng khôn': [
    { name: 'Amoxicillin 500mg', quantity: 20, unit: 'Viên', instruction: 'Uống 1 viên sau ăn, ngày 2 lần (sáng/tối).' },
    { name: 'Paracetamol 500mg', quantity: 10, unit: 'Viên', instruction: 'Uống 1 viên mỗi 6 giờ khi đau.' },
    { name: 'Alpha Chymotrypsin 4.2mg', quantity: 20, unit: 'Viên', instruction: 'Ngậm dưới lưỡi 2 viên, ngày 3 lần.' }
  ],
  'Sau điều trị tủy răng (Nội nha)': [
    { name: 'Amoxicillin 500mg', quantity: 14, unit: 'Viên', instruction: 'Uống 1 viên sau ăn, ngày 2 lần (sáng/tối).' },
    { name: 'Ibuprofen 400mg', quantity: 10, unit: 'Viên', instruction: 'Uống 1 viên khi đau buốt nhiều, sau ăn.' }
  ]
};

const STATIC_TOOTH_MAP: Record<string, Record<number, string>> = {
  'P-8821': { 38: 'missing', 48: 'missing', 15: 'treated', 25: 'treated', 16: 'crown' },
  'P-9902': { 46: 'decay', 38: 'missing', 36: 'treated' },
};

// ─── Home (Bàn khám lâm sàng) ──────────────────────────────────────────────────
const DentistHome: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { queue, patients, medicalRecords, services, startTreatment, completeTreatment } = useClinic();

  const dentistId = 'D-04';
  const dentistName = 'Bác sĩ Nguyễn Hương';

  const initialQueueId = searchParams.get('queueId');
  const inChairItem = queue.find(q => q.dentistId === dentistId && q.status === 'In Chair');
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(inChairItem?.id || initialQueueId);
  const [activeTab, setActiveTab] = useState<'teeth' | 'diagnosis' | 'services' | 'prescription' | 'files'>('teeth');
  const [selectedToothNum, setSelectedToothNum] = useState<number | null>(null);

  const [formAllergy, setFormAllergy] = useState('');
  const [formCondition, setFormCondition] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('Bệnh nhân buốt răng hàm dưới khi ăn lạnh');
  const [icdCode, setIcdCode] = useState('K02.1 - Sâu ngà răng');
  const [rxTemplate, setRxTemplate] = useState('Sau điều trị sâu răng / Hàn răng');

  const [activeTeethState, setActiveTeethState] = useState<ToothState[]>([]);
  const [performedServices, setPerformedServices] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [prescriptionDrugs, setPrescriptionDrugs] = useState<Array<{ name: string; quantity: number; unit: string; instruction: string }>>(
    JSON.parse(JSON.stringify(TEMPLATE_PRESETS['Sau điều trị sâu răng / Hàn răng']))
  );
  const [selectedAddDrugId, setSelectedAddDrugId] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; type: 'pdf' | 'image' | 'prescription'; title: string; size: string; url?: string }>>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFilesList = Array.from(files).map(file => {
      const type = file.type.includes('pdf') ? 'pdf' as const : 'image' as const;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        id: `F-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        type,
        title: file.name,
        size: `${sizeMB} MB`,
        url: URL.createObjectURL(file)
      };
    });
    setUploadedFiles(prev => [...prev, ...newFilesList]);
  };

  const handleAddPresetFile = (presetType: 'xray' | 'clinical' | 'lab') => {
    let newFile;
    if (presetType === 'xray') {
      newFile = {
        id: `F-${Date.now()}-XR`,
        type: 'image' as const,
        title: 'Phim chụp X-quang Panorama toàn hàm.png',
        size: '4.5 MB',
        url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&h=450&q=80'
      };
    } else if (presetType === 'clinical') {
      newFile = {
        id: `F-${Date.now()}-CL`,
        type: 'image' as const,
        title: 'Ảnh lâm sàng trạng thái răng miệng.png',
        size: '1.8 MB',
        url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=600&h=450&q=80'
      };
    } else {
      newFile = {
        id: `F-${Date.now()}-PDF`,
        type: 'pdf' as const,
        title: 'Báo cáo xét nghiệm huyết học & Đông máu.pdf',
        size: '1.2 MB',
        url: '#'
      };
    }
    setUploadedFiles(prev => [...prev, newFile]);
  };

  const dentistQueue = queue.filter(q => q.dentistId === dentistId && q.status !== 'Completed');
  const activeQueueItem = queue.find(q => q.id === selectedQueueId);
  const activePatient = activeQueueItem ? patients.find(p => p.id === activeQueueItem.patientId) : null;
  const activePatientRecords = activePatient ? medicalRecords.filter(r => r.patientId === activePatient.id) : [];
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));

  const [treatmentType, setTreatmentType] = useState<'independent' | 'plan_init' | 'plan_session'>('independent');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const patientPlans = React.useMemo(() => {
    return activePatientRecords.filter(r => r.title.includes('Khởi tạo phác đồ') || r.notes?.includes('[PHÁC ĐỒ]'));
  }, [activePatientRecords]);

  const hasAllergyConflict = React.useMemo(() => {
    if (!activePatient || !activePatient.criticalAllergy || activePatient.criticalAllergy === 'Không') return false;
    const patientAllergy = activePatient.criticalAllergy.toLowerCase().trim();
    return prescriptionDrugs.some(drug => {
      const drugName = drug.name.toLowerCase();
      if (drugName.includes(patientAllergy) || patientAllergy.includes(drugName)) return true;
      if (patientAllergy === 'penicillin' && drugName.includes('amoxicillin')) return true;
      if (patientAllergy === 'amoxicillin' && drugName.includes('penicillin')) return true;
      return false;
    });
  }, [activePatient, prescriptionDrugs]);

  const hasServiceMismatch = React.useMemo(() => {
    if (performedServices.length === 0) return null;
    const lowerIcd = icdCode.toLowerCase();
    
    const isSauRang = lowerIcd.includes('sâu');
    const isNhoRang = performedServices.some(id => id === 'S-04');
    const isTramRang = performedServices.some(id => id === 'S-03');
    
    if (isSauRang && isNhoRang && !isTramRang) {
      return 'Cảnh báo lâm sàng: Chẩn đoán là sâu răng nhưng đang chỉ định Nhổ răng khôn (không có dịch vụ Trám răng).';
    }
    
    const isTuy = lowerIcd.includes('tủy');
    const isTieuPhauTuy = performedServices.some(id => id === 'S-05' || id === 'S-11');
    if (isTuy && !isTieuPhauTuy) {
      return 'Cảnh báo lâm sàng: Chẩn đoán bệnh lý tủy răng nhưng chưa chỉ định dịch vụ Điều trị tủy hoặc Tiểu phẫu cắt chóp.';
    }
    return null;
  }, [icdCode, performedServices]);

  React.useEffect(() => {
    if (activePatient) {
      setFormAllergy(activePatient.criticalAllergy || 'Không');
      setFormCondition(activePatient.condition || 'Bình thường');

      // Sync active teeth state from EMR + static map
      const pId = activePatient.id;
      const pRecords = medicalRecords.filter(r => r.patientId === pId);
      
      const baseMap = { ...(STATIC_TOOTH_MAP[pId] || {}) };
      const consolidated: Record<number, ToothState> = {};
      
      // Load baseline
      Object.entries(baseMap).forEach(([num, cond]) => {
        const tNum = Number(num);
        consolidated[tNum] = {
          toothNumber: tNum,
          condition: cond as ToothState['condition'],
          treatment: pRecords.flatMap(r => r.teethMap || []).find(t => t.toothNumber === tNum)?.treatment || 'Tình trạng ban đầu'
        };
      });
      
      // Overwrite from medical records (oldest to newest)
      [...pRecords].reverse().forEach(r => {
        r.teethMap?.forEach(t => {
          consolidated[t.toothNumber] = {
            toothNumber: t.toothNumber,
            condition: t.condition,
            treatment: t.treatment
          };
        });
      });
      
      setActiveTeethState(Object.values(consolidated));
    } else {
      setActiveTeethState([]);
    }
  }, [activePatient?.id, medicalRecords]);

  const handleSelectQueueItem = (id: string) => {
    setSelectedQueueId(id);
    const item = queue.find(q => q.id === id);
    if (item && item.status === 'Waiting') {
      startTreatment(id);
    }
    setPerformedServices([]);
    setServiceSearch('');
    setPrescriptionDrugs(JSON.parse(JSON.stringify(TEMPLATE_PRESETS['Sau điều trị sâu răng / Hàn răng'])));
    setRxTemplate('Sau điều trị sâu răng / Hàn răng');
    setTreatmentType('independent');
    setSelectedPlanId('');
    setUploadedFiles([]);
    setActiveTab('teeth');
  };

  const handleToothClick = (num: number) => { setSelectedToothNum(num); };

  const handleDiagnoseTooth = (condition: ToothState['condition'], serviceId?: string) => {
    if (!selectedToothNum) return;
    const service = services.find(s => s.id === serviceId);
    const newToothState: ToothState = {
      toothNumber: selectedToothNum,
      condition,
      treatment: service ? service.name : undefined
    };
    setActiveTeethState(prev => {
      const filtered = prev.filter(t => t.toothNumber !== selectedToothNum);
      if (condition === 'healthy') return filtered;
      return [...filtered, newToothState];
    });
    if (serviceId && !performedServices.includes(serviceId)) {
      setPerformedServices(prev => [...prev, serviceId]);
    }
    
    const conditionLabels: Record<string, string> = {
      healthy: 'Khỏe mạnh',
      decay: 'Sâu răng',
      treated: 'Đã trám',
      missing: 'Mất răng',
      crown: 'Bọc sứ',
      bridge: 'Cầu răng',
    };
    alert(`Đã chẩn đoán Răng ${selectedToothNum}: ${conditionLabels[condition] || condition}`);
    setSelectedToothNum(null);
  };

  const handleServiceCheckbox = (id: string) => {
    setPerformedServices(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleAddDrug = (drugId: string) => {
    const drug = AVAILABLE_DRUGS.find(d => d.id === drugId);
    if (!drug) return;
    if (prescriptionDrugs.some(d => d.name === drug.name)) {
      alert('Thuốc này đã có trong đơn!');
      return;
    }
    setPrescriptionDrugs(prev => [
      ...prev,
      { name: drug.name, quantity: 10, unit: drug.type, instruction: drug.defaultInstruction }
    ]);
    setSelectedAddDrugId('');
  };

  const handleTemplateChange = (templateName: string) => {
    setRxTemplate(templateName);
    const preset = TEMPLATE_PRESETS[templateName];
    if (preset) {
      setPrescriptionDrugs(JSON.parse(JSON.stringify(preset)));
    } else {
      setPrescriptionDrugs([]);
    }
  };

  const handleFinalize = () => {
    if (!selectedQueueId) return;
    const drugListStr = prescriptionDrugs.map(d => `${d.name} (${d.quantity} ${d.unit}) - ${d.instruction}`).join('; ');
    const finalNotes = `Dị ứng: ${formAllergy} | Bệnh lý nền: ${formCondition}. Bệnh sử: ${chiefComplaint} - Chẩn đoán: ${icdCode}${drugListStr ? ` | Đơn thuốc: ${drugListStr}` : ''}`;
    completeTreatment(
      selectedQueueId,
      activeTeethState,
      finalNotes,
      performedServices.length > 0 ? performedServices : ['S-08'],
      treatmentType,
      selectedPlanId,
      uploadedFiles
    );
    if (treatmentType === 'plan_session') {
      alert(`Đã hoàn tất phiên điều trị thuộc Phác đồ #${selectedPlanId} thành công (Không sinh thêm hóa đơn)!`);
    } else if (treatmentType === 'plan_init') {
      alert('Đã khởi tạo phác đồ điều trị thành công và gửi hóa đơn tổng sang quầy Thu ngân!');
    } else {
      alert('Đã hoàn tất ca điều trị lâm sàng và gửi hóa đơn thanh toán thành công!');
    }
    setSelectedQueueId(null);
    setPerformedServices([]);
    setServiceSearch('');
    setPrescriptionDrugs([]);
    setTreatmentType('independent');
    setSelectedPlanId('');
    setUploadedFiles([]);
  };

  return (
    <div className="p-container-padding-desktop space-y-6 animate-in fade-in duration-200">
      {activeQueueItem && activePatient ? (
        /* Active Treatment Area */
        <div className="flex flex-col gap-6 animate-in slide-in-from-bottom duration-300">

          {/* Top: Premium Patient Details Summary */}
          <section className="bg-white rounded-2xl border border-outline-variant shadow-sm flex flex-col lg:flex-row items-stretch relative overflow-hidden">
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-secondary"></div>
            
            {/* Patient Info Block */}
            <div className="p-6 lg:w-1/2 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-outline-variant/50 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-primary/20 text-primary flex items-center justify-center text-2xl font-black shrink-0 relative">
                  {activePatient.name.split(' ').pop()?.charAt(0)}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-on-surface leading-tight mb-1.5">{activePatient.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-white border border-outline-variant px-2 py-0.5 rounded text-[11px] font-bold text-on-surface-variant shadow-sm">#{activePatient.id}</span>
                    <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">{activePatient.age} Tuổi</span>
                    <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">{activePatient.gender}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <div className={`flex-1 p-2.5 rounded-xl border flex items-center gap-3 ${activePatient.criticalAllergy !== 'Không' ? 'bg-error-container/30 border-error/30' : 'bg-surface-container border-outline-variant/50'}`}>
                  <Icon
                    name={activePatient.criticalAllergy !== 'Không' ? 'warning' : 'verified'}
                    className={`text-lg ${activePatient.criticalAllergy !== 'Không' ? 'text-error' : 'text-on-surface-variant'}`}
                  />
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest opacity-70 mb-0.5">Dị ứng</p>
                    <p className={`text-xs font-bold ${activePatient.criticalAllergy !== 'Không' ? 'text-error' : 'text-on-surface'}`}>{activePatient.criticalAllergy}</p>
                  </div>
                </div>
                <div className={`flex-1 p-2.5 rounded-xl border flex items-center gap-3 ${activePatient.condition !== 'Bình thường' ? 'bg-amber-50 border-amber-200' : 'bg-surface-container border-outline-variant/50'}`}>
                  <Icon
                    name={activePatient.condition !== 'Bình thường' ? 'medical_information' : 'favorite'}
                    className={`text-lg ${activePatient.condition !== 'Bình thường' ? 'text-amber-600' : 'text-on-surface-variant'}`}
                  />
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest opacity-70 mb-0.5">Bệnh nền</p>
                    <p className={`text-xs font-bold ${activePatient.condition !== 'Bình thường' ? 'text-amber-800' : 'text-on-surface'}`}>{activePatient.condition}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Treatment History Block */}
            <div className="p-6 lg:w-1/2 flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  <Icon name="history" className="text-sm" />
                  Lịch sử điều trị gần đây
                  <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">
                    {activePatientRecords.length}
                  </span>
                </h4>
              </div>
              
              <div className="overflow-y-auto max-h-[140px] border border-outline-variant rounded-lg custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container sticky top-0 text-[10px] uppercase text-on-surface-variant z-10">
                    <tr>
                      <th className="px-4 py-2.5 font-bold w-12 text-center">STT</th>
                      <th className="px-4 py-2.5 font-bold">Ngày khám</th>
                      <th className="px-4 py-2.5 font-bold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {activePatientRecords.map((rec, index) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-center font-medium text-on-surface-variant">{index + 1}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-on-surface">{rec.date}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => setSearchParams({ tab: 'records', patientId: activePatient.id })}
                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm border border-green-200/50"
                          >
                            <Icon name="folder_shared" className="text-[14px]" />
                            Xem chi tiết EMR
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activePatientRecords.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-on-surface-variant text-xs">
                          <Icon name="inventory_2" className="text-2xl mb-1 opacity-50 block" />
                          Chưa có lịch sử điều trị
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Bottom: Diagnosis and Interactive dental chart */}
          <section className="bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
                {[
                  { key: 'teeth' as const, label: 'Sơ đồ răng khám' },
                  { key: 'diagnosis' as const, label: 'Bệnh sử & Chẩn đoán' },
                  { key: 'services' as const, label: 'Chỉ định dịch vụ' },
                  { key: 'prescription' as const, label: 'Đơn thuốc mẫu' },
                  { key: 'files' as const, label: 'Tài liệu & X-quang' },
                ].map(t => {
                  const isSelected = activeTab === t.key;
                  const countBadge = t.key === 'files' && uploadedFiles.length > 0 ? ` (${uploadedFiles.length})` : '';
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`font-bold px-4 py-2 rounded-lg transition-all cursor-pointer text-sm ${isSelected ? 'bg-white text-primary shadow-sm border border-outline-variant/20' : 'text-on-surface-variant hover:text-on-surface hover:bg-slate-200/50'}`}
                    >
                      {t.label}{countBadge}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-semibold font-data-mono bg-surface-container px-3 py-1 rounded">
                Phiên khám: #EMR-{activeQueueItem.id}
              </span>
            </div>

            <div className="p-6 space-y-6">

              {/* Tab 1: Sơ đồ răng khám */}
              {activeTab === 'teeth' && (
                <div className="space-y-6">
                  <DentalChart
                    teethState={activeTeethState}
                    selectedTooth={selectedToothNum}
                    onSelectTooth={handleToothClick}
                    patientAge={activePatient?.age}
                  />
                  {selectedToothNum && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3 animate-in fade-in duration-200">
                      <h4 className="font-bold text-primary text-xs uppercase">Chẩn đoán và xử lý cho Răng {selectedToothNum}:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button type="button" onClick={() => handleDiagnoseTooth('healthy')} className="bg-white border border-outline-variant rounded p-2 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">Khỏe mạnh (Xóa bệnh lý)</button>
                        <button type="button" onClick={() => handleDiagnoseTooth('decay', 'S-03')} className="bg-error-container text-error border border-error rounded p-2 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer">Sâu răng (Trám răng)</button>
                        <button type="button" onClick={() => handleDiagnoseTooth('crown', 'S-03')} className="bg-amber-50 text-amber-800 border border-amber-500 rounded p-2 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer">Hỏng bọc sứ (Làm răng sứ)</button>
                        <button type="button" onClick={() => handleDiagnoseTooth('missing', 'S-04')} className="bg-slate-100 text-outline border border-outline border-dashed rounded p-2 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer">Răng sâu nặng (Nhổ răng)</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Bệnh sử & Chẩn đoán */}
              {activeTab === 'diagnosis' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase text-error">Ghi chú Dị ứng</label>
                      <input 
                        type="text" 
                        value={formAllergy} 
                        onChange={e => setFormAllergy(e.target.value)}
                        placeholder="Không hoặc nhập dị ứng..."
                        className="w-full bg-error-container/10 border border-error/30 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-error/20 focus:border-error focus:outline-none text-error font-medium transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase text-amber-700">Ghi chú Bệnh lý nền</label>
                      <input 
                        type="text" 
                        value={formCondition} 
                        onChange={e => setFormCondition(e.target.value)}
                        placeholder="Bình thường hoặc nhập bệnh lý..."
                        className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none text-amber-900 font-medium transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase text-on-surface-variant">Mô tả bệnh sử & Lý do khám * (Khung rộng rãi cho bác sĩ gõ mô tả dài)</label>
                    <textarea 
                      value={chiefComplaint} 
                      onChange={e => setChiefComplaint(e.target.value)} 
                      placeholder="Nhập chi tiết triệu chứng lâm sàng, lý do khám và bệnh sử của bệnh nhân..."
                      className="w-full bg-slate-50 border border-outline-variant/65 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white focus:outline-none transition-all" 
                      rows={5} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase text-on-surface-variant">Chẩn đoán y khoa (Mã ICD-10) *</label>
                    <input 
                      type="text" 
                      value={icdCode} 
                      onChange={e => setIcdCode(e.target.value)} 
                      placeholder="Nhập mã ICD-10 và tên bệnh..."
                      className="w-full bg-slate-50 border border-outline-variant/65 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white focus:outline-none transition-all" 
                    />
                  </div>

                  {/* Phác đồ & Lộ trình điều trị */}
                  <div className="bg-slate-50 border border-outline-variant/60 rounded-xl p-4 space-y-3">
                    <label className="block text-xs font-bold uppercase text-on-surface-variant flex items-center gap-1.5">
                      <Icon name="route" className="text-[16px] text-primary" />
                      Phác đồ & Lộ trình điều trị
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div 
                        onClick={() => setTreatmentType('independent')}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1 select-none ${treatmentType === 'independent' ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-slate-305 bg-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="medical_services" className={`text-base ${treatmentType === 'independent' ? 'text-primary' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold">Điều trị độc lập</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">Sinh hóa đơn mới cho các dịch vụ thực hiện trong ngày.</p>
                      </div>

                      <div 
                        onClick={() => setTreatmentType('plan_init')}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1 select-none ${treatmentType === 'plan_init' ? 'border-teal-600 bg-teal-50/30' : 'border-outline-variant hover:border-slate-305 bg-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="assignment_add" className={`text-base ${treatmentType === 'plan_init' ? 'text-teal-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-teal-950">Khởi tạo phác đồ</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">Lập lộ trình dài hạn (Niềng răng, Implant...). Xuất hóa đơn tổng 1 lần.</p>
                      </div>

                      <div 
                        onClick={() => {
                          if (patientPlans.length > 0) {
                            setTreatmentType('plan_session');
                            if (!selectedPlanId) setSelectedPlanId(patientPlans[0].id);
                          } else {
                            alert('Bệnh nhân này hiện chưa có Phác đồ điều trị dài hạn nào để chọn phiên tiếp theo!');
                          }
                        }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1 select-none ${patientPlans.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200' : treatmentType === 'plan_session' ? 'border-amber-600 bg-amber-50/30' : 'border-outline-variant hover:border-slate-305 bg-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="calendar_today" className={`text-base ${treatmentType === 'plan_session' ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-amber-950">Phiên điều trị tiếp</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">Ghi nhận tiến trình của phác đồ hiện tại. Không sinh thêm hóa đơn mới.</p>
                      </div>
                    </div>

                    {treatmentType === 'plan_session' && patientPlans.length > 0 && (
                      <div className="pt-2 flex flex-col sm:flex-row gap-2 items-center animate-in fade-in duration-200">
                        <label className="text-xs font-bold text-slate-600 shrink-0">Chọn Phác đồ áp dụng:</label>
                        <select 
                          value={selectedPlanId}
                          onChange={e => setSelectedPlanId(e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          {patientPlans.map(plan => (
                            <option key={plan.id} value={plan.id}>
                              [{plan.date}] {plan.title} (ID: {plan.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Chỉ định dịch vụ */}
              {activeTab === 'services' && (
                <div className="space-y-3 flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-on-surface-variant">Dịch vụ thực hiện trong phiên này *</label>
                    {performedServices.length > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        Đã chọn {performedServices.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Search and Filters */}
                  <div className="space-y-2">
                    {hasServiceMismatch && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-start gap-2 animate-pulse">
                        <Icon name="info" className="text-amber-600 text-[18px] shrink-0" />
                        <p>{hasServiceMismatch}</p>
                      </div>
                    )}
                    <div className="relative">
                      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
                      <input
                        type="text"
                        placeholder="Tìm dịch vụ nhanh (ví dụ: trám, nhổ, sứ...)"
                        value={serviceSearch}
                        onChange={e => setServiceSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-outline-variant/60 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                      />
                      {serviceSearch && (
                        <button
                          type="button"
                          onClick={() => setServiceSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                        >
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      )}
                    </div>

                    {/* Quick tags */}
                    <div className="flex flex-wrap gap-1">
                      {['Tất cả', 'Trám', 'Nhổ', 'Sứ', 'Tủy', 'X-quang'].map(tag => {
                        const isTagActive = tag === 'Tất cả' ? !serviceSearch : serviceSearch.toLowerCase() === tag.toLowerCase();
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setServiceSearch(tag === 'Tất cả' ? '' : tag)}
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              isTagActive
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-slate-100 text-on-surface-variant hover:bg-slate-200'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected services quick view (Badges) */}
                  {performedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-xl border border-dashed border-outline-variant/40 max-h-[80px] overflow-y-auto custom-scrollbar">
                      {performedServices.map(id => {
                        const s = services.find(item => item.id === id);
                        if (!s) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-white border border-primary/20 text-primary px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm"
                          >
                            {s.name}
                            <button
                              type="button"
                              onClick={() => handleServiceCheckbox(id)}
                              className="text-[12px] hover:text-error cursor-pointer font-bold"
                            >
                              <Icon name="close" className="text-[12px] hover:text-error font-bold" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Grid List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[170px] overflow-y-auto custom-scrollbar pr-2 pb-1">
                    {filteredServices.map(s => {
                      const isSelected = performedServices.includes(s.id);
                      return (
                        <div 
                          key={s.id}
                          onClick={() => handleServiceCheckbox(s.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-outline-variant hover:border-primary/40 hover:bg-slate-50'}`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'border-2 border-outline-variant text-transparent bg-white'}`}>
                            <Icon name="check" className="text-[11px] font-bold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{s.name}</p>
                            <p className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-primary/80' : 'text-on-surface-variant'}`}>₫{s.price.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                    {filteredServices.length === 0 && (
                      <div className="col-span-2 py-6 text-center text-xs text-on-surface-variant">
                        Không tìm thấy dịch vụ nào phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Kê đơn thuốc */}
              {activeTab === 'prescription' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">Áp dụng mẫu đơn nhanh</label>
                      <select 
                        value={rxTemplate} 
                        onChange={e => handleTemplateChange(e.target.value)} 
                        className="w-full bg-surface-container border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none cursor-pointer"
                      >
                        <option>Sau điều trị sâu răng / Hàn răng</option>
                        <option>Chăm sóc sau nhổ răng khôn</option>
                        <option>Sau điều trị tủy răng (Nội nha)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">Kê thêm thuốc mới</label>
                      <div className="relative">
                        <select
                          value={selectedAddDrugId}
                          onChange={e => handleAddDrug(e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none appearance-none cursor-pointer pr-8"
                        >
                          <option value="">-- Chọn thuốc trong danh mục --</option>
                          {AVAILABLE_DRUGS.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.type})
                            </option>
                          ))}
                        </select>
                        <Icon name="keyboard_arrow_down" className="absolute right-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none text-on-surface-variant" />
                      </div>
                    </div>
                  </div>

                  {/* Prescription drugs list builder */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-on-surface-variant uppercase">Đơn thuốc chỉ định chi tiết</span>
                      <button 
                        type="button" 
                        onClick={() => setPrescriptionDrugs([])} 
                        className="text-xs text-error font-bold hover:underline cursor-pointer"
                      >
                        Xóa trắng đơn
                      </button>
                    </div>

                    <div className="border border-outline-variant rounded-xl overflow-hidden bg-white max-h-[220px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-outline-variant text-on-surface-variant uppercase font-bold sticky top-0 z-10">
                          <tr>
                            <th className="p-3">Tên thuốc</th>
                            <th className="p-3 w-16 text-center">SL</th>
                            <th className="p-3 w-16 text-center">Đơn vị</th>
                            <th className="p-3">Cách dùng (Tần suất & Liều lượng)</th>
                            <th className="p-3 w-12 text-center">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/40">
                          {prescriptionDrugs.map((drug, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-on-surface">{drug.name}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  value={drug.quantity}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 1;
                                    setPrescriptionDrugs(prev => {
                                      const next = [...prev];
                                      next[index].quantity = val;
                                      return next;
                                    });
                                  }}
                                  className="w-12 text-center py-1 bg-slate-50 border border-outline-variant/60 rounded focus:bg-white focus:outline-none font-bold"
                                />
                              </td>
                              <td className="p-3 text-center text-on-surface-variant">{drug.unit}</td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={drug.instruction}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setPrescriptionDrugs(prev => {
                                      const next = [...prev];
                                      next[index].instruction = val;
                                      return next;
                                    });
                                  }}
                                  className="w-full px-2.5 py-1 bg-slate-50 border border-outline-variant/60 rounded focus:bg-white focus:outline-none"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrescriptionDrugs(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  className="text-base text-outline hover:text-error cursor-pointer"
                                >
                                  <Icon name="delete" className="text-base text-outline hover:text-error" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {prescriptionDrugs.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-on-surface-variant text-xs italic">
                                Chưa kê thuốc nào. Vui lòng chọn mẫu nhanh hoặc thêm thuốc từ danh mục.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {hasAllergyConflict && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-sm border-dashed">
                      <Icon name="warning" className="text-red-600 text-[18px] shrink-0" />
                      <div>
                        <p className="uppercase text-[9px] font-black text-red-700 tracking-wider">CẢNH BÁO AN TOÀN DỊ ỨNG THUỐC!</p>
                        <p className="mt-0.5 leading-relaxed font-semibold">
                          Bệnh nhân có tiền sử dị ứng với "{activePatient?.criticalAllergy}". 
                          Hoạt chất của thuốc trong đơn có nguy cơ gây phản ứng dị ứng nghiêm trọng! 
                          Hệ thống đã khóa nút lưu bệnh án cho đến khi đổi sang thuốc khác.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-start gap-2">
                    <Icon name="warning" className="text-amber-600 text-[16px] shrink-0 mt-0.5" />
                    <p>Lưu ý: Bệnh nhân tự mang đơn thuốc ra ngoài mua. Phòng khám hiện tại không trực tiếp bán thuốc.</p>
                  </div>
                </div>
              )}

              {/* Tab 5: Tài liệu & X-quang */}
              {activeTab === 'files' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left: Upload controls */}
                    <div className="md:col-span-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-on-surface-variant mb-2">Tải tệp tin lên từ máy tính</label>
                        <div className="border-2 border-dashed border-outline-variant rounded-2xl p-6 text-center hover:border-primary transition-colors cursor-pointer relative bg-slate-50 flex flex-col items-center justify-center">
                          <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            multiple 
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Icon name="cloud_upload" className="text-4xl text-primary/60 mb-2" />
                          <p className="text-xs font-bold text-on-surface">Kéo thả tệp hoặc nhấp để chọn</p>
                          <p className="text-[10px] text-outline mt-1 font-medium">Hỗ trợ JPG, PNG, PDF (Tối đa 15MB)</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase text-on-surface-variant">Thêm nhanh tệp mẫu kiểm thử</label>
                        <div className="flex flex-col gap-2">
                          <button 
                            type="button"
                            onClick={() => handleAddPresetFile('xray')}
                            className="w-full text-left py-2 px-3 bg-white border border-outline-variant hover:border-primary rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer text-slate-700"
                          >
                            <Icon name="photo_camera_back" className="text-primary text-sm" />
                            + Phim X-quang Panorama chẩn đoán
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleAddPresetFile('clinical')}
                            className="w-full text-left py-2 px-3 bg-white border border-outline-variant hover:border-primary rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer text-slate-700"
                          >
                            <Icon name="image" className="text-secondary text-sm" />
                            + Ảnh lâm sàng trạng thái răng miệng
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleAddPresetFile('lab')}
                            className="w-full text-left py-2 px-3 bg-white border border-outline-variant hover:border-primary rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer text-slate-700"
                          >
                            <Icon name="picture_as_pdf" className="text-red-600 text-sm" />
                            + Phiếu xét nghiệm cận lâm sàng (.pdf)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: List of uploaded files */}
                    <div className="md:col-span-7 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold uppercase text-on-surface-variant">Danh sách tệp đính kèm ({uploadedFiles.length})</label>
                        {uploadedFiles.length > 0 && (
                          <button 
                            type="button" 
                            onClick={() => setUploadedFiles([])}
                            className="text-xs text-error font-bold hover:underline cursor-pointer"
                          >
                            Xóa tất cả
                          </button>
                        )}
                      </div>

                      <div className="border border-outline-variant rounded-2xl p-4 bg-slate-50 min-h-[250px] max-h-[350px] overflow-y-auto custom-scrollbar space-y-2">
                        {uploadedFiles.map((file) => (
                          <div 
                            key={file.id} 
                            className="bg-white border border-outline-variant/60 p-3 rounded-xl flex items-center gap-3 shadow-sm hover:shadow transition-all group"
                          >
                            <div className="w-10 h-10 bg-zinc-800 text-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative border border-outline-variant/30">
                              {file.type === 'image' && file.url ? (
                                <img src={file.url} alt={file.title} className="w-full h-full object-cover" />
                              ) : (
                                <Icon name={file.type === 'pdf' ? 'picture_as_pdf' : 'description'} className="text-[18px] text-white/80" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-on-surface truncate" title={file.title}>{file.title}</p>
                              <p className="text-[10px] text-outline font-bold uppercase mt-0.5">{file.size} • {file.type.toUpperCase()}</p>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {file.url && file.url !== '#' && (
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="p-1.5 hover:bg-slate-100 rounded text-on-surface-variant hover:text-primary transition-colors"
                                  title="Xem phóng to"
                                >
                                  <Icon name="open_in_new" className="text-base" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                                className="p-1.5 hover:bg-red-50 rounded text-outline hover:text-error transition-colors cursor-pointer"
                                title="Xóa bỏ"
                              >
                                <Icon name="delete" className="text-base" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {uploadedFiles.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-outline">
                            <Icon name="folder_open" className="text-4xl opacity-50 mb-2" />
                            <p className="text-xs font-bold">Chưa có tệp đính kèm nào</p>
                            <p className="text-[10px] mt-0.5">Vui lòng tải tệp lên hoặc sử dụng nút thêm nhanh</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Finalize bottom action bar */}
              <div className="pt-6 border-t border-outline-variant flex justify-between items-center">
                <div className="text-xs text-on-surface-variant font-medium">
                  {performedServices.length > 0 ? (
                    <span>
                      Đã chọn: <strong>{performedServices.length} dịch vụ</strong>. Tổng cộng sơ bộ:{' '}
                      <strong className="text-primary">
                        ₫{performedServices.map(id => services.find(s => s.id === id)?.price || 0).reduce((a, b) => a + b, 0).toLocaleString()}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-error font-bold">Vui lòng chỉ định ít nhất 1 dịch vụ đã thực hiện!</span>
                  )}
                </div>
                <button
                  onClick={() => setShowSignModal(true)}
                  disabled={performedServices.length === 0 || hasAllergyConflict}
                  className={`px-8 py-3 rounded-lg font-bold text-xs flex items-center gap-2 active:scale-95 transition-all shadow-lg cursor-pointer ${
                    performedServices.length > 0 && !hasAllergyConflict
                      ? 'bg-secondary hover:bg-secondary/90 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Icon name="border_color" />
                  Xem & Ký Bệnh Án
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Empty Workspace screen */
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant clinical-shadow flex flex-col justify-center items-center h-96">
          <Icon name="dentistry" className="text-[64px] text-primary/20 mb-4 animate-bounce" />
          <h3 className="text-headline-sm font-bold text-on-surface">Không Có Bệnh Nhân Nào Đang Chọn</h3>
          <p className="text-body-md text-on-surface-variant max-w-sm mt-2">
            Vui lòng chọn một bệnh nhân từ tab <strong>Hàng chờ bác sĩ</strong> để tải hồ sơ nha khoa lâm sàng.
          </p>
        </div>
      )}

      {showSignModal && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="folder_shared" />
                Xem Trước & Ký Xác Nhận Bệnh Án EMR
              </h3>
              <button onClick={() => setShowSignModal(false)} className="p-1 hover:bg-white/20 rounded-full cursor-pointer flex items-center justify-center">
                <Icon name="close" />
              </button>
            </div>

            {/* Content (PDF Mock) */}
            <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-100 flex-1">
              <div className="bg-white p-6 shadow-md rounded-xl border border-outline-variant/60 space-y-6 text-slate-700 text-xs font-medium">
                {/* PDF Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-sm font-black text-primary">NHA KHOA GOOD SMILE</h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">Địa chỉ: 123 Đường Ba Tháng Hai, Quận 10, TP.HCM</p>
                    <p className="text-[10px] text-slate-500">Hotline: 1900 6789</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-600">MÃ HỒ SƠ: #EMR-{activeQueueItem?.id}</p>
                    <p className="text-[10px] text-slate-400">Ngày lập: {new Date().toLocaleDateString('vi-VN')}</p>
                    <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded mt-1.5 ${
                      treatmentType === 'plan_init' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                      treatmentType === 'plan_session' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {treatmentType === 'plan_init' ? 'Khởi tạo phác đồ' :
                       treatmentType === 'plan_session' ? `Phiên của phác đồ #${selectedPlanId}` :
                       'Điều trị độc lập'}
                    </span>
                  </div>
                </div>

                <h1 className="text-center text-sm font-black uppercase text-slate-900 tracking-wider">HỒ SƠ BỆNH ÁN LÂM SÀNG</h1>

                {/* Patient details section */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200/50">
                  <p className="text-[10px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Thông tin bệnh nhân</p>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <p><strong>Họ và tên:</strong> {activePatient.name}</p>
                    <p><strong>Mã bệnh nhân:</strong> {activePatient.id}</p>
                    <p><strong>Tuổi/Giới tính:</strong> {activePatient.age} tuổi / {activePatient.gender}</p>
                    <p><strong>Số điện thoại:</strong> {activePatient.phone}</p>
                    <p className="col-span-2"><strong>Dị ứng:</strong> <span className={formAllergy !== 'Không' ? 'text-error font-bold' : ''}>{formAllergy}</span></p>
                    <p className="col-span-2"><strong>Bệnh lý nền:</strong> <span className={formCondition !== 'Bình thường' ? 'text-amber-700 font-bold' : ''}>{formCondition}</span></p>
                  </div>
                </div>

                {/* Clinical description */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Triệu chứng & Lý do khám</p>
                  <p className="italic bg-slate-50 p-3 rounded-lg leading-relaxed text-slate-700">"{chiefComplaint}"</p>
                </div>

                {/* Dental chart diagnostics */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Chẩn đoán răng bệnh lý</p>
                  {activeTeethState.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activeTeethState.map(t => (
                        <span key={t.toothNumber} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 text-[10px]">
                          Răng số {t.toothNumber}: {t.treatment || t.condition.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Không ghi nhận răng bệnh lý nào.</p>
                  )}
                  <p className="mt-2 text-xs"><strong>Mã chẩn đoán ICD-10:</strong> {icdCode}</p>
                </div>

                {/* Services assigned */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Dịch vụ điều trị chỉ định</p>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold">
                        <th className="py-2">Tên dịch vụ</th>
                        <th className="py-2 text-right">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {performedServices.map(id => {
                        const s = services.find(item => item.id === id);
                        return (
                          <tr key={id}>
                            <td className="py-2 font-bold">{s?.name}</td>
                            <td className="py-2 text-right font-bold text-slate-900">₫{s?.price.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold text-sm border-t border-slate-200">
                        <td className="py-2.5 text-primary">TỔNG CHI PHÍ TẠM TÍNH</td>
                        <td className="py-2.5 text-right text-primary">
                          ₫{performedServices.map(id => services.find(s => s.id === id)?.price || 0).reduce((a, b) => a + b, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Attached scans */}
                {uploadedFiles.filter(f => f.type === 'image').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Hình ảnh đính kèm</p>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {uploadedFiles.filter(file => file.type === 'image').map(file => (
                        <div key={file.id} className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-300">
                            {file.url ? (
                              <img src={file.url} alt={file.title} className="w-full h-full object-cover" />
                            ) : (
                              <Icon name="image" className="text-white text-sm" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[10px] text-slate-800 truncate" title={file.title}>{file.title}</p>
                            <p className="text-[8px] text-slate-400 font-mono">{file.size} • IMAGE</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {uploadedFiles.some(f => f.type === 'image') && (
                      <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center h-[180px]">
                        <img 
                          src={uploadedFiles.find(f => f.type === 'image')?.url} 
                          alt="First Scan" 
                          className="max-h-full max-w-full object-contain" 
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Prescription */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-primary uppercase border-b border-slate-200 pb-1">Đơn thuốc kèm theo</p>
                  {prescriptionDrugs.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold">
                          <th className="py-2">Tên thuốc</th>
                          <th className="py-2 text-center w-12">SL</th>
                          <th className="py-2 w-16">Đơn vị</th>
                          <th className="py-2">Cách dùng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prescriptionDrugs.map((d, i) => (
                          <tr key={i}>
                            <td className="py-2 font-bold">{d.name}</td>
                            <td className="py-2 text-center">{d.quantity}</td>
                            <td className="py-2">{d.unit}</td>
                            <td className="py-2 italic text-slate-600">{d.instruction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-slate-500 italic">Không kê đơn thuốc.</p>
                  )}
                </div>

                {/* Signature area */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-[10px]">
                  <div>
                    <p className="uppercase font-bold text-slate-400">Bệnh nhân ký xác nhận</p>
                    <p className="text-[9px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                    <div className="h-14 flex items-center justify-center">
                      <span className="text-slate-300 text-xs italic">Đã xác nhận trên app</span>
                    </div>
                    <p className="font-bold text-slate-800">{activePatient.name}</p>
                  </div>
                  <div>
                    <p className="uppercase font-bold text-slate-400">Bác sĩ điều trị ký</p>
                    <p className="text-[9px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                    <div className="h-14 flex items-center justify-center">
                      <span className="font-serif text-slate-600 text-sm font-bold italic border-b border-slate-900">Nguyễn Hương</span>
                    </div>
                    <p className="font-bold text-slate-800">{dentistName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-slate-50 border-t border-outline-variant flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <Icon name="lock" className="text-sm text-green-600" />
                Mã bảo mật EMR SHA-256 đã tự động sinh
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignModal(false)}
                  className="px-5 py-2.5 border border-outline-variant text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
                >
                  Quay lại sửa
                </button>
                <button
                  onClick={() => {
                    handleFinalize();
                    setShowSignModal(false);
                  }}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
                >
                  <Icon name="draw" className="text-[16px]" />
                  Xác Nhận Ký & Gửi Hóa Đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DentistDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  switch (tab) {
    case 'workspace': return <DentistHome />;
    case 'records':   return <DentistRecords />;
    case 'schedule':  return <DentistSchedule dentistId="D-04" />;
    default:          return <DentistQueue />;
  }
};
