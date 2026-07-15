export interface Service {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  isActive: boolean;
}

export interface Dentist {
  id: string;
  name: string;
  role: string;
  avatar: string;
  room: string;
  specialty?: string;
  degree?: string;
  education?: string[];
  experience?: number;
  experienceText?: string;
  bio?: string;
  motto?: string;
  cases?: string;
  clinicalStrengths?: string[];
  certifications?: string[];
  workHistory?: string[];
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  criticalAllergy: string;
  condition: string;
  balance: number;
  tier: 'Platinum' | 'Diamond' | 'Gold' | 'Standard';
  points: number;
  isUnlocked?: boolean;
  isLocked?: boolean;
  dateOfBirth?: string;
  address?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  serviceName: string;
  dentistId: string;
  dentistName: string;
  time: string;
  status: 'Confirmed' | 'In-Progress' | 'Completed' | 'Cancelled';
}

export interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  room: string;
  status: 'Waiting' | 'In Chair' | 'Completed';
  checkInTime: string;
  waitTimeMin: number;
  elapsedTimeMin?: number;
  serviceName?: string; // Dịch vụ cần khám (walk-in hoặc từ lịch hẹn)
}

export interface InvoiceItem {
  serviceId: string;
  serviceName: string;
  price: number;
}

export interface InvoicePayment {
  date: string;
  amount: number;
  method: 'Cash' | 'Card' | 'Transfer';
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  services: InvoiceItem[];
  totalPrice: number;
  insuranceDiscount: number; // calculated in currency
  memberDiscount: number;    // calculated in currency
  netPrice: number;
  status: 'Pending' | 'Partially Paid' | 'Paid';
  createdAt: string;
  paymentMethod?: 'Cash' | 'Card' | 'Transfer';
  room?: string;
  dentistName?: string;
  paidAmount?: number;
  remainingAmount?: number;
  payments?: InvoicePayment[];
}

export interface ToothState {
  toothNumber: number;
  condition: 'healthy' | 'decay' | 'missing' | 'crown' | 'bridge' | 'treated';
  treatment?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  title: string;
  date: string;
  size: string;
  type: 'pdf' | 'image' | 'prescription';
  url?: string;
  teethMap?: ToothState[];
  notes?: string;
  dentistName?: string;
  room?: string;
  diagnosis?: string;
  treatments?: string[];
  prescription?: {
    id: string;
    medicines: {
      name: string;
      dose: string;
      duration: string;
      note: string;
    }[];
    instructions: string;
  };
  files?: {
    id: string;
    type: 'pdf' | 'image' | 'prescription';
    title: string;
    size: string;
    url?: string;
  }[];
}

export interface ClinicLog {
  id: string;
  time: string;
  module: 'RECEPTION' | 'DENTIST' | 'CASHIER' | 'SYSTEM' | 'AUTH';
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERR';
  message: string;
}

export interface DoctorShift {
  id: string;
  dentistId: string;
  dentistName: string;
  date: string; // YYYY-MM-DD format
  shiftType: 'Morning' | 'Afternoon' | 'Full';
  room: string; // Clinic room name
}

export interface ShiftConflictItem {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  time: string;
  serviceName: string;
  resolved: boolean;
  resolvedAction?: 'updated' | 'cancelled';
}

export interface ShiftChangeNotification {
  id: string;
  createdAt: string;              // ISO timestamp
  shiftDate: string;              // YYYY-MM-DD
  shiftType: 'Morning' | 'Afternoon' | 'Full';
  originalDentistId: string;
  originalDentistName: string;
  newDentistId: string;
  newDentistName: string;
  affectedItems: ShiftConflictItem[];
}
