import React, { useState, useEffect } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';
import { ToothState } from '../../../types/clinic';
import { DentalChart, ToothSvg } from '../../../components/DentalChart';
import { Icon } from '../../../components/Icon';

// Dental chart tooth data - full set of 32 teeth
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const CONDITION_STYLES: Record<string, { bg: string; border: string; label: string; color: string; icon: string }> = {
  healthy: { bg: 'bg-white', border: 'border-outline-variant', label: 'Khỏe mạnh', color: 'text-secondary', icon: 'dentistry' },
  decay: { bg: 'bg-amber-50', border: 'border-amber-400', label: 'Sâu răng', color: 'text-amber-700', icon: 'coronavirus' },
  treated: { bg: 'bg-primary-container', border: 'border-primary', label: 'Đã trám/điều trị', color: 'text-primary', icon: 'healing' },
  missing: { bg: 'bg-error-container', border: 'border-error', label: 'Mất răng', color: 'text-error', icon: 'close' },
  crown: { bg: 'bg-purple-50', border: 'border-purple-400', label: 'Bọc sứ/Implant', color: 'text-purple-700', icon: 'diamond' },
};

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  decay: { label: 'Sâu răng', color: 'text-amber-700 bg-amber-100 border-amber-300' },
  treated: { label: 'Đã trám/điều trị', color: 'text-primary bg-primary-container border-primary/30' },
  missing: { label: 'Mất răng', color: 'text-error bg-error-container border-error/30' },
  crown: { label: 'Bọc sứ', color: 'text-purple-700 bg-purple-100 border-purple-300' },
  healthy: { label: 'Khỏe mạnh', color: 'text-secondary bg-secondary-container border-secondary/30' },
};

interface ParsedNotes {
  allergy: string;
  condition: string;
  chiefComplaint: string;
  diagnosis: string;
  prescription: {
    id: string;
    medicines: {
      name: string;
      dose: string;
      duration: string;
      note: string;
    }[];
    instructions: string;
  } | null;
}

function parseEMRNotes(notes: string | undefined, recordId: string): ParsedNotes {
  const result: ParsedNotes = {
    allergy: 'Không',
    condition: 'Bình thường',
    chiefComplaint: 'Khám răng định kỳ',
    diagnosis: 'Khám lâm sàng',
    prescription: null
  };

  if (!notes) return result;

  // 1. Extract Allergy
  const allergyMatch = notes.match(/Dị ứng:\s*([^|.]+)/);
  if (allergyMatch) {
    result.allergy = allergyMatch[1].trim();
  }

  // 2. Extract Condition
  const conditionMatch = notes.match(/Bệnh lý nền:\s*([^.]+)/);
  if (conditionMatch) {
    result.condition = conditionMatch[1].trim();
  }

  // 3. Extract Chief Complaint
  const complaintMatch = notes.match(/Bệnh sử:\s*([^-|.]+)/);
  if (complaintMatch) {
    result.chiefComplaint = complaintMatch[1].trim();
  }

  // 4. Extract Diagnosis
  const diagnosisMatch = notes.match(/Chẩn đoán:\s*([^|.]+)/);
  if (diagnosisMatch) {
    result.diagnosis = diagnosisMatch[1].trim();
  }

  // 5. Extract Prescription
  const rxIndex = notes.indexOf('| Đơn thuốc:');
  if (rxIndex !== -1) {
    const rxPart = notes.substring(rxIndex + 12).trim();
    if (rxPart) {
      const medicines: any[] = [];
      const drugs = rxPart.split(';');
      drugs.forEach(drug => {
        const trimmedDrug = drug.trim();
        if (!trimmedDrug) return;
        const match = trimmedDrug.match(/(.*?)\s*\(\s*(\d+)\s*([^)]*)\)\s*-\s*(.*)/);
        if (match) {
          medicines.push({
            name: match[1].trim(),
            dose: match[4].trim(),
            duration: `${match[2]} ${match[3].trim()}`,
            note: ''
          });
        } else {
          medicines.push({
            name: trimmedDrug,
            dose: 'Theo chỉ dẫn',
            duration: '1',
            note: ''
          });
        }
      });

      if (medicines.length > 0) {
        result.prescription = {
          id: `RX-${recordId.replace('MR-', '')}`,
          medicines,
          instructions: 'Uống thuốc đúng giờ và theo chỉ dẫn.'
        };
      }
    }
  }

  if (!allergyMatch && !complaintMatch && !diagnosisMatch) {
    result.diagnosis = notes;
  }

  return result;
}

export const PatientRecords: React.FC = () => {
  const { patients, medicalRecords, fetchPatientRecords } = useClinic();
  const { user } = useAuth();
  const patientId = user?.id || 'P-8821';

  useEffect(() => {
    fetchPatientRecords(patientId);
  }, [patientId]);

  const currentPatient = patients.find(p => p.id === patientId) || {
    id: patientId,
    name: user?.name || 'Trần Nguyễn Minh',
    phone: '0901 234 567',
    age: 28,
    gender: 'Nam',
    criticalAllergy: 'Không',
    condition: 'Bình thường'
  };

  const patientRecords = medicalRecords.filter(r => r.patientId === patientId);

  // Dynamic tooth conditions aggregator
  const staticToothMap: Record<string, Record<number, string>> = {
    'P-8821': { 38: 'missing', 48: 'missing', 15: 'treated', 25: 'treated', 16: 'crown' },
    'P-9902': { 46: 'decay', 38: 'missing', 36: 'treated' },
  };

  const toothMap: Record<number, string> = {};
  patientRecords.forEach(r => {
    r.teethMap?.forEach(t => { toothMap[t.toothNumber] = t.condition; });
  });

  const toothConditions = { ...(staticToothMap[patientId] || {}), ...toothMap };

  // Dynamic VISITS list mapped from EMR medicalRecords
  const VISITS = patientRecords.map(rec => {
    const parsed = parseEMRNotes(rec.notes, rec.id);
    
    // Fallback values if not structured
    const reason = parsed.chiefComplaint || 'Khám răng định kỳ';
    const diagnosis = parsed.diagnosis || rec.title || 'Khám lâm sàng';
    
    // Treatments list
    const treatments = rec.treatments || (rec.teethMap && rec.teethMap.length > 0
      ? rec.teethMap.map(t => `${t.treatment || CONDITION_STYLES[t.condition]?.label || t.condition} Răng ${t.toothNumber}`)
      : [rec.title]);

    // Prescription
    const prescription = rec.prescription || parsed.prescription;

    // Files list containing the EMR PDF file and the image files
    const files: any[] = [
      {
        id: `EMR-PDF-${rec.id}`,
        type: 'pdf' as const,
        title: `Hồ sơ bệnh án điện tử EMR_${rec.id}.pdf`,
        size: rec.size || '1.5 MB',
        isEmrPdf: true,
        record: rec
      }
    ];

    if (rec.files) {
      rec.files.forEach((f: any) => {
        if (f.type === 'image') {
          files.push(f);
        }
      });
    }

    if (rec.type === 'image') {
      if (!files.some(f => f.id === rec.id)) {
        files.push({
          id: rec.id,
          type: 'image' as const,
          title: rec.title,
          size: rec.size,
          url: rec.url
        });
      }
    }

    return {
      id: rec.id,
      date: rec.date,
      doctor: rec.dentistName || 'Bác sĩ điều trị',
      room: rec.room || 'Phòng khám',
      reason,
      diagnosis,
      treatments,
      notes: rec.notes && !rec.notes.includes('|') ? rec.notes : undefined,
      prescription,
      files
    };
  });

  const [activeTab, setActiveTab] = useState<'chart' | 'timeline'>('chart');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [viewRecord, setViewRecord] = useState<any>(null); // For viewing files
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotateDegree, setRotateDegree] = useState<number>(0);

  const handleOpenRecord = (file: any) => {
    if (file.isEmrPdf) {
      setViewEMRRecord(file.record);
    } else {
      setViewRecord(file);
      setZoomScale(1);
      setRotateDegree(0);
    }
  };
  const [printVisit, setPrintVisit] = useState<any>(null); // For printing visit record
  const [viewEMRRecord, setViewEMRRecord] = useState<any | null>(null); // For EMR A4 replica detail view
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVisits = VISITS.filter(visit =>
    visit.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    visit.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
    visit.treatments.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
    visit.date.includes(searchQuery)
  );

  const getCondition = (tooth: number) => toothConditions[tooth] || 'healthy';

  const summaryCounts = {
    healthy: 32 - Object.keys(toothConditions).length,
    decay: Object.values(toothConditions).filter(c => c === 'decay').length,
    treated: Object.values(toothConditions).filter(c => c === 'treated').length,
    missing: Object.values(toothConditions).filter(c => c === 'missing').length,
    crown: Object.values(toothConditions).filter(c => c === 'crown').length,
  };

  return (
    <>
    <div className={`p-stack-lg max-w-[1200px] mx-auto ${printVisit ? 'print:hidden' : ''}`}>
      {/* Header & Simple Profile */}
      <div className="mb-8 bg-white rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Hồ sơ bệnh án điện tử</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Bệnh nhân: <strong className="text-on-surface">{currentPatient.name}</strong> (Mã BN: {currentPatient.id})</p>
        </div>
        <div className="flex gap-4 text-sm text-on-surface-variant">
          <div className="bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant">
            <span className="block text-[10px] uppercase font-bold">Giới tính</span>
            <span className="font-bold text-on-surface">{currentPatient.gender}</span>
          </div>
          <div className="bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant">
            <span className="block text-[10px] uppercase font-bold">Thông tin tuổi</span>
            <span className="font-bold text-on-surface">{currentPatient.age} tuổi</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-surface-container-low p-1.5 rounded-2xl w-fit border border-outline-variant">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'chart' ? 'bg-white text-primary shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Icon name="dentistry" className="text-[20px]" />
          Sơ đồ răng tổng quan
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'timeline' ? 'bg-white text-primary shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Icon name="history" className="text-[20px]" />
          Lịch sử điều trị
        </button>
      </div>

      {/* TAB 1: SƠ ĐỒ RĂNG TỔNG QUAN (Current Master State) */}
      {activeTab === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-outline-variant p-6 shadow-sm">
            <DentalChart
              teethState={Object.entries(toothConditions).map(([num, cond]) => ({
                toothNumber: Number(num),
                condition: cond as ToothState['condition'],
                treatment: patientRecords.flatMap(r => r.teethMap || []).find(t => t.toothNumber === Number(num))?.treatment
              }))}
              selectedTooth={selectedTooth}
              onSelectTooth={(toothNum) => setSelectedTooth(selectedTooth === toothNum ? null : toothNum)}
              patientAge={currentPatient?.age}
            />
          </div>

          {/* Summary & Details Side Panel */}
          <div className="space-y-6">
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant p-6">
              <h4 className="font-bold text-on-surface mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                <Icon name="pie_chart" className="text-secondary" />
                Thống kê tình trạng
              </h4>
              <div className="space-y-3">
                {Object.entries(CONDITION_STYLES).map(([key, style]) => {
                  const count = summaryCounts[key as keyof typeof summaryCounts];
                  if (count === 0 && key !== 'healthy') return null;
                  return (
                    <div key={key} className="flex items-center justify-between bg-white p-3 rounded-xl border border-outline-variant">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} border ${style.border} ${style.color}`}>
                          <Icon name={style.icon} className="text-[16px]" />
                        </div>
                        <span className="font-bold text-sm text-on-surface">{style.label}</span>
                      </div>
                      <span className="text-lg font-black text-on-surface-variant">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedTooth && (
              <div className="bg-white rounded-3xl border border-outline-variant p-6 shadow-lg animate-fade-in relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-2 h-full ${CONDITION_STYLES[getCondition(selectedTooth)].bg} ${CONDITION_STYLES[getCondition(selectedTooth)].border} border-l-4`}></div>
                <div className="pl-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Chi tiết</p>
                      <h4 className="text-2xl font-black text-on-surface mt-1">Răng số {selectedTooth}</h4>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${CONDITION_STYLES[getCondition(selectedTooth)].bg} ${CONDITION_STYLES[getCondition(selectedTooth)].border} ${CONDITION_STYLES[getCondition(selectedTooth)].color}`}>
                      <Icon name={CONDITION_STYLES[getCondition(selectedTooth)].icon} className="text-[24px]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Trạng thái hiện tại</p>
                    <p className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${CONDITION_STYLES[getCondition(selectedTooth)].bg} ${CONDITION_STYLES[getCondition(selectedTooth)].border} ${CONDITION_STYLES[getCondition(selectedTooth)].color}`}>
                      {CONDITION_STYLES[getCondition(selectedTooth)].label}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!selectedTooth && (
              <div className="bg-surface-container-low border border-outline-variant border-dashed rounded-3xl p-6 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[150px]">
                <Icon name="touch_app" className="text-4xl mb-2 opacity-50" />
                <p className="text-sm">Bấm vào một răng trên sơ đồ để xem trạng thái.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LỊCH SỬ ĐIỀU TRỊ (Chronological Timeline) */}
      {activeTab === 'timeline' && (
        <div className="max-w-4xl mx-auto relative animate-fade-in space-y-6">
          {/* EMR Search bar */}
          <div className="bg-white rounded-2xl border border-outline-variant p-4 shadow-sm flex items-center gap-3">
            <Icon name="search" className="text-on-surface-variant" />
            <input
              type="text"
              placeholder="Tìm kiếm đợt khám theo bác sĩ, dịch vụ, chẩn đoán, ngày khám..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder-on-surface-variant/60"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer border-none bg-transparent">
                <Icon name="close" className="text-sm" />
              </button>
            )}
          </div>

          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-4 md:left-8 top-0 bottom-0 w-1 bg-outline-variant/50 rounded-full"></div>

            <div className="space-y-12">
              {filteredVisits.map((visit) => (
                <div key={visit.id} className="relative pl-12 md:pl-20">
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 md:left-6 w-4 h-4 rounded-full bg-primary ring-4 ring-primary-container z-10 top-6"></div>
                  
                  {/* Visit Card */}
                  <div className="bg-white rounded-3xl border border-outline-variant shadow-sm overflow-hidden">
                    
                    {/* Visit Header */}
                    <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex flex-wrap gap-4 items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-primary bg-primary-container px-3 py-1 rounded-full mr-3">{visit.date}</span>
                        <span className="font-bold text-on-surface text-lg">Khám lâm sàng & Điều trị</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-on-surface-variant bg-white px-3 py-1.5 rounded-lg border border-outline-variant">
                          <Icon name="stethoscope" className="text-[18px]" />
                          {visit.doctor} ({visit.room})
                        </div>
                        <button 
                          onClick={() => {
                            const originalRecord = medicalRecords.find(r => r.id === visit.id);
                            setViewEMRRecord(originalRecord || null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-bold hover:bg-primary hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Xem hồ sơ bệnh án điện tử EMR"
                        >
                          <Icon name="folder_shared" className="text-[18px]" />
                          <span>Chi tiết EMR</span>
                        </button>
                        <button 
                          onClick={() => setPrintVisit(visit)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg text-sm font-bold hover:opacity-80 transition-opacity cursor-pointer border-none"
                          title="Xem & In hồ sơ đợt khám này"
                        >
                          <Icon name="print" className="text-[18px]" />
                          <span className="hidden sm:inline">In Phiếu Khám</span>
                        </button>
                      </div>
                    </div>

                  {/* Visit Body */}
                  <div className="p-6 space-y-6">
                    {/* Reason & Diagnosis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Icon name="record_voice_over" className="text-[14px]" /> Lý do khám
                        </p>
                        <p className="text-sm font-medium text-on-surface">{visit.reason}</p>
                      </div>
                      <div className="bg-error-container/20 border border-error/20 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-error uppercase tracking-widest flex items-center gap-1 mb-1">
                          <Icon name="vital_signs" className="text-[14px]" /> Chẩn đoán bệnh
                        </p>
                        <p className="text-sm font-bold text-error">{visit.diagnosis}</p>
                      </div>
                    </div>

                    {/* Treatments Done */}
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Icon name="healing" className="text-[14px]" /> Thủ thuật đã thực hiện
                      </p>
                      <ul className="space-y-2">
                        {visit.treatments.map((t, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-on-surface font-medium bg-surface-container-low p-2 rounded-lg border border-outline-variant w-fit">
                            <Icon name="check_circle" className="text-[16px] text-primary" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {visit.notes && (
                       <p className="text-sm italic text-on-surface-variant border-l-4 border-outline-variant pl-3">
                         <strong>Ghi chú bác sĩ:</strong> {visit.notes}
                       </p>
                    )}

                    {/* Attachments: Prescription & Files */}
                    <div className="pt-4 border-t border-outline-variant">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Tài liệu kèm theo đợt khám</p>
                      <div className="flex flex-wrap gap-4">
                        
                        {/* Prescription Button */}
                        {visit.prescription && (
                          <div className="bg-white border-2 border-primary/20 rounded-xl p-4 flex-1 min-w-[250px]">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-primary-container text-primary rounded-lg flex items-center justify-center">
                                <Icon name="receipt_long" className="text-[20px]" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-on-surface">Đơn thuốc ({visit.prescription.medicines.length} loại)</p>
                                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Mã: {visit.prescription.id}</p>
                              </div>
                            </div>
                            <div className="space-y-2 mt-3">
                              {visit.prescription.medicines.map((m, i) => (
                                <p key={i} className="text-xs text-on-surface flex justify-between border-b border-outline-variant border-dashed pb-1">
                                  <span className="font-medium">{m.name}</span>
                                  <span className="text-on-surface-variant">{m.dose}</span>
                                </p>
                              ))}
                            </div>
                            <button className="w-full mt-3 py-2 bg-surface-container text-on-surface font-bold text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors">
                              <Icon name="print" className="text-[16px]" />
                              In chi tiết
                            </button>
                          </div>
                        )}

                        {/* Files Area */}
                        {visit.files && visit.files.length > 0 && (
                          <div className="flex flex-wrap gap-4 mt-2">
                            {visit.files.map((file: any) => (
                              <div 
                                key={file.id} 
                                onClick={() => handleOpenRecord(file)}
                                className="bg-surface-container-low border border-outline-variant p-3 rounded-xl flex items-center gap-3 hover:bg-surface-container cursor-pointer transition-colors group"
                              >
                                <div className="w-10 h-10 bg-zinc-800 text-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                                  {file.type === 'image' ? (
                                    <img 
                                      src={file.url || (file.id === 'F-112' || file.title?.toLowerCase().includes('niềng răng') ? '/braces_progress.png' : '/xray_panorama.png')} 
                                      alt={file.title} 
                                      className="w-full h-full object-cover absolute inset-0" 
                                    />
                                  ) : (
                                    <Icon name="picture_as_pdf" className="z-10 text-[18px]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{file.title}</p>
                                  <p className="text-[10px] text-on-surface-variant uppercase font-bold">{file.size}</p>
                                </div>
                                <Icon name="visibility" className="text-on-surface-variant group-hover:text-primary transition-colors" />
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>

                  </div>
                </div>
              </div>
              ))}
              {filteredVisits.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-outline-variant/80 p-6 shadow-sm">
                  <Icon name="search_off" className="text-[48px] text-outline mb-2" />
                  <p className="font-bold text-on-surface">Không tìm thấy đợt khám nào</p>
                  <p className="text-xs text-on-surface-variant mt-1">Vui lòng thử từ khóa tìm kiếm khác</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setViewRecord(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-900 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="photo_camera_back" className="text-primary text-[20px]" />
                {viewRecord.type === 'image' ? 'Trình xem ảnh y khoa X-Quang' : 'Tài liệu EMR đính kèm'}
              </h3>
              <button onClick={() => setViewRecord(null)} className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer text-white flex items-center justify-center">
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
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer animate-none"
                        title="Phóng to"
                      >
                        <Icon name="zoom_in" className="text-[14px]" />
                        Phóng to
                      </button>
                      <button 
                        onClick={() => setZoomScale(prev => Math.max(prev - 0.2, 0.6))}
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer animate-none"
                        title="Thu nhỏ"
                      >
                        <Icon name="zoom_out" className="text-[14px]" />
                        Thu nhỏ
                      </button>
                      <button 
                        onClick={() => setRotateDegree(prev => (prev + 90) % 360)}
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer animate-none"
                        title="Xoay ảnh"
                      >
                        <Icon name="rotate_right" className="text-[14px]" />
                        Xoay 90°
                      </button>
                      <button 
                        onClick={() => { setZoomScale(1); setRotateDegree(0); }}
                        className="p-1 bg-white hover:bg-slate-200 border border-outline-variant rounded text-slate-800 flex items-center gap-1 text-[10px] font-bold cursor-pointer animate-none"
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
                      <span className="w-1.5 h-1.5 rounded-full bg-green-505 inline-block"></span>
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

    {/* Print Preview Modal */}
    {printVisit && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 animate-fade-in print:p-0 print:bg-white print:block print:absolute print:inset-0">
        
        {/* Floating Action Bar (Hidden in Print) */}
        <div className="absolute top-4 right-4 z-[60] flex gap-3 print:hidden">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
          >
            <Icon name="print" />
            Xuất Ra Máy In
          </button>
          <button 
            onClick={() => setPrintVisit(null)}
            className="flex items-center justify-center w-12 h-12 bg-white text-on-surface rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* A4 Paper Container */}
        <div className="bg-white w-full max-w-[800px] h-full max-h-[1000px] sm:h-auto sm:rounded-sm shadow-2xl overflow-y-auto print:shadow-none print:w-full print:max-w-none print:h-auto print:overflow-visible">
          
          <div className="p-8 sm:p-12 print:p-0 text-on-surface">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-xl print:bg-white print:border-2 print:border-black print:text-black">
                  <Icon name="dentistry" className="text-4xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-widest">Nha Khoa GoodSmile</h1>
                  <p className="text-sm font-bold uppercase mt-1">Hệ Thống Chăm Sóc Răng Miệng Tiêu Chuẩn</p>
                  <p className="text-xs mt-1">123 Đường Hàm Nghi, Quận 1, TP.HCM</p>
                  <p className="text-xs">Hotline: 1900 8888</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black uppercase tracking-wider mb-2">Phiếu Khám Bệnh</h2>
                <p className="font-mono text-sm">Số: {printVisit.id}</p>
                <p className="font-mono text-sm">Ngày: {printVisit.date}</p>
              </div>
            </div>

            {/* Patient Info */}
            <h3 className="font-bold uppercase border-b border-dashed border-gray-400 pb-2 mb-4">I. Hành Chính</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm mb-8">
              <p><strong>Họ và tên bệnh nhân:</strong> {currentPatient.name}</p>
              <p><strong>Mã Bệnh Nhân:</strong> {currentPatient.id}</p>
              <p><strong>Thông tin tuổi:</strong> {currentPatient.age} tuổi</p>
              <p><strong>Giới tính:</strong> {currentPatient.gender}</p>
              <p className="col-span-2"><strong>Số điện thoại:</strong> {currentPatient.phone}</p>
            </div>

            {/* Clinical Info */}
            <h3 className="font-bold uppercase border-b border-dashed border-gray-400 pb-2 mb-4">II. Khám Lâm Sàng & Điều Trị</h3>
            <div className="space-y-4 text-sm mb-8">
              <p><strong>1. Lý do đến khám:</strong> {printVisit.reason}</p>
              <p><strong>2. Chẩn đoán:</strong> {printVisit.diagnosis}</p>
              <div>
                <strong>3. Thủ thuật thực hiện:</strong>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  {printVisit.treatments.map((t: string, i: number) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
              {printVisit.notes && (
                <p><strong>4. Lời dặn của bác sĩ:</strong> {printVisit.notes}</p>
              )}
            </div>

            {/* Prescription (if any) */}
            {printVisit.prescription && (
              <>
                <h3 className="font-bold uppercase border-b border-dashed border-gray-400 pb-2 mb-4">III. Đơn Thuốc (Mã: {printVisit.prescription.id})</h3>
                <div className="space-y-4 text-sm mb-8">
                  {printVisit.prescription.medicines.map((m: any, i: number) => (
                    <div key={i} className="pl-4 border-l-2 border-black">
                      <p className="font-bold text-base">{i + 1}. {m.name}</p>
                      <p className="mt-1">Cách dùng: {m.dose} - Số lượng: {m.duration}</p>
                      <p className="italic text-gray-600">Ghi chú: {m.note}</p>
                    </div>
                  ))}
                  <p className="mt-4 border-t border-dotted border-gray-300 pt-4"><strong>Hướng dẫn chung:</strong> {printVisit.prescription.instructions}</p>
                </div>
              </>
            )}

            {/* Signatures */}
            <div className="flex justify-between mt-16 pt-8 text-center">
              <div>
                <p className="font-bold mb-16">Bệnh nhân ký nhận</p>
                <p>(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="italic mb-2">TP.HCM, ngày {printVisit.date.split('/')[0]} tháng {printVisit.date.split('/')[1]} năm {printVisit.date.split('/')[2]}</p>
                <p className="font-bold mb-16">Bác sĩ điều trị</p>
                <p className="font-bold uppercase">{printVisit.doctor}</p>
              </div>
            </div>

            {/* Footer notice */}
            <div className="mt-16 text-center text-[10px] text-gray-500 italic border-t border-gray-200 pt-4">
              Phiếu khám bệnh có giá trị lưu hành nội bộ tại Phòng khám GoodSmile. Vui lòng mang theo phiếu này trong các lần tái khám.
            </div>

          </div>
        </div>
      </div>
    )}

    {/* View EMR Record Modal (A4 Replica) */}
    {viewEMRRecord && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewEMRRecord(null)}>
        <div className="bg-slate-100 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Icon name="folder_shared" className="text-primary text-[22px]" />
              <div>
                <h3 className="font-bold text-sm">Chi tiết Hồ sơ Bệnh án EMR Bệnh nhân</h3>
                <p className="text-[10px] text-slate-400">Mã hồ sơ: #{viewEMRRecord.id} • Ngày lập: {viewEMRRecord.date}</p>
              </div>
            </div>
            <button onClick={() => setViewEMRRecord(null)} className="p-1.5 hover:bg-white/20 rounded-full cursor-pointer flex items-center justify-center border-none bg-transparent text-white">
              <Icon name="close" />
            </button>
          </div>

          {/* Split Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Clinical Details & Teeth map */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                    <Icon name="clinical_notes" className="text-[16px] text-primary" />
                    Thông tin chẩn đoán
                  </h4>
                  <div className="space-y-3 text-left">
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
                              {viewEMRRecord.notes.split('|').map((part: string, pIdx: number) => {
                                const trimmed = part.trim();
                                if (trimmed.startsWith('Dị ứng:')) {
                                  return <p key={pIdx}><strong>Dị ứng:</strong> <span className="text-error font-bold">{trimmed.replace('Dị ứng:', '')}</span></p>;
                                }
                                if (trimmed.startsWith('Bệnh lý nền:')) {
                                  return <p key={pIdx}><strong>Bệnh lý nền:</strong> <span className="text-amber-800 font-bold">{trimmed.replace('Bệnh lý nền:', '')}</span></p>;
                                }
                                if (trimmed.toLowerCase().includes('đơn thuốc:')) {
                                  return (
                                    <div key={pIdx} className="border-t border-amber-200/40 pt-2 mt-2">
                                      <p className="font-bold text-[10px] text-amber-800 uppercase tracking-wider mb-1">Đơn thuốc:</p>
                                      <ul className="list-disc pl-4 space-y-1">
                                        {trimmed.replace(/đơn thuốc:/i, '').split(';').map((drug: string, dIdx: number) => (
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
                        <p className="font-bold text-slate-800">{viewEMRRecord.dentistName || 'Bác sĩ Nguyễn Hương'}</p>
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
                    <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 space-y-4">
                      {/* Upper */}
                      <div className="flex justify-center items-center gap-1 select-none">
                        {/* Q1 */}
                        <div className="flex gap-0.5 justify-end pr-2 border-r border-slate-300">
                          {[18, 17, 16, 15, 14, 13, 12, 11].map(tooth => {
                            const match = viewEMRRecord.teethMap?.find((t: any) => t.toothNumber === tooth);
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
                          {[21, 22, 23, 24, 25, 26, 27, 28].map(tooth => {
                            const match = viewEMRRecord.teethMap?.find((t: any) => t.toothNumber === tooth);
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
                          {[48, 47, 46, 45, 44, 43, 42, 41].map(tooth => {
                            const match = viewEMRRecord.teethMap?.find((t: any) => t.toothNumber === tooth);
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
                          {[31, 32, 33, 34, 35, 36, 37, 38].map(tooth => {
                            const match = viewEMRRecord.teethMap?.find((t: any) => t.toothNumber === tooth);
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

                    {/* Detailed tooth conditions table */}
                    <div className="mt-3 space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                      {viewEMRRecord.teethMap.map((t: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="font-bold text-slate-700">Răng số {t.toothNumber}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CONDITION_LABELS[t.condition]?.color || ''}`}>
                              {CONDITION_LABELS[t.condition]?.label}
                            </span>
                            {t.treatment && (
                              <span className="text-slate-500 font-medium truncate max-w-[120px]">({t.treatment})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Print/Download helper buttons */}
              <div className="pt-2 flex gap-3 w-full">
                <button 
                  onClick={() => alert(`Đang tải file EMR-${viewEMRRecord.id}.pdf về thiết bị...`)}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow cursor-pointer border-none"
                >
                  <Icon name="download" className="text-[18px]" />Tải PDF bệnh án
                </button>
                <button 
                  onClick={() => {
                    setPrintVisit({
                      id: viewEMRRecord.id,
                      date: viewEMRRecord.date,
                      doctor: viewEMRRecord.dentistName || 'Bác sĩ điều trị',
                      room: viewEMRRecord.room || 'Phòng khám',
                      reason: viewEMRRecord.notes?.match(/Bệnh sử:\s*([^-|.]+)/)?.[1]?.trim() || 'Khám răng định kỳ',
                      diagnosis: viewEMRRecord.notes?.match(/Chẩn đoán:\s*([^|.]+)/)?.[1]?.trim() || viewEMRRecord.title || 'Khám lâm sàng',
                      treatments: viewEMRRecord.teethMap && viewEMRRecord.teethMap.length > 0
                        ? viewEMRRecord.teethMap.map((t: any) => `${t.treatment || CONDITION_LABELS[t.condition]?.label || t.condition} Răng ${t.toothNumber}`)
                        : [viewEMRRecord.title],
                      notes: viewEMRRecord.notes && !viewEMRRecord.notes.includes('|') ? viewEMRRecord.notes : undefined,
                      prescription: viewEMRRecord.prescription || parseEMRNotes(viewEMRRecord.notes, viewEMRRecord.id).prescription
                    });
                  }}
                  className="py-2.5 px-4 border border-outline-variant hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer bg-white"
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
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200/50">
                  <p className="text-[9px] font-bold text-primary uppercase border-b border-slate-200 pb-1 text-left">Thông tin hành chính</p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-slate-700">
                    <p className="col-span-2"><strong>Họ và tên bệnh nhân:</strong> {currentPatient.name}</p>
                    <p><strong>Mã bệnh nhân:</strong> {currentPatient.id}</p>
                    <p><strong>Tuổi / Giới tính:</strong> {currentPatient.age} tuổi / {currentPatient.gender}</p>
                    <p><strong>Số điện thoại:</strong> {currentPatient.phone}</p>
                    <p><strong>Bệnh lý toàn thân:</strong> {currentPatient.condition || 'Bình thường'}</p>
                    <p className="col-span-2"><strong>Dị ứng:</strong> <span className={currentPatient.criticalAllergy !== 'Không' ? 'text-error font-bold' : ''}>{currentPatient.criticalAllergy}</span></p>
                  </div>
                </div>

                {/* Treatment details */}
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-primary uppercase border-b border-slate-200 pb-1 text-left">Chẩn đoán và Thủ thuật điều trị</p>
                  <div className="space-y-1.5">
                    <p><strong>Dịch vụ chính thực hiện:</strong> {viewEMRRecord.title}</p>
                    {(viewEMRRecord.type === 'image' || (viewEMRRecord.files && viewEMRRecord.files.some((f: any) => f.type === 'image'))) && (
                      <div className="space-y-2 mt-4 text-left">
                        <p className="text-[9px] font-bold text-primary uppercase border-b border-slate-200 pb-1 text-left">Hình ảnh đính kèm</p>
                        {viewEMRRecord.files && viewEMRRecord.files.filter((f: any) => f.type === 'image').length > 0 && (
                          <div className="grid grid-cols-2 gap-3 pt-1 mb-2">
                            {viewEMRRecord.files.filter((file: any) => file.type === 'image').map((file: any) => (
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
                            src={viewEMRRecord.url || (viewEMRRecord.files && viewEMRRecord.files.find((f: any) => f.type === 'image')?.url) || (viewEMRRecord.id === 'MR-02' ? '/braces_progress.png' : '/xray_panorama.png')} 
                            alt="Clinical Scan" 
                            className="max-h-full max-w-full object-contain" 
                          />
                        </div>
                      </div>
                    )}
                    {viewEMRRecord.teethMap && viewEMRRecord.teethMap.length > 0 && (
                      <div className="pl-3 border-l-2 border-primary/50 text-[11px] text-slate-600 space-y-1 text-left">
                        <p className="font-semibold text-slate-700 text-xs">Chi tiết răng điều trị:</p>
                        {viewEMRRecord.teethMap.map((t: any, idx: number) => (
                          <p key={idx}>• Răng số {t.toothNumber}: {CONDITION_LABELS[t.condition]?.label} {t.treatment ? `— ${t.treatment}` : ''}</p>
                        ))}
                      </div>
                    )}
                    {viewEMRRecord.notes && (
                      <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 text-left">
                        <p className="font-bold text-slate-600 mb-1 text-[10px] uppercase">Ghi chú lâm sàng:</p>
                        <p className="italic">"{viewEMRRecord.notes.includes('|') ? viewEMRRecord.notes.split('|').filter((p: string) => !p.trim().startsWith('Dị ứng:') && !p.trim().startsWith('Bệnh lý nền:') && !p.toLowerCase().includes('đơn thuốc:')).join('. ').trim() : viewEMRRecord.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF prescription if it contains prescription */}
                {viewEMRRecord.notes && viewEMRRecord.notes.toLowerCase().includes('đơn thuốc:') && (
                  <div className="space-y-2 text-left">
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
                        {viewEMRRecord.notes.split('|').filter((part: string) => part.toLowerCase().includes('đơn thuốc:')).map((rxPart: string, rxIdx: number) => {
                          const rawDrugs = rxPart.replace(/đơn thuốc:/i, '').trim().split(';');
                          return rawDrugs.map((drug: string, drugIdx: number) => {
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
                    <p className="text-[8px] text-slate-400 italic">(Đã xác nhận ký số qua Patient App)</p>
                    <div className="h-14 flex items-center justify-center">
                      <span className="text-green-600 text-xs font-bold border border-green-200 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Icon name="check_circle" className="text-[14px]" />
                        ĐÃ XÁC NHẬN EMR
                      </span>
                    </div>
                    <p className="font-bold text-slate-800">{currentPatient.name}</p>
                  </div>
                  <div>
                    <p className="uppercase font-bold text-slate-400">Bác sĩ điều trị ký</p>
                    <p className="text-[8px] text-slate-400 italic">(Ký và đóng dấu số điện tử E-Signature)</p>
                    <div className="h-14 flex flex-col items-center justify-center relative">
                      <span className="font-serif text-primary text-sm font-extrabold italic border-b border-primary/50 leading-none pb-0.5">{viewEMRRecord.dentistName?.split(' ').slice(-2).join(' ') || 'Nguyễn Hương'}</span>
                      <span className="text-[7px] text-green-700 bg-green-50 px-1 border border-green-200 rounded mt-1 font-mono uppercase tracking-widest scale-90">DIGITALLY SIGNED</span>
                    </div>
                    <p className="font-bold text-slate-800">{viewEMRRecord.dentistName || 'Bác sĩ Nguyễn Hương'}</p>
                  </div>
                </div>

                <div className="text-center text-[8px] text-slate-400 italic border-t border-slate-100 pt-3">
                  Chứng thư số phát hành bởi GOOD SMILE CA. Bản sao điện tử hợp lệ được truy xuất trực tiếp từ cổng bệnh án bệnh nhân.
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    )}
    </>
  );
};
