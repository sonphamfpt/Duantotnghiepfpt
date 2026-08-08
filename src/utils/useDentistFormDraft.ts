/**
 * useDentistFormDraft
 *
 * Persist state của form bàn lâm sàng vào sessionStorage theo queueId.
 * Giúp bác sĩ không bị mất dữ liệu khi chuyển sang tab khác (VD: Quản lý thuốc)
 * rồi quay lại bàn lâm sàng.
 *
 * Key format: `dentist_draft_${queueId}`
 * Tự động xóa draft khi ký bệnh án thành công (clearCurrentDraft).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ToothState } from '../types/clinic';

export interface DentistFormDraft {
  queueId: string | null;
  activeTeethState: ToothState[];
  performedServices: string[];
  chiefComplaint: string;
  icdCode: string;
  postTreatmentNotes: string;
  prescriptionDrugs: Array<{
    name: string;
    quantity: number;
    unit: string;
    instruction: string;
  }>;
  treatmentType: 'independent' | 'plan_init' | 'plan_session';
  selectedPlanId: string;
  uploadedFiles: Array<{
    id: string;
    type: 'pdf' | 'image' | 'prescription';
    title: string;
    size: string;
    url?: string;
  }>;
}

const STORAGE_PREFIX = 'dentist_draft_';
const DEBOUNCE_MS = 300;

function getStorageKey(queueId: string | null): string | null {
  if (!queueId) return null;
  return `${STORAGE_PREFIX}${queueId}`;
}

function loadDraft(queueId: string | null): Partial<DentistFormDraft> | null {
  const key = getStorageKey(queueId);
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<DentistFormDraft>;
  } catch {
    return null;
  }
}

function saveDraft(queueId: string | null, draft: Partial<DentistFormDraft>): void {
  const key = getStorageKey(queueId);
  if (!key) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // sessionStorage đầy hoặc private mode — bỏ qua lỗi
  }
}

export function clearDraft(queueId: string | null): void {
  const key = getStorageKey(queueId);
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Hook chính: quản lý toàn bộ state form bàn lâm sàng với auto-persist.
 *
 * @param queueId - ID của phiếu hàng chờ hiện tại
 * @param initialTeethFromEMR - Trạng thái răng từ bệnh án cũ (autofill từ EMR)
 */
export function useDentistFormDraft(
  queueId: string | null,
  initialTeethFromEMR: ToothState[]
) {
  const prevQueueIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // ── Khởi tạo state từ draft (nếu có) ──
  const loadedDraft = loadDraft(queueId);

  const [activeTeethState, setActiveTeethState] = useState<ToothState[]>(
    loadedDraft?.activeTeethState ?? initialTeethFromEMR
  );
  const [performedServices, setPerformedServices] = useState<string[]>(
    loadedDraft?.performedServices ?? []
  );
  const [chiefComplaint, setChiefComplaint] = useState<string>(
    loadedDraft?.chiefComplaint ?? ''
  );
  const [icdCode, setIcdCode] = useState<string>(
    loadedDraft?.icdCode ?? ''
  );
  const [postTreatmentNotes, setPostTreatmentNotes] = useState<string>(
    loadedDraft?.postTreatmentNotes ?? ''
  );
  const [prescriptionDrugs, setPrescriptionDrugs] = useState<DentistFormDraft['prescriptionDrugs']>(
    loadedDraft?.prescriptionDrugs ?? []
  );
  const [treatmentType, setTreatmentType] = useState<'independent' | 'plan_init' | 'plan_session'>(
    loadedDraft?.treatmentType ?? 'independent'
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    loadedDraft?.selectedPlanId ?? ''
  );
  const [uploadedFiles, setUploadedFiles] = useState<DentistFormDraft['uploadedFiles']>(
    loadedDraft?.uploadedFiles ?? []
  );

  // ── Khi queueId đổi (bệnh nhân khác) → restore draft hoặc reset ──
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevQueueIdRef.current = queueId;
      return;
    }
    if (queueId === prevQueueIdRef.current) return;
    prevQueueIdRef.current = queueId;

    const draft = loadDraft(queueId);
    if (draft && Object.keys(draft).length > 0) {
      // Có draft của bệnh nhân này → restore
      if (draft.activeTeethState !== undefined) setActiveTeethState(draft.activeTeethState);
      if (draft.performedServices !== undefined) setPerformedServices(draft.performedServices);
      if (draft.chiefComplaint !== undefined) setChiefComplaint(draft.chiefComplaint);
      if (draft.icdCode !== undefined) setIcdCode(draft.icdCode);
      if (draft.postTreatmentNotes !== undefined) setPostTreatmentNotes(draft.postTreatmentNotes);
      if (draft.prescriptionDrugs !== undefined) setPrescriptionDrugs(draft.prescriptionDrugs);
      if (draft.treatmentType !== undefined) setTreatmentType(draft.treatmentType);
      if (draft.selectedPlanId !== undefined) setSelectedPlanId(draft.selectedPlanId);
      if (draft.uploadedFiles !== undefined) setUploadedFiles(draft.uploadedFiles);
    } else {
      // Bệnh nhân mới không có draft → reset về rỗng
      setActiveTeethState(initialTeethFromEMR);
      setPerformedServices([]);
      setChiefComplaint('');
      setIcdCode('');
      setPostTreatmentNotes('');
      setPrescriptionDrugs([]);
      setTreatmentType('independent');
      setSelectedPlanId('');
      setUploadedFiles([]);
    }
  }, [queueId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save debounced khi state thay đổi ──
  useEffect(() => {
    if (!queueId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const draft: Partial<DentistFormDraft> = {
      queueId,
      activeTeethState,
      performedServices,
      chiefComplaint,
      icdCode,
      postTreatmentNotes,
      prescriptionDrugs,
      treatmentType,
      selectedPlanId,
      // Không lưu blob URL (hết hạn sau khi tab đóng/refresh)
      uploadedFiles: uploadedFiles.filter(f => !f.url?.startsWith('blob:')),
    };

    saveTimerRef.current = setTimeout(() => {
      saveDraft(queueId, draft);
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    queueId,
    activeTeethState,
    performedServices,
    chiefComplaint,
    icdCode,
    postTreatmentNotes,
    prescriptionDrugs,
    treatmentType,
    selectedPlanId,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Xóa draft sau khi ký bệnh án thành công */
  const clearCurrentDraft = useCallback(() => {
    clearDraft(queueId);
  }, [queueId]);

  return {
    // State values
    activeTeethState,
    performedServices,
    chiefComplaint,
    icdCode,
    postTreatmentNotes,
    prescriptionDrugs,
    treatmentType,
    selectedPlanId,
    uploadedFiles,

    // Setters
    setActiveTeethState,
    setPerformedServices,
    setChiefComplaint,
    setIcdCode,
    setPostTreatmentNotes,
    setPrescriptionDrugs,
    setTreatmentType,
    setSelectedPlanId,
    setUploadedFiles,

    // Actions
    clearCurrentDraft,
  };
}
