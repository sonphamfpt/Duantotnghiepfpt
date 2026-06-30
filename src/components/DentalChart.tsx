import React, { useState, useEffect } from 'react';
import { ToothState } from '../types/clinic';
import { Icon } from './Icon';

export interface ToothSvgProps {
  number: number;
  condition: ToothState['condition'];
  isSelected: boolean;
  width?: string;
  height?: string;
  textSize?: string;
}

export const ToothSvg: React.FC<ToothSvgProps> = ({ 
  number, 
  condition, 
  isSelected, 
  width = "34", 
  height = "50", 
  textSize = "text-[11px]" 
}) => {
  // Xác định hàm trên hay hàm dưới
  const isUpper = (number >= 11 && number <= 28) || (number >= 51 && number <= 65);
  
  // Xác định số lượng chân răng (Răng cửa 1 chân, Răng hàm nhiều chân)
  const numMod = number % 10;
  const isChild = number >= 50;
  const hasDoubleRoot = isChild ? numMod >= 4 : numMod >= 6;

  // Cấu hình màu sắc theo trạng thái
  let fillColor = '#ffffff';
  let strokeColor = '#cbd5e1'; // outline-variant

  if (condition === 'decay') {
    fillColor = '#fee2e2'; 
    strokeColor = '#ef4444';
  } else if (condition === 'crown') {
    fillColor = '#fef3c7';
    strokeColor = '#f59e0b';
  } else if (condition === 'treated') {
    fillColor = '#e0e7ff';
    strokeColor = '#6366f1';
  } else if (condition === 'bridge') {
    fillColor = '#eef2ff';
    strokeColor = '#6366f1';
  } else if (condition === 'missing') {
    fillColor = '#f8fafc';
    strokeColor = '#cbd5e1';
  }

  if (isSelected) {
    strokeColor = '#4f46e5';
    fillColor = '#e0e7ff';
  }

  const opacity = condition === 'missing' ? 0.4 : 1;
  const strokeDash = condition === 'missing' ? "2 2" : "none";

  // Vẽ Path (Đường viền)
  // Box 40x60. Tâm 20,30.
  // Cổ răng (Neck line) tại Y = 28 (hàm trên) và Y = 32 (hàm dưới).
  // Chiều ngang cổ răng từ X = 12 đến X = 28.
  
  const crownPathUpper = "M 12,28 C 9,28 9,48 15,48 C 18,48 19,46 20,46 C 21,46 22,48 25,48 C 31,48 31,28 28,28 Z";
  const crownPathLower = "M 12,32 C 9,32 9,12 15,12 C 18,12 19,14 20,14 C 21,14 22,12 25,12 C 31,12 31,32 28,32 Z";
  const crownPath = isUpper ? crownPathUpper : crownPathLower;

  const rootSingleUpper = "M 12,28 C 12,20 16,6 20,6 C 24,6 28,20 28,28 Z";
  const rootSingleLower = "M 12,32 C 12,40 16,54 20,54 C 24,54 28,40 28,32 Z";
  
  const rootDoubleUpper = "M 12,28 C 13,20 13,8 16,6 C 18,5 19,14 20,18 C 21,14 22,5 24,6 C 27,8 27,20 28,28 Z";
  const rootDoubleLower = "M 12,32 C 13,40 13,52 16,54 C 18,55 19,46 20,42 C 21,46 22,55 24,54 C 27,52 27,40 28,32 Z";
  
  const rootPath = hasDoubleRoot 
    ? (isUpper ? rootDoubleUpper : rootDoubleLower) 
    : (isUpper ? rootSingleUpper : rootSingleLower);

  return (
    <div className="relative group flex flex-col items-center">
      {/* Hiển thị số răng nếu là hàm trên thì nằm trên, hàm dưới thì nằm dưới */}
      {isUpper && <span className={`${textSize} font-bold mb-0.5 ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>{number}</span>}
      
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 40 60" 
        style={{ opacity }} 
        className={`transition-all duration-300 drop-shadow-sm ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}
      >
        {/* Chân răng (Root) */}
        <path 
          d={rootPath} 
          fill={fillColor} 
          stroke={strokeColor} 
          strokeWidth={isSelected ? "2.5" : "1.5"}
          strokeDasharray={strokeDash}
        />
        {/* Thân răng (Crown) */}
        <path 
          d={crownPath} 
          fill={fillColor} 
          stroke={strokeColor} 
          strokeWidth={isSelected ? "2.5" : "1.5"}
          strokeDasharray={strokeDash}
        />
        
        {/* Chi tiết rãnh dọc chân răng (cho răng 1 chân) */}
        {!hasDoubleRoot && (
          <path 
            d={isUpper ? "M 20,22 L 20,10" : "M 20,38 L 20,50"} 
            stroke={strokeColor} 
            strokeWidth="1" 
            opacity="0.4"
            strokeLinecap="round"
            fill="none"
          />
        )}
        
        {/* Chi tiết rãnh mặt nhai trên thân răng */}
        <path 
          d={isUpper ? "M 15,41 Q 20,43 25,41" : "M 15,19 Q 20,17 25,19"} 
          stroke={strokeColor} 
          strokeWidth="1" 
          opacity="0.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Overlay Bệnh lý chi tiết */}
        {condition === 'decay' && (
          <circle cx="20" cy={isUpper ? "40" : "20"} r="4.5" fill="#ef4444" className="animate-pulse" />
        )}
        {condition === 'treated' && (
          <circle cx="20" cy={isUpper ? "40" : "20"} r="4.5" fill="#6366f1" />
        )}
        {condition === 'crown' && (
          <path d={isUpper ? "M 12,35 L 20,30 L 28,35 L 26,45 L 14,45 Z" : "M 12,25 L 20,30 L 28,25 L 26,15 L 14,15 Z"} fill="#fcd34d" opacity="0.8" />
        )}
        {condition === 'missing' && (
          <path d="M 12,15 L 28,45 M 28,15 L 12,45" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        )}
      </svg>

      {!isUpper && <span className={`${textSize} font-bold mt-0.5 ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>{number}</span>}
    </div>
  );
};

interface DentalChartProps {
  teethState: ToothState[];
  selectedTooth: number | null;
  onSelectTooth: (toothNumber: number) => void;
  patientAge?: number;
}

export const DentalChart: React.FC<DentalChartProps> = ({
  teethState,
  selectedTooth,
  onSelectTooth,
  patientAge
}) => {
  const [chartType, setChartType] = useState<'adult' | 'child'>('adult');

  useEffect(() => {
    if (patientAge !== undefined && patientAge < 12) {
      setChartType('child');
    } else {
      setChartType('adult');
    }
  }, [patientAge]);

  // Tooth quadrants according to ISO FDI Notation
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
  const lowerRight = [41, 42, 43, 44, 45, 46, 47, 48];

  // Deciduous tooth quadrants (Răng sữa - FDI notation)
  const childUpperRight = [55, 54, 53, 52, 51];
  const childUpperLeft = [61, 62, 63, 64, 65];
  const childLowerLeft = [71, 72, 73, 74, 75];
  const childLowerRight = [81, 82, 83, 84, 85];

  const getToothStatus = (toothNumber: number): ToothState => {
    return teethState.find(t => t.toothNumber === toothNumber) || { toothNumber, condition: 'healthy' };
  };

  const getToothName = (num: number) => {
    if (num >= 50) {
      if (num === 53 || num === 63 || num === 73 || num === 83) return 'Răng nanh sữa';
      if (num === 51 || num === 52 || num === 61 || num === 62 || num === 71 || num === 72 || num === 81 || num === 82) return 'Răng cửa sữa';
      return 'Răng hàm sữa';
    }
    if (num === 18 || num === 28 || num === 38 || num === 48) return 'Răng khôn';
    if (num === 11 || num === 12 || num === 21 || num === 22 || num === 31 || num === 32 || num === 41 || num === 42) return 'Răng cửa';
    if (num === 13 || num === 23 || num === 33 || num === 43) return 'Răng nanh';
    return 'Răng hàm';
  };

  const CONDITION_TRANSLATIONS: Record<string, string> = {
    healthy: 'Khỏe mạnh',
    decay: 'Sâu răng',
    treated: 'Đã trám',
    crown: 'Bọc sứ',
    bridge: 'Cầu răng',
    missing: 'Mất răng',
  };

  const renderTooth = (num: number) => {
    const tooth = getToothStatus(num);
    const isSelected = selectedTooth === num;

    return (
      <button
        key={num}
        type="button"
        onClick={() => onSelectTooth(num)}
        className="p-1 rounded-xl cursor-pointer outline-none focus:bg-primary/5 transition-colors"
        title={`Răng ${num}: ${getToothName(num)} - ${CONDITION_TRANSLATIONS[tooth.condition] || tooth.condition} ${tooth.treatment ? `(${tooth.treatment})` : ''}`}
      >
        <ToothSvg number={num} condition={tooth.condition} isSelected={isSelected} />
      </button>
    );
  };

  return (
    <div className="w-full bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h4 className="font-headline-sm text-headline-sm flex items-center gap-2">
            Sơ đồ răng giải phẫu (SVG)
            {patientAge !== undefined && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${patientAge < 12 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {patientAge < 12 ? `Trẻ em (${patientAge}T)` : `Người lớn (${patientAge}T)`}
              </span>
            )}
          </h4>
          <p className="text-label-md text-on-surface-variant">Hiển thị giải phẫu răng chuẩn xác với 32 răng vĩnh viễn / 20 răng sữa.</p>
        </div>

        {/* Toggle between Adult and Child chart */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 select-none">
          <button
            type="button"
            onClick={() => setChartType('adult')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartType === 'adult' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Sơ đồ Người lớn
          </button>
          <button
            type="button"
            onClick={() => setChartType('child')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartType === 'child' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Sơ đồ Răng sữa
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] font-bold mb-6 border-b border-dashed border-outline-variant pb-5 uppercase text-on-surface-variant">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white border border-outline-variant"></span> Khỏe</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-error-container border border-error"></span> Sâu răng</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-primary-container border border-primary"></span> Đã trám</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-100 border border-amber-500"></span> Bọc sứ</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-indigo-50 border border-indigo-500"></span> Cầu răng</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-surface-variant border border-outline border-dashed flex items-center justify-center text-outline"><Icon name="close" className="text-[14px]" /></span> Mất răng</span>
      </div>

      <div className="space-y-6 select-none overflow-x-auto custom-scrollbar pb-2">
        {chartType === 'adult' ? (
          <>
            {/* Hàm trên */}
            <div className="space-y-3 min-w-[850px]">
              <span className="text-xs font-bold uppercase tracking-wider text-primary block">Hàm Trên (Maxillary)</span>
              <div className="flex w-full min-w-[850px] items-end justify-between gap-2 bg-surface p-4 rounded-xl border border-outline-variant/30">
                {/* Phân khu 1 - Phía bên phải của bệnh nhân */}
                <div className="flex gap-1 flex-1 justify-end border-r border-outline-variant/50 pr-4">
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center mr-2">Q1</span>
                  {upperRight.map(renderTooth)}
                </div>
                {/* Phân khu 2 - Phía bên trái của bệnh nhân */}
                <div className="flex gap-1 flex-1 justify-start pl-4">
                  {upperLeft.map(renderTooth)}
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center ml-2">Q2</span>
                </div>
              </div>
            </div>

            {/* Hàm dưới */}
            <div className="space-y-3 min-w-[850px] pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary block">Hàm Dưới (Mandibular)</span>
              <div className="flex w-full min-w-[850px] items-start justify-between gap-2 bg-surface p-4 rounded-xl border border-outline-variant/30">
                {/* Phân khu 4 - Phía bên phải của bệnh nhân */}
                <div className="flex gap-1 flex-1 justify-end border-r border-outline-variant/50 pr-4">
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center mr-2">Q4</span>
                  {lowerRight.map(renderTooth)}
                </div>
                {/* Phân khu 3 - Phía bên trái của bệnh nhân */}
                <div className="flex gap-1 flex-1 justify-start pl-4">
                  {lowerLeft.map(renderTooth)}
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center ml-2">Q3</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Hàm trên sữa */}
            <div className="space-y-3 min-w-[500px]">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">Hàm Trên Sữa (Deciduous Maxillary)</span>
              <div className="flex items-end justify-center gap-2 bg-surface p-4 rounded-xl border border-outline-variant/30">
                <div className="flex gap-1 flex-1 justify-end border-r border-outline-variant/50 pr-4">
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center mr-2">Q5</span>
                  {childUpperRight.map(renderTooth)}
                </div>
                <div className="flex gap-1 flex-1 justify-start pl-4">
                  {childUpperLeft.map(renderTooth)}
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center ml-2">Q6</span>
                </div>
              </div>
            </div>

            {/* Hàm dưới sữa */}
            <div className="space-y-3 min-w-[500px] pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">Hàm Dưới Sữa (Deciduous Mandibular)</span>
              <div className="flex items-start justify-center gap-2 bg-surface p-4 rounded-xl border border-outline-variant/30">
                <div className="flex gap-1 flex-1 justify-end border-r border-outline-variant/50 pr-4">
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center mr-2">Q8</span>
                  {childLowerRight.map(renderTooth)}
                </div>
                <div className="flex gap-1 flex-1 justify-start pl-4">
                  {childLowerLeft.map(renderTooth)}
                  <span className="text-[10px] uppercase font-bold text-outline-variant rotate-90 origin-center self-center ml-2">Q7</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedTooth && (
        <div className="mt-4 p-4 bg-primary-container/20 border border-primary/30 rounded-xl text-sm font-medium text-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Icon name="dentistry" className="text-primary text-[20px]" />
            </div>
            <span>
              Đang chọn chẩn đoán: <strong className="text-base text-on-surface">Răng {selectedTooth}</strong> ({getToothName(selectedTooth)})
              <span className="ml-2 px-2 py-0.5 bg-white rounded-md text-xs border border-primary/20">Trạng thái: <strong>{CONDITION_TRANSLATIONS[getToothStatus(selectedTooth).condition] || getToothStatus(selectedTooth).condition}</strong></span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTooth(0)} // clear select
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-container transition-colors border border-outline-variant"
          >
            Hủy chọn
          </button>
        </div>
      )}
    </div>
  );
};
